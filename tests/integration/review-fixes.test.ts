// Regression tests for the final review findings (each failed before its fix).
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { recordPayment } from "../../packages/api/src/payments";
import { createStayHold, quoteStay } from "../../packages/api/src/stay";
import { API_URL, E1, L1, L2, PUBLISHABLE_KEY, USERS, anonClient, clientFor, db, seedRoom, sql } from "./helpers";

afterAll(() => db.end());
const asAal2 = (user: string, call: string, params: unknown[]) =>
  sql(`select set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated', 'aal', 'aal2')::text, true), ${call}`, [user, ...params]);
const iso = (n: number) => new Date(Date.UTC(2031, 0, 1) + n * 86_400_000).toISOString().slice(0, 10);
let day = Math.floor(Math.random() * 3000);

async function heldBooking(services: { serviceId: string; qty: number; scheduledAt: string }[] = []) {
  const room = (await seedRoom()).id;
  await sql(`insert into stay.rate_plans(entity_id, location_id, room_id, kind, price) values ($1, $2, $3, 'base', 1000000)`, [E1, L1, room]);
  const d = { arrival: iso((day += 3)), departure: iso(day + 1) };
  const client = anonClient();
  const q = await quoteStay(client, { roomId: room, ...d, adults: 2, childrenAges: [], services });
  if (!q.ok) throw new Error(q.error.message);
  const h = await createStayHold(client, { quoteId: q.data.id, guest: { name: "Khách Review", phone: "0900000099" }, policyVersion: q.data.policyVersion, idempotencyKey: randomUUID(), consents: { terms: true, marketing: false } });
  if (!h.ok) throw new Error(h.error.message);
  return { room, ...h.data };
}
const pay = async (orderId: string, amount: string, ref = randomUUID(), extra: Record<string, string> = {}) =>
  recordPayment(await clientFor(USERS.frontDesk), { orderId, provider: "cash", providerRef: ref, amount, receivedAt: new Date().toISOString(), idempotencyKey: randomUUID(), ...extra });

describe("review: tiền và hoàn tiền", () => {
  it("#1 không yêu cầu/duyệt hoàn quá số đã thu (kể cả nhiều yêu cầu)", async () => {
    const h = await heldBooking();
    await pay(h.orderId, "300000");
    const fd = await clientFor(USERS.frontDesk);
    expect((await fd.schema("commerce").rpc("request_refund", { p_order: h.orderId, p_amount: 500000, p_reason: "x" })).error?.message).toBe("VALIDATION");
    expect((await fd.schema("commerce").rpc("request_refund", { p_order: h.orderId, p_amount: 200000, p_reason: "x" })).error).toBeNull();
    expect((await fd.schema("commerce").rpc("request_refund", { p_order: h.orderId, p_amount: 200000, p_reason: "x" })).error?.message).toBe("VALIDATION");
  });

  it("#2 nghĩa vụ cọc trên dashboard giảm sau khi hoàn", async () => {
    const [loc] = await sql<{ id: string }>(`insert into core.locations(entity_id, slug, name, status) values ($1, 'rv-' || substr(md5(random()::text),1,8), 'Điểm review', 'test') returning id`, [E1]);
    const [o] = await sql<{ id: string }>(`insert into commerce.orders(entity_id, location_id, kind, status, total, deposit_due) values ($1, $2, 'manual', 'confirmed', 600000, 0) returning id`, [E1, loc!.id]);
    await recordPayment(await clientFor(USERS.finance), { orderId: o!.id, provider: "bank_transfer", providerRef: randomUUID(), amount: "600000", receivedAt: new Date().toISOString(), evidenceNote: "Sao kê", idempotencyKey: randomUUID() });
    const [r] = await sql<{ id: string }>(`insert into commerce.refund_requests(entity_id, order_id, amount, reason, requested_by) values ($1, $2, 600000, 'Hủy', $3) returning id`, [E1, o!.id, USERS.frontDesk.id]);
    await asAal2(USERS.finance.id, `commerce.approve_refund($2, 'HOAN-1', 'Sao kê hoàn', 'bank')`, [r!.id]);
    const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    const { data } = await (await clientFor(USERS.finance)).schema("commerce").rpc("get_location_metrics", { p_entity: E1, p_location: loc!.id, p_from: today, p_to: today });
    expect((data as { depositsLiability: string }).depositsLiability).toBe("0");
  });

  it("#10 mã giao dịch đã dùng cho đơn khác bị từ chối, không báo đã thu nhầm", async () => {
    const a = await heldBooking();
    const b = await heldBooking();
    const ref = randomUUID();
    expect((await pay(a.orderId, "300000", ref)).ok).toBe(true);
    const r = await pay(b.orderId, "300000", ref);
    expect(!r.ok && r.error.code).toBe("VERSION_CONFLICT");
  });

  it("#11 tiền mặt không ghi được vào ca của người khác hoặc ca đã đóng", async () => {
    const mgr = await clientFor(USERS.manager);
    await sql(`update stay.shifts set status = 'closed' where opened_by = $1 and status = 'open'`, [USERS.manager.id]);
    const { data: shift } = await mgr.schema("stay").rpc("open_shift", { p_location: L1, p_cash_open: 0 });
    const h = await heldBooking();
    const r = await pay(h.orderId, "300000", randomUUID(), { shiftId: shift as string });
    expect(!r.ok && r.error.code).toBe("VALIDATION");
  });

  it("#12 khách vãng lai không tự khai nguồn đặt phòng", async () => {
    const room = (await seedRoom()).id;
    await sql(`insert into stay.rate_plans(entity_id, location_id, room_id, kind, price) values ($1, $2, $3, 'base', 1000000)`, [E1, L1, room]);
    const client = anonClient();
    const q = await quoteStay(client, { roomId: room, arrival: iso((day += 3)), departure: iso(day + 1), adults: 1, childrenAges: [], services: [] });
    if (!q.ok) throw new Error(q.error.message);
    const { data } = await client.schema("stay").rpc("create_stay_hold", { p_quote: q.data.id, p_guest: { name: "Khách", phone: "0900000098" }, p_policy_version: q.data.policyVersion, p_idempotency: randomUUID(), p_consents: { terms: true }, p_source: "ota" });
    const [b] = await sql<{ source: string }>(`select source from stay.bookings where id = $1`, [(data as { bookingId: string }).bookingId]);
    expect(b!.source).toBe("web");
  });
});

describe("review: dịch vụ, sự cố, buồng phòng", () => {
  it("#4 hủy dịch vụ đặt trước hoàn đúng phần đã giảm", async () => {
    const [s] = await sql<{ id: string }>(`insert into stay.services(entity_id, location_id, group_key, slug, name, unit, price, lead_time_min, prebook_discount_bp, revenue_source) values ($1, $2, 'food', 'rv-' || substr(md5(random()::text),1,8), 'Dịch vụ review', 'phần', 100000, 0, 1000, 'own_service') returning id`, [E1, L1]);
    const h = await heldBooking([{ serviceId: s!.id, qty: 2, scheduledAt: `${iso(day + 30)}T01:00:00Z` }]);
    const [before] = await sql<{ total: string }>(`select total from commerce.orders where id = $1`, [h.orderId]);
    await sql(`update stay.bookings set state = 'confirmed' where id = $1`, [h.bookingId]);
    const [req] = await sql<{ id: string; version: number }>(`select id, version from stay.service_requests where booking_id = $1`, [h.bookingId]);
    expect((await (await clientFor(USERS.frontDesk)).schema("stay").rpc("transition_service_request", { p_request: req!.id, p_to: "cancelled", p_expected_version: req!.version, p_note: "Khách đổi ý" })).error).toBeNull();
    const [after] = await sql<{ total: string }>(`select total from commerce.orders where id = $1`, [h.orderId]);
    expect(Number(before!.total) - Number(after!.total)).toBe(180000);
  });

  it("#5 không tạo sự cố gắn phòng của điểm khác", async () => {
    const other = (await seedRoom({ location: L2 })).id;
    const hk = await clientFor(USERS.housekeeping);
    const r = await hk.schema("stay").rpc("create_ticket", { p_location: L1, p_room: other, p_booking: null, p_kind: "safety", p_priority: "critical", p_title: "x", p_description: "" });
    expect(r.error?.message).toBe("VALIDATION");
    expect((await sql<{ safety_block: boolean }>(`select safety_block from stay.rooms where id = $1`, [other]))[0]!.safety_block).toBe(false);
  });

  it("#8 phiên bản mẫu checklist mới của một loại không làm hỏng loại khác", async () => {
    await sql(`update stay.checklist_templates set active = false where kind = 'room_checkout' and active`);
    await sql(`insert into stay.checklist_templates(entity_id, kind, version, title, items) values ($1, 'room_checkout', (select max(version) + 1 from stay.checklist_templates where kind = 'room_checkout'), 'v mới', '[{"code":"N1","group":"1","label":"x"}]')`, [E1]);
    try {
      const room = (await seedRoom()).id;
      const [t] = await sql<{ id: string }>(`insert into stay.housekeeping_tasks(entity_id, location_id, room_id, kind) values ($1, $2, $3, 'stayover') returning id`, [E1, L1, room]);
      const r = await (await clientFor(USERS.housekeeping)).schema("stay").rpc("apply_checklist_op", { p_op: { operationId: randomUUID(), taskId: t!.id, baseVersion: 1, itemCode: "S1", result: "pass", mediaIds: [] } });
      expect(r.data?.state).toBe("applied");
    } finally {
      await sql(`delete from stay.checklist_templates where kind = 'room_checkout' and active`);
      await sql(`update stay.checklist_templates set active = true where kind = 'room_checkout' and version = 1`);
    }
  });

  it("#13 không sửa trực tiếp bảng phòng/sản phẩm/trang để né RPC có audit", async () => {
    const mgr = await clientFor(USERS.manager);
    const room = (await seedRoom()).id;
    const r = await mgr.schema("stay").from("rooms").update({ safety_block: true }).eq("id", room).select("id");
    expect(r.error?.code ?? (r.data?.length === 0 ? "no-op" : "updated")).not.toBe("updated");
    const ed = await clientFor(USERS.editor);
    const p = await ed.schema("content").from("pages").update({ status: "draft" }).eq("slug", "bao-mat").select("id");
    expect(p.error?.code ?? (p.data?.length === 0 ? "no-op" : "updated")).not.toBe("updated");
  });
});

describe("review: CRM, rate limit, Edge", () => {
  it("#3 chốt chiến dịch và xuất không bị cắt ở 200 khách", async () => {
    const src = `bulk-${randomUUID().slice(0, 6)}`;
    await sql(`select core.upsert_guest_customer($1, jsonb_build_object('name', 'Khách ' || g, 'phone', '09' || lpad(g::text, 8, '0'), 'email', 'bulk' || g || '-' || $2 || '@example.test'), $2, '{"terms":true,"marketing":true}') from generate_series(1, 205) g`, [E1, src]);
    const [seg] = await sql<{ id: string }>(`insert into crm.segments(entity_id, name, filter_json) values ($1, 'bulk', $2) returning id`, [E1, JSON.stringify({ source: src })]);
    const [camp] = await sql<{ id: string }>(`insert into crm.campaigns(entity_id, name, subject, body, segment_id) values ($1, 'bulk', 's', 'b', $2) returning id`, [E1, seg!.id]);
    expect((await (await clientFor(USERS.finance)).schema("crm").rpc("snapshot_campaign", { p_campaign: camp!.id })).data).toBe(205);
  });

  it("#6 giả mạo X-Forwarded-For không né được giới hạn tần suất", async () => {
    await sql(`update ops_config.runtime_settings set value = '1' where key = 'rate_limit.scale'`);
    try {
      let limited = false;
      for (let i = 0; i < 12 && !limited; i++) {
        // A committing call (failed calls roll back their counter; token endpoints rely on 256-bit entropy instead).
        const res = await fetch(`${API_URL}/rest/v1/rpc/subscribe_newsletter`, {
          method: "POST",
          headers: { apikey: PUBLISHABLE_KEY, "Content-Profile": "content", "Content-Type": "application/json", "X-Forwarded-For": `203.0.113.${i}` },
          body: JSON.stringify({ p_email: `rl-${i}-${randomUUID().slice(0, 6)}@example.test`, p_consent: true }),
        });
        limited = res.status === 429;
      }
      expect(limited).toBe(true);
    } finally {
      await sql(`update ops_config.runtime_settings set value = '100' where key = 'rate_limit.scale'`);
      await sql(`delete from core.rate_limits`);
    }
  });

  it("#7 người dùng đã đăng nhập không kích được worker nền", async () => {
    const token = (await (await clientFor(USERS.frontDesk)).auth.getSession()).data.session!.access_token;
    for (const fn of ["notify", "ical-sync", "maintenance"]) {
      const res = await fetch(`${API_URL}/functions/v1/${fn}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" }, body: "{}" });
      expect(res.status, fn).toBe(403);
    }
  });
});
