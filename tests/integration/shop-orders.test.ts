import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { recordPayment } from "../../packages/api/src/payments";
import { createShopOrder, priceCart, transitionFulfillment } from "../../packages/api/src/shop";
import { USERS, aal2ClientFor, anonClient, clientFor, db, seedSku, sql } from "./helpers";

afterAll(() => db.end());
const address = { name: "Khách Shop", phone: "0900000012", line1: "12 Đường Hoa", regionCode: "default" };
const place = (variantId: string, qty = 1, method: "cod" | "bank" = "cod", key = randomUUID()) =>
  createShopOrder(anonClient(), { lines: [{ variantId, qty }], shippingAddress: address, method, idempotencyKey: key, terms: true });
const fulfillment = async (orderId: string) => (await sql<{ fulfillment_status: string; version: number; payment_status: string; status: string }>(`select fulfillment_status, version, payment_status, status from commerce.orders where id = $1`, [orderId]))[0]!;
const move = async (orderId: string, to: string, tracking?: string) => {
  const f = await fulfillment(orderId);
  return transitionFulfillment(await clientFor(USERS.finance), { orderId, to, expectedVersion: f.version, tracking, note: "ok" });
};

describe("checkout shop", () => {
  it("giá do server tính; ship 30.000 dưới ngưỡng; giữ hàng ngay khi đặt (kể cả COD)", async () => {
    const { variantId } = await seedSku({ price: 120000n, onHand: 5 });
    const r = await createShopOrder(anonClient(), { lines: [{ variantId, qty: 2, price: 1 } as unknown as { variantId: string; qty: number }], shippingAddress: address, method: "cod", idempotencyKey: randomUUID(), terms: true });
    expect(r.ok && r.data.total).toBe(String(240000 + 30000));
    const [inv] = await sql<{ reserved: number }>(`select reserved from shop.inventory where variant_id = $1`, [variantId]);
    expect(inv!.reserved).toBe(2);
  });

  it("email xác nhận đơn shop có renderer: có email thì gửi, hủy hoặc thiếu email thì bỏ qua", async () => {
    const { variantId } = await seedSku({ onHand: 5 });
    const render = async (orderId: string) => {
      const [job] = await sql<{ id: string }>(`select id from core.outbox where kind = 'shop.order_placed' and aggregate_id = $1`, [orderId]);
      return (await sql<{ v: { skip?: string; to?: string; template?: string; vars?: { receiptPath: string; methodNote: string } } }>(`select core.render_outbox($1) v`, [job!.id]))[0]!.v;
    };
    const withEmail = await createShopOrder(anonClient(), { lines: [{ variantId, qty: 1 }], shippingAddress: address, method: "bank", email: "khach@example.test", idempotencyKey: randomUUID(), terms: true });
    if (!withEmail.ok) throw new Error(withEmail.error.message);
    const r = await render(withEmail.data.orderId);
    expect(r).toMatchObject({ to: "khach@example.test", template: "shop.order_placed", vars: { receiptPath: `/don-hang/${withEmail.data.orderCode}` } });
    expect(r.vars!.methodNote).toMatch(/^Chuyển khoản trước/);
    const noEmail = await place(variantId);
    if (!noEmail.ok) throw new Error(noEmail.error.message);
    expect((await render(noEmail.data.orderId)).skip).toBe("no email on order");
    await sql(`update commerce.orders set fulfillment_status = 'cancelled' where id = $1`, [withEmail.data.orderId]);
    expect((await render(withEmail.data.orderId)).skip).toBe("order cancelled");
  });

  it("gửi trùng cùng khóa chỉ tạo một đơn", async () => {
    const { variantId } = await seedSku({ onHand: 5 });
    const key = randomUUID();
    const [a, b] = await Promise.all([place(variantId, 1, "cod", key), place(variantId, 1, "cod", key)]);
    expect(a.ok && b.ok && a.data.orderId === b.data.orderId).toBe(true);
  });

  it("COD đã gửi hàng chưa phải đã thanh toán; thu tiền COD mới paid", async () => {
    const { variantId } = await seedSku({ onHand: 2 });
    const r = await place(variantId);
    if (!r.ok) throw new Error(r.error.message);
    for (const to of ["confirmed", "packing", "ready_to_ship"]) expect((await move(r.data.orderId, to)).ok).toBe(true);
    expect((await move(r.data.orderId, "shipped", "GHN123")).ok).toBe(true);
    expect((await fulfillment(r.data.orderId)).payment_status).toBe("unpaid");
    const [inv] = await sql<{ on_hand: number; reserved: number }>(`select on_hand, reserved from shop.inventory where variant_id = $1`, [variantId]);
    expect(inv).toEqual({ on_hand: 1, reserved: 0 });
    const p = await recordPayment(await clientFor(USERS.finance), { orderId: r.data.orderId, provider: "cod", providerRef: `GHN-COD-${randomUUID()}`, amount: r.data.total, receivedAt: new Date().toISOString(), idempotencyKey: randomUUID() });
    expect(p.ok).toBe(true);
    expect((await fulfillment(r.data.orderId)).payment_status).toBe("paid");
  });

  it("chuyển khoản quá hạn: hủy và nhả hàng; tiền tới muộn chuyển đối soát, không âm tồn", async () => {
    const { variantId } = await seedSku({ onHand: 1 });
    const r = await place(variantId, 1, "bank");
    if (!r.ok) throw new Error(r.error.message);
    await sql(`update commerce.orders set due_at = now() - interval '1 minute' where id = $1`, [r.data.orderId]);
    await sql(`select shop.expire_unpaid_orders()`);
    expect((await fulfillment(r.data.orderId)).status).toBe("expired");
    let [inv] = await sql<{ on_hand: number; reserved: number }>(`select on_hand, reserved from shop.inventory where variant_id = $1`, [variantId]);
    expect(inv).toEqual({ on_hand: 1, reserved: 0 });
    const p = await recordPayment(aal2ClientFor(USERS.finance), { orderId: r.data.orderId, provider: "bank_transfer", providerRef: `late-${randomUUID()}`, amount: r.data.total, receivedAt: new Date().toISOString(), evidenceNote: "Sao kê", idempotencyKey: randomUUID() });
    expect(p.ok && p.data.state).toBe("needs_review");
    [inv] = await sql<{ on_hand: number; reserved: number }>(`select on_hand, reserved from shop.inventory where variant_id = $1`, [variantId]);
    expect(inv).toEqual({ on_hand: 1, reserved: 0 });
  });

  it("nghi lễ 24h: chưa đủ 24h không chuyển sang sẵn sàng gửi", async () => {
    const { variantId, productId } = await seedSku({ onHand: 2 });
    await sql(`update shop.products set ritual_slug = 'nghi-le-thu' where id = $1`, [productId]);
    const r = await place(variantId);
    if (!r.ok) throw new Error(r.error.message);
    for (const to of ["confirmed", "packing", "ritual_hold"]) expect((await move(r.data.orderId, to)).ok).toBe(true);
    const early = await move(r.data.orderId, "ready_to_ship");
    expect(!early.ok && early.error.code).toBe("INVALID_TRANSITION");
    await sql(`update commerce.orders set ritual_started_at = now() - interval '25 hours' where id = $1`, [r.data.orderId]);
    expect((await move(r.data.orderId, "ready_to_ship")).ok).toBe(true);
  });

  it("tính giỏ giới hạn số lượng theo tồn và báo hết hàng", async () => {
    const { variantId } = await seedSku({ onHand: 2, price: 600000n });
    const r = await priceCart(anonClient(), [{ variantId, qty: 5 }], null);
    expect(r.ok && r.data.lines[0]).toMatchObject({ qty: 2, maxQty: 2, inStock: true });
    expect(r.ok && r.data.shipping).toBe("0");
  });

  it("hết hàng giữa chừng: đặt thất bại toàn bộ, không giữ dở dang", async () => {
    const a = await seedSku({ onHand: 1 });
    const b = await seedSku({ onHand: 0 });
    const r = await createShopOrder(anonClient(), { lines: [{ variantId: a.variantId, qty: 1 }, { variantId: b.variantId, qty: 1 }], shippingAddress: address, method: "cod", idempotencyKey: randomUUID(), terms: true });
    expect(!r.ok && r.error.code).toBe("SOLD_OUT");
    const [inv] = await sql<{ reserved: number }>(`select reserved from shop.inventory where variant_id = $1`, [a.variantId]);
    expect(inv!.reserved).toBe(0);
  });
});
