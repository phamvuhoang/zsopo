// Regression tests for the fourth review (each failed before its fix).
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { transitionBooking } from "../../packages/api/src/ops";
import { recordPayment } from "../../packages/api/src/payments";
import { E1, USERS, aal2ClientFor, asAal2, clientFor, db, heldBooking, sql } from "./helpers";

afterAll(() => db.end());

// Shared by the late-payment tests: occupy the room, expire the hold, record cash as front desk (aal1).
const block = (bookingId: string) => sql<{ id: string }>(`insert into stay.room_allocations(entity_id, location_id, room_id, occupied_range, kind, source_id)
  select b.entity_id, b.location_id, b.room_id, stay.stay_range(b.location_id, b.arrival, b.departure), 'maintenance', gen_random_uuid()
  from stay.bookings b where b.id = $1 returning id`, [bookingId]);
const expire = async (h: { bookingId: string; room: string }) => {
  await sql(`update stay.bookings set held_until = now() - interval '1 minute' where id = $1`, [h.bookingId]);
  await sql(`select stay.expire_room_holds($1)`, [h.room]);
};
const cash = async (orderId: string, amount: string) => recordPayment(await clientFor(USERS.frontDesk),
  { orderId, provider: "cash", providerRef: randomUUID(), amount, receivedAt: new Date().toISOString(), idempotencyKey: randomUUID() });

describe("review4 #3 MFA chuyển khoản", () => {
  it("lễ tân chưa MFA không ghi được chuyển khoản; có MFA thì được; tiền mặt không cần MFA", async () => {
    const h = await heldBooking();
    const bank = (c: SupabaseClient) => recordPayment(c, { orderId: h.orderId, provider: "bank_transfer", providerRef: randomUUID(), amount: "100000",
      receivedAt: new Date().toISOString(), evidenceNote: "Sao kê dòng 1", idempotencyKey: randomUUID() });
    const r1 = await bank(await clientFor(USERS.frontDesk));
    expect(!r1.ok && r1.error.code).toBe("FORBIDDEN");
    expect((await bank(aal2ClientFor(USERS.frontDesk))).ok).toBe(true);
    const byCash = await recordPayment(await clientFor(USERS.frontDesk), { orderId: h.orderId, provider: "cash", providerRef: randomUUID(), amount: "50000",
      receivedAt: new Date().toISOString(), idempotencyKey: randomUUID() });
    expect(byCash.ok).toBe(true);
  });
});

describe("review4 #1 #4 tiền tới muộn", () => {
  it("#1 tiền vào đối soát được áp vào đơn khi quản lý xác nhận ngoại lệ", async () => {
    const h = await heldBooking();
    await expire(h);
    const [blk] = await block(h.bookingId);
    const p = await cash(h.orderId, "300000");
    expect(p.ok && p.data.state).toBe("needs_review");
    await sql(`update stay.room_allocations set active = false where id = $1`, [blk!.id]);
    const r = await (await clientFor(USERS.manager)).schema("stay").rpc("confirm_with_exception", { p_booking: h.bookingId, p_reason: "Khách đã chuyển đủ cọc", p_due: 700000 });
    expect(r.error).toBeNull();
    expect((await sql(`select paid_amount::text v from commerce.orders where id = $1`, [h.orderId]))[0]!.v).toBe("300000");
    expect((await sql(`select state from commerce.payments where id = $1`, [p.ok && p.data.paymentId]))[0]!.state).toBe("allocated");
    expect((await sql(`select coalesce(sum(e.amount),0)::text v from commerce.ledger_entries e join commerce.ledger_events v on v.id = e.event_id
      where v.order_id = $1 and e.account = 'customer_credit'`, [h.orderId]))[0]!.v).toBe("0");
    // Review Focus 1: áp lần nữa không cộng thêm
    expect((await sql(`select commerce.apply_review_payments($1)::text v`, [h.orderId]))[0]!.v).toBe("0");
    expect((await sql(`select paid_amount::text v from commerce.orders where id = $1`, [h.orderId]))[0]!.v).toBe("300000");
  });

  it("#1 tiền đối soát cộng vào lần thu sau: đủ cọc thì booking xác nhận", async () => {
    const h = await heldBooking();
    await expire(h);
    const [blk] = await block(h.bookingId);
    expect((await cash(h.orderId, "200000")).ok).toBe(true);
    await sql(`update stay.room_allocations set active = false where id = $1`, [blk!.id]);
    const p2 = await cash(h.orderId, "100000");
    expect(p2.ok && p2.data.bookingState).toBe("confirmed");
    expect((await sql(`select paid_amount::text v, status from commerce.orders where id = $1`, [h.orderId]))[0]).toEqual({ v: "300000", status: "confirmed" });
    expect((await sql(`select count(*)::int n from commerce.payments p join commerce.ledger_events v on v.payment_id = p.id where v.order_id = $1 and p.state = 'needs_review'`, [h.orderId]))[0]!.n).toBe(0);
  });

  it("#1 phần dư sau khi áp một phần được báo là thanh toán thừa", async () => {
    const h = await heldBooking();
    await expire(h);
    const [blk] = await block(h.bookingId);
    expect((await cash(h.orderId, "300000")).ok).toBe(true);
    await sql(`update stay.room_allocations set active = false where id = $1`, [blk!.id]);
    const p2 = await cash(h.orderId, "900000");
    expect(p2.ok && p2.data.bookingState).toBe("confirmed");
    expect((await sql(`select paid_amount::text v, payment_status, status from commerce.orders where id = $1`, [h.orderId]))[0]).toEqual({ v: "1000000", payment_status: "overpaid", status: "confirmed" });
    expect((await sql(`select payload->>'overpaid' v from core.outbox where kind = 'payment.overpaid' and aggregate_id = $1`, [h.orderId])).map((r) => r.v)).toEqual(["200000"]);
    expect((await sql(`select coalesce(-sum(e.amount),0)::text v from commerce.ledger_entries e join commerce.ledger_events v on v.id = e.event_id
      where v.order_id = $1 and e.account = 'customer_credit'`, [h.orderId]))[0]!.v).toBe("200000");
  });

  it("#1 tiền đối soát đã hoàn cho khách thì không áp lại vào đơn", async () => {
    const h = await heldBooking();
    await expire(h);
    const [blk] = await block(h.bookingId);
    const p = await cash(h.orderId, "300000");
    const [r] = await sql<{ id: string }>(`insert into commerce.refund_requests(entity_id, order_id, amount, reason, requested_by) values ($1, $2, 300000, 'Hoàn', $3) returning id`, [E1, h.orderId, USERS.frontDesk.id]);
    await asAal2(USERS.finance.id, `commerce.approve_refund($2, 'HOAN-R4', 'Sao kê hoàn', 'bank')`, [r!.id]);
    await sql(`update stay.room_allocations set active = false where id = $1`, [blk!.id]);
    const c = await (await clientFor(USERS.manager)).schema("stay").rpc("confirm_with_exception", { p_booking: h.bookingId, p_reason: "Giữ chỗ lại", p_due: 1000000 });
    expect(c.error).toBeNull();
    expect((await sql(`select paid_amount::text v from commerce.orders where id = $1`, [h.orderId]))[0]!.v).toBe("0");
    expect((await sql(`select state from commerce.payments where id = $1`, [p.ok && p.data.paymentId]))[0]!.state).toBe("needs_review");
  });

  it("#4 hold hết hạn rồi tiền thiếu cọc: đơn sang needs_review", async () => {
    const h = await heldBooking();
    await expire(h);
    const p = await cash(h.orderId, "100000");
    expect(p.ok && p.data.bookingState).toBe("needs_review");
    expect((await sql(`select status from commerce.orders where id = $1`, [h.orderId]))[0]!.status).toBe("needs_review");
  });
});

describe("review4 #6 dịch vụ đặt trước", () => {
  it("#6 dịch vụ đặt trước quay lại hàng chờ khi tiền tới muộn xác nhận booking", async () => {
    const [tea] = await sql<{ id: string }>(`select id from stay.services where slug = 'tra-thao-moc-tai-phong'`);
    const h = await heldBooking(({ arrival }) => [{ serviceId: tea!.id, qty: 1, scheduledAt: `${arrival}T10:00:00+07:00` }]);
    await expire(h);
    expect((await sql(`select state from stay.service_requests where booking_id = $1`, [h.bookingId]))[0]!.state).toBe("cancelled");
    const [o] = await sql<{ d: string }>(`select deposit_due::text d from commerce.orders where id = $1`, [h.orderId]);
    const p = await cash(h.orderId, o!.d);
    expect(p.ok && p.data.bookingState).toBe("confirmed");
    expect((await sql(`select state from stay.service_requests where booking_id = $1`, [h.bookingId]))[0]!.state).toBe("requested");
  });

  it("#6 dịch vụ đã hủy trước khi hết hạn giữ chỗ không bị mở lại", async () => {
    const svc = await sql<{ id: string; slug: string }>(`select id, slug from stay.services where slug in ('tra-thao-moc-tai-phong','giat-ui')`);
    const id = (slug: string) => svc.find((s) => s.slug === slug)!.id;
    const h = await heldBooking(({ arrival }) => [
      { serviceId: id("tra-thao-moc-tai-phong"), qty: 1, scheduledAt: `${arrival}T10:00:00+07:00` },
      { serviceId: id("giat-ui"), qty: 1, scheduledAt: `${arrival}T10:00:00+07:00` },
    ]);
    // Staff cancels the laundry while the hold is live: its request is cancelled and its order item reversed.
    await sql(`select stay.reverse_service_item(order_item_id) from stay.service_requests where booking_id = $1 and service_id = $2`, [h.bookingId, id("giat-ui")]);
    await sql(`update stay.service_requests set state = 'cancelled' where booking_id = $1 and service_id = $2`, [h.bookingId, id("giat-ui")]);
    await expire(h);
    const [o] = await sql<{ d: string }>(`select deposit_due::text d from commerce.orders where id = $1`, [h.orderId]);
    const p = await cash(h.orderId, o!.d);
    expect(p.ok && p.data.bookingState).toBe("confirmed");
    expect((await sql(`select s.slug, r.state from stay.service_requests r join stay.services s on s.id = r.service_id where r.booking_id = $1 order by s.slug`, [h.bookingId])))
      .toEqual([{ slug: "giat-ui", state: "cancelled" }, { slug: "tra-thao-moc-tai-phong", state: "requested" }]);
  });
});

describe("review4 #7 danh sách đơn cần xử lý tiền", () => {
  const settle = async (user: Parameters<typeof clientFor>[0]) => {
    const { data, error } = await (await clientFor(user)).schema("commerce").rpc("orders_to_settle", {});
    expect(error).toBeNull();
    return data as { id: string; refundable: number }[];
  };

  it("#7 booking đã xác nhận rồi bị hủy hiện trong danh sách cần hoàn, đúng số tiền", async () => {
    const h = await heldBooking();
    await cash(h.orderId, "300000");
    const [b] = await sql<{ version: number }>(`select version from stay.bookings where id = $1`, [h.bookingId]);
    const c = await transitionBooking(await clientFor(USERS.manager), { bookingId: h.bookingId, expectedVersion: b!.version, action: "cancel", reason: "Khách hủy", idempotencyKey: randomUUID() });
    expect(c.ok).toBe(true);
    expect((await settle(USERS.frontDesk)).find((r) => r.id === h.orderId)?.refundable).toBe(300000);
    // Yêu cầu hoàn đang chờ được trừ khỏi số còn hoàn được; hết thì đơn rời danh sách.
    const req = await (await clientFor(USERS.frontDesk)).schema("commerce").rpc("request_refund", { p_order: h.orderId, p_amount: 100000, p_reason: "Hoàn một phần" });
    expect(req.error).toBeNull();
    expect((await settle(USERS.frontDesk)).find((r) => r.id === h.orderId)?.refundable).toBe(200000);
  });

  it("#7 tiền kẹt ở needs_review hiện để xác nhận ngoại lệ; người không có quyền không thấy", async () => {
    const h = await heldBooking();
    await expire(h);
    await block(h.bookingId);
    expect((await cash(h.orderId, "300000")).ok).toBe(true);
    const row = (await settle(USERS.frontDesk)).find((r) => r.id === h.orderId) as { booking_id: string; booking_state: string; status: string; refundable: number } | undefined;
    expect(row).toMatchObject({ booking_id: h.bookingId, booking_state: "needs_review", status: "needs_review", refundable: 300000 });
    expect((await settle(USERS.housekeeping)).find((r) => r.id === h.orderId)).toBeUndefined();
  });
});
