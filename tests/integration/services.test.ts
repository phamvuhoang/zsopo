import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { cancelMyService, requestService, transitionServiceRequest } from "../../packages/api/src/services";
import { createStayHold, quoteStay } from "../../packages/api/src/stay";
import { E1, L1, USERS, anonClient, clientFor, db, seedRoom, sql } from "./helpers";

afterAll(() => db.end());

async function service(opts: { lead?: number; discountBp?: number; price?: number } = {}) {
  const [s] = await sql<{ id: string }>(
    `insert into stay.services(entity_id, location_id, group_key, slug, name, unit, price, lead_time_min, serve_from, serve_to, prebook_discount_bp, revenue_source, active)
     values ($1, $2, 'food', 'dv-' || substr(md5(random()::text), 1, 8), 'Bữa sáng thử', 'phần', $3, $4, '00:00', '23:59', $5, 'own_service', true) returning id`,
    [E1, L1, opts.price ?? 100000, opts.lead ?? 60, opts.discountBp ?? 0],
  );
  return s!.id;
}

/** A checked-in booking with a stay token handed over by the front desk. */
async function inStay() {
  const room = (await seedRoom()).id;
  const [o] = await sql<{ id: string }>(`insert into commerce.orders(entity_id, location_id, kind, status, total) values ($1, $2, 'stay', 'confirmed', 1000000) returning id`, [E1, L1]);
  const [b] = await sql<{ id: string }>(
    `insert into stay.bookings(entity_id, location_id, order_id, room_id, arrival, departure, state, adults)
     values ($1, $2, $3, $4, (now() at time zone 'Asia/Ho_Chi_Minh')::date, (now() at time zone 'Asia/Ho_Chi_Minh')::date + 2, 'checked_in', 2) returning id`,
    [E1, L1, o!.id, room],
  );
  const [t] = await sql<{ token: string }>(`select stay.issue_stay_token($1) as token`, [b!.id]);
  return { bookingId: b!.id, orderId: o!.id, token: t!.token, room };
}

const soon = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

describe("dịch vụ trong kỳ lưu trú qua QR", () => {
  it("biết số phòng nhưng không có token kỳ lưu trú thì không ghi phí được", async () => {
    const svc = await service();
    const r = await requestService(anonClient(), { token: "khong-hop-le-" + randomUUID(), serviceId: svc, qty: 1, scheduledAt: soon(120), idempotencyKey: randomUUID() });
    expect(!r.ok && r.error.code).toBe("FORBIDDEN");
  });

  it("gửi trùng (cùng khóa) chỉ ghi một dòng phí", async () => {
    const s = await inStay();
    const svc = await service();
    const input = { token: s.token, serviceId: svc, qty: 2, scheduledAt: soon(120), idempotencyKey: randomUUID() };
    const [a, b] = await Promise.all([requestService(anonClient(), input), requestService(anonClient(), input)]);
    expect(a.ok && b.ok && a.data.orderItemId === b.data.orderItemId).toBe(true);
    const items = await sql<{ amount: string; revenue_source: string }>(`select amount, revenue_source from commerce.order_items where order_id = $1 and item_type = 'service'`, [s.orderId]);
    expect(items).toEqual([{ amount: "200000", revenue_source: "own_service" }]);
  });

  it("đặt sớm hơn thời gian chuẩn bị bị từ chối", async () => {
    const s = await inStay();
    const svc = await service({ lead: 240 });
    const r = await requestService(anonClient(), { token: s.token, serviceId: svc, qty: 1, scheduledAt: soon(60), idempotencyKey: randomUUID() });
    expect(!r.ok && r.error.code).toBe("VALIDATION");
  });

  it("khách chỉ hủy được trước khi lễ tân nhận; phí đảo bằng dòng điều chỉnh", async () => {
    const s = await inStay();
    const svc = await service();
    const first = await requestService(anonClient(), { token: s.token, serviceId: svc, qty: 1, scheduledAt: soon(120), idempotencyKey: randomUUID() });
    if (!first.ok) throw new Error(first.error.message);
    expect((await cancelMyService(anonClient(), s.token, first.data.requestId)).ok).toBe(true);
    const lines = await sql<{ amount: string }>(`select amount from commerce.order_items where order_id = $1 order by created_at`, [s.orderId]);
    expect(lines.map((l) => l.amount)).toEqual(["100000", "-100000"]);

    const second = await requestService(anonClient(), { token: s.token, serviceId: svc, qty: 1, scheduledAt: soon(120), idempotencyKey: randomUUID() });
    if (!second.ok) throw new Error(second.error.message);
    const staff = await clientFor(USERS.frontDesk);
    expect((await transitionServiceRequest(staff, { requestId: second.data.requestId, to: "accepted", expectedVersion: 1 })).ok).toBe(true);
    const late = await cancelMyService(anonClient(), s.token, second.data.requestId);
    expect(!late.ok && late.error.code).toBe("INVALID_TRANSITION");
  });

  it("lễ tân xử lý requested -> accepted -> in_progress -> completed; dòng phí hoàn tất", async () => {
    const s = await inStay();
    const svc = await service();
    const r = await requestService(anonClient(), { token: s.token, serviceId: svc, qty: 1, scheduledAt: soon(120), idempotencyKey: randomUUID() });
    if (!r.ok) throw new Error(r.error.message);
    const staff = await clientFor(USERS.frontDesk);
    let v = 1;
    for (const to of ["accepted", "in_progress", "completed"] as const) {
      const t = await transitionServiceRequest(staff, { requestId: r.data.requestId, to, expectedVersion: v });
      expect(t.ok).toBe(true);
      v = t.ok ? t.data.version : v;
    }
    const [item] = await sql<{ status: string }>(`select status from commerce.order_items where id = $1`, [r.data.orderItemId]);
    expect(item!.status).toBe("completed");
    const stale = await transitionServiceRequest(staff, { requestId: r.data.requestId, to: "completed", expectedVersion: 1 });
    expect(!stale.ok && stale.error.code).toBe("VERSION_CONFLICT");
  });

  it("trả phòng thu hồi token: không gửi thêm yêu cầu được", async () => {
    const s = await inStay();
    const svc = await service();
    await sql(`select stay.revoke_stay_tokens($1)`, [s.bookingId]);
    const r = await requestService(anonClient(), { token: s.token, serviceId: svc, qty: 1, scheduledAt: soon(120), idempotencyKey: randomUUID() });
    expect(!r.ok && r.error.code).toBe("FORBIDDEN");
  });

  it("lễ tân điểm khác không xử lý được yêu cầu", async () => {
    const s = await inStay();
    const svc = await service();
    const r = await requestService(anonClient(), { token: s.token, serviceId: svc, qty: 1, scheduledAt: soon(120), idempotencyKey: randomUUID() });
    if (!r.ok) throw new Error(r.error.message);
    const other = await clientFor(USERS.frontDesk2);
    const t = await transitionServiceRequest(other, { requestId: r.data.requestId, to: "accepted", expectedVersion: 1 });
    expect(!t.ok && t.error.code).toBe("FORBIDDEN");
  });
});

describe("dịch vụ đặt trước trong báo giá", () => {
  it("giảm giá đặt trước tính riêng; giữ phòng tạo dòng phí và yêu cầu dịch vụ", async () => {
    const room = (await seedRoom()).id;
    await sql(`insert into stay.rate_plans(entity_id, location_id, room_id, kind, price) values ($1, $2, $3, 'base', 1000000)`, [E1, L1, room]);
    const svc = await service({ discountBp: 1000, price: 120000, lead: 60 });
    const client = anonClient();
    const q = await quoteStay(client, { roomId: room, arrival: "2028-05-01", departure: "2028-05-02", adults: 2, childrenAges: [], services: [{ serviceId: svc, qty: 2, scheduledAt: "2028-05-02T00:30:00Z" }] });
    if (!q.ok) throw new Error(q.error.message);
    expect(q.data.total).toBe(String(1000000 + 240000 - 24000));
    const h = await createStayHold(client, { quoteId: q.data.id, guest: { name: "Khách DV", phone: "0900000007" }, policyVersion: q.data.policyVersion, idempotencyKey: randomUUID(), consents: { terms: true, marketing: false } });
    if (!h.ok) throw new Error(h.error.message);
    const reqs = await sql<{ state: string; source: string }>(`select state, source from stay.service_requests where booking_id = $1`, [h.data.bookingId]);
    expect(reqs).toEqual([{ state: "requested", source: "prebook" }]);
  });

  it("dịch vụ đặt trước sớm hơn thời gian chuẩn bị bị từ chối khi báo giá", async () => {
    const room = (await seedRoom()).id;
    await sql(`insert into stay.rate_plans(entity_id, location_id, room_id, kind, price) values ($1, $2, $3, 'base', 1000000)`, [E1, L1, room]);
    const svc = await service({ lead: 60 * 24 * 3650 });
    const q = await quoteStay(anonClient(), { roomId: room, arrival: "2028-05-01", departure: "2028-05-02", adults: 2, childrenAges: [], services: [{ serviceId: svc, qty: 1, scheduledAt: "2028-05-01T10:00:00Z" }] });
    expect(!q.ok && q.error.code).toBe("VALIDATION");
  });
});
