// Regression tests for the second review (commit 1a09b4c); each failed before its fix.
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createManualBooking, transitionBooking } from "../../packages/api/src/ops";
import { recordPayment } from "../../packages/api/src/payments";
import { createShopOrder, transitionFulfillment } from "../../packages/api/src/shop";
import { E1, L1, USERS, anonClient, clientFor, db, seedRoom, seedSku, sql } from "./helpers";

afterAll(() => db.end());
const today = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const plus = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

describe("review2: allocation", () => {
  it("P1 tiền tới sau khi phòng đã có người khác: khoản thứ hai không xác nhận, không nhận phòng được", async () => {
    const room = (await seedRoom()).id;
    await sql(`insert into stay.rate_plans(entity_id, location_id, room_id, kind, price) values ($1, $2, $3, 'base', 1000000)`, [E1, L1, room]);
    const fd = await clientFor(USERS.frontDesk);
    const b = await createManualBooking(fd, { roomId: room, arrival: today(), departure: plus(today(), 1), adults: 2, childrenAges: [], guest: { name: "Khách Hết Hạn", phone: "0900000201" }, source: "phone", collectedBy: "zsopo", idempotencyKey: randomUUID() });
    if (!b.ok) throw new Error(b.error.message);
    await sql(`update stay.bookings set held_until = now() - interval '1 minute' where id = $1`, [b.data.bookingId]);
    await sql(`select stay.expire_room_holds($1)`, [room]);
    await sql(`insert into stay.room_allocations(entity_id, location_id, room_id, occupied_range, kind, source_id)
      values ($1, $2, $3, stay.stay_range($2, $4::date, $5::date), 'maintenance', gen_random_uuid())`, [E1, L1, room, today(), plus(today(), 1)]);
    const pay = () => recordPayment(fd, { orderId: b.data.orderId, provider: "cash", providerRef: randomUUID(), amount: "300000", receivedAt: new Date().toISOString(), idempotencyKey: randomUUID() });
    const first = await pay();
    expect(first.ok && first.data.state).toBe("needs_review");
    const second = await pay();
    expect(second.ok && second.data.bookingState).toBe("needs_review");

    // Even if a booking is confirmed without its allocation, check-in refuses it.
    await sql(`update stay.bookings set state = 'confirmed' where id = $1`, [b.data.bookingId]);
    const [v] = await sql<{ version: number }>(`select version from stay.bookings where id = $1`, [b.data.bookingId]);
    const ci = await transitionBooking(fd, { bookingId: b.data.bookingId, expectedVersion: v!.version, action: "check_in", idempotencyKey: randomUUID(), identityVerified: true });
    expect(!ci.ok && ci.error.code).toBe("INVALID_TRANSITION");
  });
});

const address = { name: "Khách Shop", phone: "0900000202", line1: "12 Đường Hoa", regionCode: "default" };
const placeShop = (variantId: string, method: "cod" | "bank" = "cod") =>
  createShopOrder(anonClient(), { lines: [{ variantId, qty: 1 }], shippingAddress: address, method, idempotencyKey: randomUUID(), terms: true });
const onHand = async (variantId: string) => (await sql<{ on_hand: number; reserved: number }>(`select on_hand, reserved from shop.inventory where variant_id = $1`, [variantId]))[0]!;
async function move(orderId: string, to: string) {
  const [o] = await sql<{ version: number }>(`select version from commerce.orders where id = $1`, [orderId]);
  const r = await transitionFulfillment(await clientFor(USERS.finance), { orderId, to, expectedVersion: o!.version, tracking: "GHN1", note: "ok" });
  if (!r.ok) throw new Error(`${to}: ${r.error.message}`);
}

describe("review2: tồn kho shop", () => {
  it("#3 nhập lại hàng trả không vượt số đã giao", async () => {
    const { variantId } = await seedSku({ onHand: 8 });
    const r = await placeShop(variantId);
    if (!r.ok) throw new Error(r.error.message);
    for (const to of ["confirmed", "packing", "ready_to_ship", "shipped", "returned"]) await move(r.data.orderId, to);
    const inv = await clientFor(USERS.finance);
    const over = await inv.schema("shop").rpc("restock_return", { p_order: r.data.orderId, p_variant: variantId, p_qty: 100, p_inspection_note: "Đã kiểm" });
    expect(over.error?.message).toBe("VALIDATION");
    expect((await onHand(variantId)).on_hand).toBe(7);
    const ok = await inv.schema("shop").rpc("restock_return", { p_order: r.data.orderId, p_variant: variantId, p_qty: 1, p_inspection_note: "Đã kiểm" });
    expect(ok.error).toBeNull();
    expect((await onHand(variantId)).on_hand).toBe(8);
  });

  it("#4 chuyển khoản một phần quá hạn: nhả hàng, đơn chờ đối soát, tiền vẫn là nghĩa vụ", async () => {
    const { variantId } = await seedSku({ onHand: 1 });
    const r = await placeShop(variantId, "bank");
    if (!r.ok) throw new Error(r.error.message);
    const p = await recordPayment(await clientFor(USERS.finance), { orderId: r.data.orderId, provider: "bank_transfer", providerRef: randomUUID(), amount: "1000", receivedAt: new Date().toISOString(), evidenceNote: "Sao kê", idempotencyKey: randomUUID() });
    expect(p.ok).toBe(true);
    await sql(`update commerce.orders set due_at = now() - interval '1 minute' where id = $1`, [r.data.orderId]);
    await sql(`select shop.expire_unpaid_orders()`);
    expect(await onHand(variantId)).toEqual({ on_hand: 1, reserved: 0 });
    const [o] = await sql<{ status: string; paid_amount: string }>(`select status, paid_amount::text from commerce.orders where id = $1`, [r.data.orderId]);
    expect(o).toEqual({ status: "needs_review", paid_amount: "1000" });
    const [ob] = await sql(`select 1 from core.outbox where aggregate_id = $1 and kind = 'payment.review'`, [r.data.orderId]);
    expect(ob).toBeDefined();
  });
});

describe("review2: dashboard", () => {
  it("#7 doanh thu sản phẩm shop online hiện trên dashboard theo điểm", async () => {
    const day = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    const online = async () => {
      const { data, error } = await (await clientFor(USERS.finance)).schema("commerce").rpc("get_location_metrics", { p_entity: E1, p_location: L1, p_from: day, p_to: day });
      if (error) throw new Error(error.message);
      return BigInt((data as { onlineShopRevenue?: string }).onlineShopRevenue ?? "0");
    };
    const before = await online();
    const { variantId } = await seedSku({ onHand: 1, price: 123456n });
    const r = await placeShop(variantId);
    if (!r.ok) throw new Error(r.error.message);
    for (const to of ["confirmed", "packing", "ready_to_ship", "shipped", "completed"]) await move(r.data.orderId, to);
    expect((await online()) - before).toBe(123456n);
  });
});

describe("review2: nội dung, media, bản tin", () => {
  const uniq = () => Math.random().toString(36).slice(2, 8);
  const ver = async (id: string) => (await sql<{ version: number }>(`select version from content.posts where id = $1`, [id]))[0]!.version;
  const publicBody = async (id: string) => (await anonClient().schema("content").from("posts").select("body_md").eq("id", id)).data?.[0]?.body_md;

  it("#2 lưu nháp bài đã đăng không công khai bản sửa; chỉ đăng mới đổi bản công khai", async () => {
    const ed = await clientFor(USERS.editor);
    const { data: id } = await ed.schema("content").rpc("save_post", { p: { entityId: E1, slug: `nhap-${uniq()}`, title: "Bài gốc", bodyMd: "Bản đã duyệt" } });
    await ed.schema("content").rpc("publish_content", { p_post: id, p_expected_version: await ver(id), p_scheduled_at: null });
    const saved = await ed.schema("content").rpc("save_post", { p: { id, entityId: E1, title: "Bài gốc", bodyMd: "Bản sửa chưa duyệt", expectedVersion: await ver(id) } });
    expect(saved.error).toBeNull();
    expect(await publicBody(id)).toBe("Bản đã duyệt");
    expect((await ed.schema("content").rpc("publish_content", { p_post: id, p_expected_version: await ver(id), p_scheduled_at: null })).error).toBeNull();
    expect(await publicBody(id)).toBe("Bản sửa chưa duyệt");
  });

  it("#2 bài hẹn giờ chỉ đăng bản đã duyệt, không đăng bản sửa sau đó", async () => {
    const ed = await clientFor(USERS.editor);
    const { data: id } = await ed.schema("content").rpc("save_post", { p: { entityId: E1, slug: `hen-${uniq()}`, title: "Bài hẹn", bodyMd: "Bản đã duyệt" } });
    await ed.schema("content").rpc("publish_content", { p_post: id, p_expected_version: await ver(id), p_scheduled_at: new Date(Date.now() + 3600_000).toISOString() });
    await ed.schema("content").rpc("save_post", { p: { id, entityId: E1, bodyMd: "Bản sửa chưa duyệt", expectedVersion: await ver(id) } });
    await sql(`update content.posts set scheduled_at = now() - interval '1 minute' where id = $1`, [id]);
    await sql(`select content.publish_due()`);
    expect(await publicBody(id)).toBe("Bản đã duyệt");
  });

  it("#9 biên tập viên không chuyển media sang pháp nhân không có quyền", async () => {
    const [m] = await sql<{ id: string }>(`insert into core.media(entity_id, bucket, path, classification, mime, bytes, alt) values ($1, 'media', $2, 'public', 'image/png', 10, 'Ảnh') returning id`, [E1, `${E1}/${uniq()}.png`]);
    const ed = await clientFor(USERS.editor);
    await ed.schema("core").from("media").update({ entity_id: "e0000000-0000-4000-8000-000000000002" }).eq("id", m!.id);
    const [after] = await sql<{ entity_id: string }>(`select entity_id from core.media where id = $1`, [m!.id]);
    expect(after!.entity_id).toBe(E1);
  });

  it("#11 đăng ký lại email có sẵn không trả quyền điều khiển, không đổi link cũ", async () => {
    const email = `nl-${uniq()}@example.test`;
    const first = await anonClient().schema("content").rpc("subscribe_newsletter", { p_email: email, p_consent: true });
    expect(first.error).toBeNull();
    expect(first.data ?? null).toBeNull();
    const [before] = await sql<{ token_hash: string; status: string }>(`select token_hash::text, status from content.newsletter_subscriptions where email = $1`, [email]);
    expect(before!.status).toBe("pending");
    // Confirmation goes to the mailbox: the rendered email carries the token, the caller never does.
    const [job] = await sql<{ id: string }>(`select id from core.outbox where kind = 'newsletter.confirm' and payload ->> 'email' = $1`, [email]);
    const [r] = await sql<{ v: { vars: { confirmToken: string }; to: string } }>(`select core.render_outbox($1) v`, [job!.id]);
    expect(r!.v.to).toBe(email);
    expect((await anonClient().schema("content").rpc("confirm_newsletter", { p_token: r!.v.vars.confirmToken })).error).toBeNull();
    const [mid] = await sql<{ token_hash: string; status: string }>(`select token_hash::text, status from content.newsletter_subscriptions where email = $1`, [email]);
    expect(mid!.status).toBe("subscribed");
    const again = await anonClient().schema("content").rpc("subscribe_newsletter", { p_email: email, p_consent: true });
    expect(again.data ?? null).toBeNull();
    const [after] = await sql<{ token_hash: string }>(`select token_hash::text from content.newsletter_subscriptions where email = $1`, [email]);
    expect(after!.token_hash).toBe(mid!.token_hash);
  });
});
