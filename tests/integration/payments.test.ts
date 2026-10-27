import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { getGuestReceipt, recordPayment, reportTransfer } from "../../packages/api/src/payments";
import { createStayHold, quoteStay } from "../../packages/api/src/stay";
import { E1, L1, USERS, anonClient, clientFor, db, seedRoom, sql } from "./helpers";

afterAll(() => db.end());

let offset = 0;
async function newHold(roomId?: string, nights = 2) {
  const room = roomId ?? (await seedRoom()).id;
  if (!roomId) {
    await sql(`insert into stay.rate_plans(entity_id, location_id, room_id, kind, price) values ($1, $2, $3, 'base', 1000000)`, [E1, L1, room]);
  }
  const start = new Date(Date.UTC(2027, 8, 1) + (offset += 4) * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const d = { arrival: iso(start), departure: iso(new Date(start.getTime() + nights * 86_400_000)) };
  const client = anonClient();
  const q = await quoteStay(client, { roomId: room, ...d, adults: 2, childrenAges: [], services: [] });
  if (!q.ok) throw new Error(q.error.message);
  const h = await createStayHold(client, {
    quoteId: q.data.id, guest: { name: "Khách Thử", phone: "0900000002", email: "khach2@example.test" },
    policyVersion: q.data.policyVersion, idempotencyKey: randomUUID(), consents: { terms: true, marketing: false },
  });
  if (!h.ok) throw new Error(h.error.message);
  return { room, dates: d, ...h.data }; // total 2.000.000, deposit 600.000
}

const pay = async (orderId: string, amount: string, ref = randomUUID(), key = randomUUID(), user = USERS.frontDesk) =>
  recordPayment(await clientFor(user), { orderId, provider: "bank_transfer", providerRef: ref, amount, receivedAt: new Date().toISOString(), evidenceNote: "Sao kê VCB dòng 12", idempotencyKey: key });

const counts = async (orderId: string) => {
  const [r] = await sql<{ payments: number; events: number; confirmations: number }>(
    `select (select count(*)::int from commerce.payment_allocations where order_id = $1) payments,
            (select count(*)::int from commerce.ledger_events where order_id = $1 and kind = 'payment.received') events,
            (select count(*)::int from core.outbox o join stay.bookings b on b.id = o.aggregate_id where b.order_id = $1 and o.kind = 'booking.confirmed') confirmations`,
    [orderId],
  );
  return r;
};

describe("ghi nhận thanh toán idempotent", () => {
  it("cùng provider_ref gửi 3 lần chỉ tạo một payment, một bút toán, một xác nhận", async () => {
    const h = await newHold();
    const ref = randomUUID();
    const results = await Promise.all([pay(h.orderId, "600000", ref), pay(h.orderId, "600000", ref), pay(h.orderId, "600000", ref)]);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(await counts(h.orderId)).toEqual({ payments: 1, events: 1, confirmations: 1 });
    const [b] = await sql<{ state: string; kind: string }>(`select b.state, a.kind from stay.bookings b join stay.room_allocations a on a.source_id = b.id and a.active where b.id = $1`, [h.bookingId]);
    expect(b).toEqual({ state: "confirmed", kind: "booking" });
  });

  it("cùng idempotency key nhưng số tiền khác trả xung đột", async () => {
    const h = await newHold();
    const key = randomUUID();
    const ref = randomUUID();
    expect((await pay(h.orderId, "600000", ref, key)).ok).toBe(true);
    const again = await pay(h.orderId, "700000", ref, key);
    expect(!again.ok && again.error.code).toBe("VERSION_CONFLICT");
  });

  it("nút 'Tôi đã chuyển khoản' chỉ tạo yêu cầu kiểm tra, không xác nhận đơn", async () => {
    const h = await newHold();
    const r = await reportTransfer(anonClient(), h.guestToken!);
    expect(r.ok).toBe(true);
    const [o] = await sql<{ status: string; payment_status: string }>(`select status, payment_status from commerce.orders where id = $1`, [h.orderId]);
    expect(o).toEqual({ status: "pending", payment_status: "unpaid" });
  });
});

describe("thiếu, thừa, muộn", () => {
  it("thiếu cọc: ghi nhận số đã thu, booking chờ đối soát, không gửi xác nhận", async () => {
    const h = await newHold();
    const r = await pay(h.orderId, "200000");
    expect(r.ok && r.data.state).toBe("needs_review");
    const [b] = await sql<{ state: string }>(`select state from stay.bookings where id = $1`, [h.bookingId]);
    expect(b!.state).toBe("needs_review");
    expect((await counts(h.orderId)).confirmations).toBe(0);
    const [o] = await sql<{ paid_amount: string; payment_status: string }>(`select paid_amount, payment_status from commerce.orders where id = $1`, [h.orderId]);
    expect(o).toEqual({ paid_amount: "200000", payment_status: "partial" });
  });

  it("thừa tiền: phần dư là nghĩa vụ với khách, có việc xử lý", async () => {
    const h = await newHold();
    const r = await pay(h.orderId, "2500000");
    expect(r.ok && r.data.state).toBe("allocated");
    const lines = await sql<{ account: string; amount: string }>(
      `select e.account, e.amount from commerce.ledger_entries e join commerce.ledger_events v on v.id = e.event_id where v.order_id = $1 order by e.account`, [h.orderId]);
    expect(lines).toEqual([
      { account: "bank", amount: "2500000" },
      { account: "customer_credit", amount: "-500000" },
      { account: "deposit_liability", amount: "-2000000" },
    ]);
    expect(await sql(`select 1 from core.outbox where kind = 'payment.overpaid' and aggregate_id = $1`, [h.orderId])).toHaveLength(1);
  });

  it("tiền tới sau khi hết giữ chỗ, phòng còn trống: đặt lại allocation và xác nhận", async () => {
    const h = await newHold();
    await sql(`update stay.bookings set held_until = now() - interval '1 minute' where id = $1`, [h.bookingId]);
    await sql(`select stay.expire_room_holds($1)`, [h.room]);
    const r = await pay(h.orderId, "600000");
    expect(r.ok && r.data.bookingState).toBe("confirmed");
  });

  it("tiền tới muộn khi phòng đã có khách khác: needs_review, không đẩy khách kia ra", async () => {
    const first = await newHold();
    await sql(`update stay.bookings set held_until = now() - interval '1 minute' where id = $1`, [first.bookingId]);
    // Another guest takes the same dates.
    const client = anonClient();
    const q = await quoteStay(client, { roomId: first.room, ...first.dates, adults: 2, childrenAges: [], services: [] });
    if (!q.ok) throw new Error(q.error.message);
    const second = await createStayHold(client, { quoteId: q.data.id, guest: { name: "Khách Hai", phone: "0900000003" }, policyVersion: q.data.policyVersion, idempotencyKey: randomUUID(), consents: { terms: true, marketing: false } });
    expect(second.ok).toBe(true);
    const r = await pay(first.orderId, "600000");
    expect(r.ok && r.data.state).toBe("needs_review");
    const [b2] = await sql<{ state: string }>(`select state from stay.bookings where id = $1`, [second.ok && second.data.bookingId]);
    expect(b2!.state).toBe("held");
    expect(await sql(`select 1 from core.outbox where kind = 'payment.review' and aggregate_id = $1`, [first.orderId])).toHaveLength(1);
  });
});

describe("quyền và biên nhận riêng tư", () => {
  it("lễ tân điểm khác và khách vãng lai không ghi được tiền", async () => {
    const h = await newHold();
    const other = await pay(h.orderId, "600000", randomUUID(), randomUUID(), USERS.frontDesk2);
    expect(!other.ok && other.error.code).toBe("FORBIDDEN");
    const anon = await recordPayment(anonClient(), { orderId: h.orderId, provider: "cash", providerRef: randomUUID(), amount: "600000", receivedAt: new Date().toISOString(), idempotencyKey: randomUUID() });
    expect(anon.ok).toBe(false);
  });

  it("biên nhận chỉ mở bằng token đúng; đoán mã đơn hoặc token đã thu hồi đều không xem được", async () => {
    const h = await newHold();
    const ok = await getGuestReceipt(anonClient(), h.guestToken!);
    expect(ok.ok && ok.data.orderCode).toBe(h.orderCode);
    expect(JSON.stringify(ok.ok && ok.data)).not.toContain("0900000002");
    const guess = await getGuestReceipt(anonClient(), h.orderCode);
    expect(guess.ok).toBe(false);
    await sql(`update core.guest_access_tokens set revoked_at = now() where subject_id = $1`, [h.orderId]);
    expect((await getGuestReceipt(anonClient(), h.guestToken!)).ok).toBe(false);
  });

  it("sổ cái không sửa được và tiền cọc không thành doanh thu", async () => {
    const h = await newHold();
    await pay(h.orderId, "600000");
    await expect(sql(`update commerce.ledger_entries set amount = 0 where event_id in (select id from commerce.ledger_events where order_id = $1)`, [h.orderId])).rejects.toThrow(/append-only/);
    const revenue = await sql(`select 1 from commerce.ledger_entries e join commerce.ledger_events v on v.id = e.event_id where v.order_id = $1 and e.account like 'revenue_%'`, [h.orderId]);
    expect(revenue).toHaveLength(0);
  });
});
