// Regression tests for the fourth review (each failed before its fix).
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { transitionBooking } from "../../packages/api/src/ops";
import { recordPayment } from "../../packages/api/src/payments";
import { transitionFulfillment } from "../../packages/api/src/shop";
import { E1, E2, USERS, aal2ClientFor, anonClient, asAal2, clientFor, db, heldBooking, move, onHand, placeShop, seedSku, sql } from "./helpers";

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

  it("#7 tiền kẹt ở needs_review hiện để xác nhận ngoại lệ; không thấy nếu thiếu quyền, khác cơ sở hoặc khác thực thể", async () => {
    const h = await heldBooking();
    await expire(h);
    await block(h.bookingId);
    expect((await cash(h.orderId, "300000")).ok).toBe(true);
    const row = (await settle(USERS.frontDesk)).find((r) => r.id === h.orderId) as { booking_id: string; booking_state: string; status: string; refundable: number } | undefined;
    expect(row).toMatchObject({ booking_id: h.bookingId, booking_state: "needs_review", status: "needs_review", refundable: 300000 });
    expect((await settle(USERS.housekeeping)).find((r) => r.id === h.orderId)).toBeUndefined();
    // Cùng thực thể nhưng khác cơ sở, và thực thể khác: không thấy đơn (contact_snapshot là PII).
    expect((await settle(USERS.frontDesk2)).find((r) => r.id === h.orderId)).toBeUndefined();
    expect((await settle(USERS.frontDeskB)).find((r) => r.id === h.orderId)).toBeUndefined();
  });
});

const scratchPage = async (status: "published" | "draft") => (await sql<{ id: string; version: number }>(
  `insert into content.pages(entity_id, slug, kind, title, excerpt, body_md, status, published_at)
   values ($1, 'thu-' || substr(md5(random()::text),1,8), 'policy', 'Trang thử', 'x', 'Bản gốc', $2, case when $2 = 'published' then now() end)
   returning id, version`, [E1, status]))[0]!;
const savePage = async (id: string, version: number, body: string, publish: boolean) =>
  (await clientFor(USERS.editor)).schema("content").rpc("save_page", { p_page: id, p_title: "Trang thử", p_excerpt: "x", p_body: body, p_expected_version: version, p_publish: publish });

describe("review4 #2 lưu nháp trang", () => {
  it("bỏ chọn Đăng khi sửa trang đang công khai: trang vẫn công khai, bản sửa nằm ở bản nháp", async () => {
    const pg = await scratchPage("published");
    expect((await savePage(pg.id, pg.version, "Bản nháp mới", false)).error).toBeNull();
    expect((await sql(`select status, body_md from content.pages where id = $1`, [pg.id]))[0]).toMatchObject({ status: "published", body_md: "Bản gốc" });
    expect((await sql(`select body_md from content.page_drafts where page_id = $1`, [pg.id]))[0]!.body_md).toBe("Bản nháp mới");
    expect((await savePage(pg.id, pg.version, "Bản nháp mới", true)).error).toBeNull();
    expect((await sql(`select body_md from content.pages where id = $1`, [pg.id]))[0]!.body_md).toBe("Bản nháp mới");
    expect(await sql(`select 1 from content.page_drafts where page_id = $1`, [pg.id])).toHaveLength(0);
  });

  it("trang chưa đăng vẫn sửa tại chỗ, không tạo bản nháp", async () => {
    const pg = await scratchPage("draft");
    expect((await savePage(pg.id, pg.version, "Sửa nháp", false)).error).toBeNull();
    expect((await sql(`select body_md from content.pages where id = $1`, [pg.id]))[0]!.body_md).toBe("Sửa nháp");
    expect(await sql(`select 1 from content.page_drafts where page_id = $1`, [pg.id])).toHaveLength(0);
  });

  it("bản nháp chỉ biên tập xem được, không ai ghi trực tiếp", async () => {
    const pg = await scratchPage("published");
    expect((await savePage(pg.id, pg.version, "Chỉ biên tập thấy", false)).error).toBeNull();
    const editor = (await clientFor(USERS.editor)).schema("content");
    expect((await editor.from("page_drafts").select("body_md").eq("page_id", pg.id)).data).toEqual([{ body_md: "Chỉ biên tập thấy" }]);
    expect((await anonClient().schema("content").from("page_drafts").select("body_md").eq("page_id", pg.id)).data ?? []).toHaveLength(0);
    expect((await editor.from("page_drafts").update({ body_md: "x" }).eq("page_id", pg.id)).error).not.toBeNull();
  });
});

describe("review4 #5 đơn chuyển khoản chưa trả", () => {
  it("được xác nhận khi chưa trả vẫn hết hạn và nhả hàng", async () => {
    const { variantId } = await seedSku({ onHand: 2 });
    const r = await placeShop(variantId, "bank");
    if (!r.ok) throw new Error(r.error.message);
    await move(r.data.orderId, "confirmed");
    expect((await sql(`select status from commerce.orders where id = $1`, [r.data.orderId]))[0]!.status).toBe("pending");
    await sql(`update commerce.orders set due_at = now() - interval '1 minute' where id = $1`, [r.data.orderId]);
    await sql(`select shop.expire_unpaid_orders()`);
    expect((await sql(`select status from commerce.orders where id = $1`, [r.data.orderId]))[0]!.status).toBe("expired");
    expect((await onHand(variantId)).reserved).toBe(0);
  });

  it("không cho chuyển sang sẵn sàng giao khi chưa nhận đủ tiền", async () => {
    const { variantId } = await seedSku({ onHand: 2 });
    const r = await placeShop(variantId, "bank");
    if (!r.ok) throw new Error(r.error.message);
    for (const to of ["confirmed", "packing"]) await move(r.data.orderId, to);
    const [o] = await sql<{ version: number }>(`select version from commerce.orders where id = $1`, [r.data.orderId]);
    const res = await transitionFulfillment(await clientFor(USERS.finance), { orderId: r.data.orderId, to: "ready_to_ship", expectedVersion: o!.version });
    expect(!res.ok && res.error.code).toBe("INVALID_TRANSITION");
  });
});

describe("review4 #10 trả hàng đảo doanh thu", () => {
  it("trả hàng sau khi hoàn tất: doanh thu sản phẩm thuần bằng 0, đơn hiện để hoàn", async () => {
    const { variantId } = await seedSku({ price: 200000n, onHand: 2 });
    const r = await placeShop(variantId, "cod");
    if (!r.ok) throw new Error(r.error.message);
    for (const to of ["confirmed", "packing", "ready_to_ship", "shipped"]) await move(r.data.orderId, to);
    const [o] = await sql<{ total: string }>(`select total::text from commerce.orders where id = $1`, [r.data.orderId]);
    const fin = await clientFor(USERS.finance);
    expect((await recordPayment(fin, { orderId: r.data.orderId, provider: "cod", providerRef: randomUUID(), amount: o!.total, receivedAt: new Date().toISOString(), idempotencyKey: randomUUID() })).ok).toBe(true);
    await move(r.data.orderId, "completed");
    const [orig] = await sql<{ id: string; completed_at: string }>(`select id, completed_at::text from commerce.order_items where order_id = $1 and item_type = 'product'`, [r.data.orderId]);
    await move(r.data.orderId, "returned");
    expect((await sql(`select coalesce(sum(amount),0)::text v from commerce.order_items where order_id = $1 and revenue_source = 'product' and status = 'completed'`, [r.data.orderId]))[0]!.v).toBe("0");
    // dòng gốc giữ nguyên (kỳ cũ không đổi); dòng đảo liên kết về nó
    expect((await sql(`select status, completed_at::text from commerce.order_items where id = $1`, [orig!.id]))[0]).toEqual({ status: "completed", completed_at: orig!.completed_at });
    expect((await sql(`select title, qty, amount::text from commerce.order_items where reversal_of = $1`, [orig!.id]))[0]).toMatchObject({ qty: -1, amount: "-200000" });
    // tổng đơn giảm đúng tiền hàng, giữ phí ship; phiếu khách vẫn cộng khớp
    const [after] = await sql<{ total: string; subtotal: string; shipping_fee: string; payment_status: string }>(`select total::text, subtotal::text, shipping_fee::text, payment_status from commerce.orders where id = $1`, [r.data.orderId]);
    expect(after).toMatchObject({ total: after!.shipping_fee, subtotal: "0", payment_status: "overpaid" });
    expect((await sql(`select sum(amount)::text v from commerce.order_items where order_id = $1 and status <> 'cancelled'`, [r.data.orderId]))[0]!.v).toBe(after!.total);
    const rows = (await fin.schema("commerce").rpc("orders_to_settle", {})).data as { id: string; refundable: number }[];
    expect(rows.find((x) => x.id === r.data.orderId)?.refundable).toBeGreaterThan(0);
  });

  it("trả hàng khi chưa hoàn tất: dòng gốc hủy, không còn doanh thu, tổng chỉ còn phí ship", async () => {
    const { variantId } = await seedSku({ price: 200000n, onHand: 2 });
    const r = await placeShop(variantId, "cod");
    if (!r.ok) throw new Error(r.error.message);
    for (const to of ["confirmed", "packing", "ready_to_ship", "shipped", "returned"]) await move(r.data.orderId, to);
    const items = await sql<{ item_type: string; status: string; revenue_source: string | null; amount: string }>(
      `select item_type, status, revenue_source, amount::text from commerce.order_items where order_id = $1 and item_type in ('product','adjustment') order by amount desc`, [r.data.orderId]);
    expect(items).toEqual([{ item_type: "product", status: "cancelled", revenue_source: "product", amount: "200000" }, { item_type: "adjustment", status: "active", revenue_source: null, amount: "-200000" }]);
    const [after] = await sql<{ total: string; shipping_fee: string; payment_status: string }>(`select total::text, shipping_fee::text, payment_status from commerce.orders where id = $1`, [r.data.orderId]);
    expect(after).toMatchObject({ total: after!.shipping_fee, payment_status: "unpaid" });
    // mọi dòng (kể cả đã hủy) cộng khớp tổng: dòng gốc + dòng đảo triệt tiêu, còn lại phí ship
    expect((await sql(`select sum(amount)::text v from commerce.order_items where order_id = $1`, [r.data.orderId]))[0]!.v).toBe(after!.total);
    expect((await sql(`select coalesce(sum(amount),0)::text v from commerce.order_items where order_id = $1 and revenue_source = 'product' and status = 'completed'`, [r.data.orderId]))[0]!.v).toBe("0");
  });
});

describe("review4 #11 doanh thu dịch vụ trừ giảm giá đặt trước", () => {
  it("#11 doanh thu dịch vụ ghi nhận đã trừ giảm giá đặt trước", async () => {
    const [loc] = await sql<{ id: string }>(`insert into core.locations(entity_id, slug, name, status) values ($1, 'rv4-' || substr(md5(random()::text),1,8), 'Điểm review 4', 'test') returning id`, [E1]);
    const [o] = await sql<{ id: string }>(`insert into commerce.orders(entity_id, location_id, kind, status, subtotal, discount, total, deposit_due) values ($1, $2, 'manual', 'confirmed', 200000, 20000, 180000, 0) returning id`, [E1, loc!.id]);
    await sql(`insert into commerce.order_items(entity_id, order_id, item_type, title, qty, unit_price, amount, revenue_source, status, completed_at, snapshot) values
      ($1, $2, 'service', 'Bữa sáng', 1, 200000, 200000, 'own_service', 'completed', now(), '{"discount":"20000"}'),
      ($1, $2, 'adjustment', 'Ưu đãi đặt trước dịch vụ', 1, -20000, -20000, null, 'active', null, '{}')`, [E1, o!.id]);
    const d = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    const { data } = await (await clientFor(USERS.finance)).schema("commerce").rpc("get_location_metrics", { p_entity: E1, p_location: loc!.id, p_from: d, p_to: d });
    expect((data as { recognizedRevenueBySource: Record<string, string> }).recognizedRevenueBySource.own_service).toBe("180000");
  });
});

describe("review4 #12 export đủ dòng", () => {
  it("#12 export sổ cái trả đủ hơn 1000 dòng và ghi audit", async () => {
    await sql(`select commerce.post_ledger($1, null, 'test.bulk', 'bulk:' || g || ':' || $2, null, null,
      jsonb_build_array(jsonb_build_object('account','cash','amount',1), jsonb_build_object('account','customer_credit','amount',-1)))
      from generate_series(1, 1001) g`, [E2, randomUUID()]);
    const { data, error } = await aal2ClientFor(USERS.superAdmin).schema("commerce").rpc("export_ledger", { p_entity: E2 });
    expect(error).toBeNull();
    expect((data as unknown[]).length).toBeGreaterThanOrEqual(2002);
    expect((await sql(`select count(*)::int n from core.audit_logs where action = 'ledger.export' and entity_id = $1`, [E2]))[0]!.n).toBeGreaterThan(0);
  });

  it("#12 export khách hàng trả mảng jsonb và ghi audit", async () => {
    const src = `rv4-${randomUUID().slice(0, 8)}`;
    await sql(`select core.upsert_guest_customer($1, $2::jsonb, $3, $4::jsonb)`, [E1, JSON.stringify({ name: "Khách xuất", phone: "0933333331", email: `x-${src}@example.test` }), src, JSON.stringify({ terms: true, marketing: true })]);
    const { data, error } = await aal2ClientFor(USERS.finance).schema("crm").rpc("export_segment", { p_entity: E1, p_filter: { source: src } });
    expect(error).toBeNull();
    expect(data).toEqual([{ displayName: "Khách xuất", email: `x-${src}@example.test`, phone: "0933333331", source: src, marketing: true }]);
    expect((await sql(`select count(*)::int n from core.audit_logs where action = 'crm.export' and entity_id = $1`, [E1]))[0]!.n).toBeGreaterThan(0);
  });
});
