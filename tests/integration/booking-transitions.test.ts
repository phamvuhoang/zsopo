import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { recordPayment } from "../../packages/api/src/payments";
import { createManualBooking, transitionBooking } from "../../packages/api/src/ops";
import { E1, L1, USERS, clientFor, db, seedRoom, sql } from "./helpers";

afterAll(() => db.end());

const today = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const plus = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

async function roomWithRate(price = 1000000) {
  const room = (await seedRoom()).id;
  await sql(`insert into stay.rate_plans(entity_id, location_id, room_id, kind, price) values ($1, $2, $3, 'base', $4)`, [E1, L1, room, price]);
  return room;
}

/** LT01 walk-in booking for today, deposit paid in cash -> confirmed. */
async function confirmedToday(room?: string) {
  const r = room ?? (await roomWithRate());
  const fd = await clientFor(USERS.frontDesk);
  const b = await createManualBooking(fd, { roomId: r, arrival: today(), departure: plus(today(), 1), adults: 2, childrenAges: [], guest: { name: "Khách Walk-in", phone: "0900000008" }, source: "walk_in", collectedBy: "zsopo", idempotencyKey: randomUUID() });
  if (!b.ok) throw new Error(b.error.message);
  const p = await recordPayment(fd, { orderId: b.data.orderId, provider: "cash", providerRef: `cash-${randomUUID()}`, amount: "300000", receivedAt: new Date().toISOString(), idempotencyKey: randomUUID() });
  if (!p.ok) throw new Error(p.error.message);
  const [row] = await sql<{ version: number }>(`select version from stay.bookings where id = $1`, [b.data.bookingId]);
  return { room: r, bookingId: b.data.bookingId, orderId: b.data.orderId, version: row!.version, fd };
}

describe("LT01 đặt phòng thủ công", () => {
  it("đi qua allocation chung: trùng ngày với đặt phòng khác bị SOLD_OUT", async () => {
    const c = await confirmedToday();
    const again = await createManualBooking(c.fd, { roomId: c.room, arrival: today(), departure: plus(today(), 1), adults: 2, childrenAges: [], guest: { name: "Khách Zalo", phone: "0900000009" }, source: "zalo", collectedBy: "zsopo", idempotencyKey: randomUUID() });
    expect(!again.ok && again.error.code).toBe("SOLD_OUT");
    const [o] = await sql<{ source: string }>(`select source from commerce.orders where id = $1`, [c.orderId]);
    expect(o!.source).toBe("walk_in");
  });

  it("buồng phòng không tạo được đặt phòng", async () => {
    const room = await roomWithRate();
    const hk = await clientFor(USERS.housekeeping);
    const r = await createManualBooking(hk, { roomId: room, arrival: today(), departure: plus(today(), 1), adults: 2, childrenAges: [], guest: { name: "X", phone: "0900000010" }, source: "phone", collectedBy: "zsopo", idempotencyKey: randomUUID() });
    expect(!r.ok && r.error.code).toBe("FORBIDDEN");
  });
});

describe("LT02 nhận phòng", () => {
  it("không nhận phòng bẩn/chưa nghiệm thu; nhận khi sẵn sàng, cấp token dịch vụ, phòng có khách", async () => {
    const c = await confirmedToday();
    await sql(`update stay.rooms set cleanliness = 'awaiting_inspection' where id = $1`, [c.room]);
    const dirty = await transitionBooking(c.fd, { bookingId: c.bookingId, expectedVersion: c.version, action: "check_in", idempotencyKey: randomUUID(), identityVerified: true });
    expect(!dirty.ok && dirty.error.code).toBe("INVALID_TRANSITION");
    await sql(`update stay.rooms set cleanliness = 'ready' where id = $1`, [c.room]);
    const noId = await transitionBooking(c.fd, { bookingId: c.bookingId, expectedVersion: c.version, action: "check_in", idempotencyKey: randomUUID(), identityVerified: false });
    expect(!noId.ok && noId.error.code).toBe("VALIDATION");
    const ok = await transitionBooking(c.fd, { bookingId: c.bookingId, expectedVersion: c.version, action: "check_in", idempotencyKey: randomUUID(), identityVerified: true });
    expect(ok.ok && ok.data.state).toBe("checked_in");
    expect(ok.ok && ok.data.stayToken?.length).toBeGreaterThan(30);
    const [room] = await sql<{ occupancy: string }>(`select occupancy from stay.rooms where id = $1`, [c.room]);
    expect(room!.occupancy).toBe("occupied");
  });
});

describe("LT04 trả phòng", () => {
  async function checkedIn() {
    const c = await confirmedToday();
    const r = await transitionBooking(c.fd, { bookingId: c.bookingId, expectedVersion: c.version, action: "check_in", idempotencyKey: randomUUID(), identityVerified: true });
    if (!r.ok) throw new Error(r.error.message);
    return { ...c, version: r.data.version };
  }

  it("còn nợ thì cần ngoại lệ của quản lý có lý do", async () => {
    const c = await checkedIn(); // total 1.000.000, paid 300.000
    const blocked = await transitionBooking(c.fd, { bookingId: c.bookingId, expectedVersion: c.version, action: "check_out", idempotencyKey: randomUUID() });
    expect(!blocked.ok && blocked.error.code).toBe("PAYMENT_REVIEW");
    const mgr = await clientFor(USERS.manager);
    const ok = await transitionBooking(mgr, { bookingId: c.bookingId, expectedVersion: c.version, action: "check_out", idempotencyKey: randomUUID(), reason: "Khách chuyển khoản sau, đã ký cam kết" });
    expect(ok.ok && ok.data.state).toBe("checked_out");
  });

  it("hai người trả phòng cùng version: chỉ một thành công; phòng bẩn, có việc dọn, token bị thu hồi", async () => {
    const c = await checkedIn();
    await recordPayment(c.fd, { orderId: c.orderId, provider: "cash", providerRef: `cash-${randomUUID()}`, amount: "700000", receivedAt: new Date().toISOString(), idempotencyKey: randomUUID() });
    const [b] = await sql<{ version: number }>(`select version from stay.bookings where id = $1`, [c.bookingId]);
    const mgr = await clientFor(USERS.manager);
    const results = await Promise.all([
      transitionBooking(c.fd, { bookingId: c.bookingId, expectedVersion: b!.version, action: "check_out", idempotencyKey: randomUUID() }),
      transitionBooking(mgr, { bookingId: c.bookingId, expectedVersion: b!.version, action: "check_out", idempotencyKey: randomUUID() }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)!.ok === false && (results.find((r) => !r.ok) as { error: { code: string } }).error.code).toBe("VERSION_CONFLICT");
    const [room] = await sql<{ cleanliness: string; occupancy: string }>(`select cleanliness, occupancy from stay.rooms where id = $1`, [c.room]);
    expect(room).toEqual({ cleanliness: "dirty", occupancy: "vacant" });
    expect(await sql(`select 1 from stay.housekeeping_tasks where booking_id = $1 and kind = 'checkout'`, [c.bookingId])).toHaveLength(1);
    expect(await sql(`select 1 from core.guest_access_tokens where scope = 'stay' and subject_id = $1 and revoked_at is null`, [c.bookingId])).toHaveLength(0);
    expect(await sql(`select 1 from core.outbox where kind = 'checkout.thanks' and aggregate_id = $1 and next_run_at > now() + interval '23 hours'`, [c.bookingId])).toHaveLength(1);
  });
});

describe("LT05 / BM01 bàn giao ca", () => {
  it("tiền chuyển khoản không vào két; công thức dự kiến; chênh lệch giữ nguyên; người nhận khác người giao", async () => {
    const fd = await clientFor(USERS.frontDesk);
    // Other suites (e2e) may leave this user with an open shift; start from a clean drawer.
    await sql(`update stay.shifts set status = 'closed' where opened_by = $1 and status = 'open'`, [USERS.frontDesk.id]);
    const { data: shift, error: openError } = await fd.schema("stay").rpc("open_shift", { p_location: L1, p_cash_open: 1000000 });
    expect(openError).toBeNull();
    const c = await confirmedToday();
    await recordPayment(fd, { orderId: c.orderId, provider: "cash", providerRef: `cash-${randomUUID()}`, amount: "500000", receivedAt: new Date().toISOString(), shiftId: shift as string, idempotencyKey: randomUUID() });
    await recordPayment(fd, { orderId: c.orderId, provider: "bank_transfer", providerRef: `bank-${randomUUID()}`, amount: "200000", receivedAt: new Date().toISOString(), evidenceNote: "Sao kê", shiftId: shift as string, idempotencyKey: randomUUID() });
    await fd.schema("stay").rpc("add_cash_movement", { p_shift: shift, p_kind: "expense", p_amount: 100000, p_note: "Mua nước" });
    await fd.schema("stay").rpc("add_cash_movement", { p_shift: shift, p_kind: "remit", p_amount: 200000, p_note: "Nộp quỹ" });
    const [s0] = await sql<{ version: number }>(`select version from stay.shifts where id = $1`, [shift]);
    const self = await fd.schema("stay").rpc("handover_shift", { p_shift: shift, p_expected_version: s0!.version, p_counted_cash: 1150000, p_receiver: USERS.frontDesk.id, p_notes: "" });
    expect(self.error?.message).toBe("VALIDATION");
    const h = await fd.schema("stay").rpc("handover_shift", { p_shift: shift, p_expected_version: s0!.version, p_counted_cash: 1150000, p_receiver: USERS.manager.id, p_notes: "Thiếu 50.000 do thối nhầm" });
    expect(h.error).toBeNull();
    const [s] = await sql<{ expected_cash: string; variance: string; status: string }>(`select expected_cash, variance, status from stay.shifts where id = $1`, [shift]);
    expect(s).toEqual({ expected_cash: "1200000", variance: "-50000", status: "handover_pending" });
    const mgr = await clientFor(USERS.manager);
    const [s1] = await sql<{ version: number }>(`select version from stay.shifts where id = $1`, [shift]);
    expect((await mgr.schema("stay").rpc("ack_handover", { p_shift: shift, p_expected_version: s1!.version })).error).toBeNull();
    await expect(sql(`update stay.shifts set cash_counted = 1200000 where id = $1`, [shift])).rejects.toThrow(/BM01/);
  });
});

describe("LT03 / BM04 sự cố", () => {
  it("ticket có hạn SLA 15 phút; mức nguy hiểm báo ngay", async () => {
    const fd = await clientFor(USERS.frontDesk);
    const { data: id, error } = await fd.schema("stay").rpc("create_ticket", { p_location: L1, p_room: null, p_booking: null, p_kind: "safety", p_priority: "critical", p_title: "Mùi khét ở hành lang", p_description: "Gần phòng P03" });
    expect(error).toBeNull();
    const [t] = await sql<{ mins: number }>(`select round(extract(epoch from sla_due_at - created_at) / 60)::int mins from stay.tickets where id = $1`, [id]);
    expect(t!.mins).toBe(15);
    expect(await sql(`select 1 from core.outbox where kind = 'ticket.escalated' and aggregate_id = $1`, [id])).toHaveLength(1);
  });
});
