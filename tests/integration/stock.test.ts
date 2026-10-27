import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { E1, USERS, anonClient, clientFor, db, seedSku, sql } from "./helpers";

afterAll(() => db.end());

async function order() {
  const [o] = await sql<{ id: string }>(`insert into commerce.orders(entity_id, kind) values ($1, 'shop') returning id`, [E1]);
  return o!.id;
}
const reserve = (orderId: string, variantId: string, qty = 1) =>
  sql<{ id: string }>(`select shop.reserve_stock($1, $2, $3, now() + interval '24 hours') as id`, [orderId, variantId, qty]).then((r) => ({ ok: true as const, id: r[0]!.id })).catch((e: Error) => ({ ok: false as const, error: e.message }));

describe("catalogue và tồn kho", () => {
  it("sản phẩm thiếu Energy Card không publish được", async () => {
    const [cat] = await sql<{ id: string }>(`select id from shop.categories limit 1`);
    const [p] = await sql<{ id: string }>(`insert into shop.products(entity_id, category_id, slug, name) values ($1, $2, 'sp-' || substr(md5(random()::text),1,8), 'Không thẻ') returning id`, [E1, cat!.id]);
    const editor = await clientFor(USERS.editor);
    const r = await editor.schema("shop").rpc("publish_product", { p_product: p!.id });
    expect(r.error?.message).toBe("VALIDATION");
  });

  it("hai khách tranh SKU cuối: chỉ một người giữ được", async () => {
    const { variantId } = await seedSku({ onHand: 1 });
    const [a, b] = await Promise.all([reserve(await order(), variantId), reserve(await order(), variantId)]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect([a, b].find((x) => !x.ok)!.ok === false && ([a, b].find((x) => !x.ok) as { error: string }).error).toBe("SOLD_OUT");
    const [inv] = await sql<{ on_hand: number; reserved: number }>(`select on_hand, reserved from shop.inventory where variant_id = $1`, [variantId]);
    expect(inv).toEqual({ on_hand: 1, reserved: 1 });
  });

  it("nhả giữ hàng lặp lại chỉ cộng kho một lần; giao hàng trừ on_hand và reserved", async () => {
    const { variantId } = await seedSku({ onHand: 3 });
    const r1 = await reserve(await order(), variantId, 2);
    if (!r1.ok) throw new Error(r1.error);
    await sql(`select shop.release_reservation($1)`, [r1.id]);
    await sql(`select shop.release_reservation($1)`, [r1.id]);
    let [inv] = await sql<{ on_hand: number; reserved: number }>(`select on_hand, reserved from shop.inventory where variant_id = $1`, [variantId]);
    expect(inv).toEqual({ on_hand: 3, reserved: 0 });
    const r2 = await reserve(await order(), variantId, 1);
    if (!r2.ok) throw new Error(r2.error);
    await sql(`select shop.ship_reservation($1)`, [r2.id]);
    await sql(`select shop.ship_reservation($1)`, [r2.id]);
    [inv] = await sql<{ on_hand: number; reserved: number }>(`select on_hand, reserved from shop.inventory where variant_id = $1`, [variantId]);
    expect(inv).toEqual({ on_hand: 2, reserved: 0 });
  });

  it("biến thể có giá và tồn khác nhau; khách thấy còn/hết, không thấy số tồn", async () => {
    const { productId, variantId } = await seedSku({ onHand: 0, price: 120000n });
    const [v2] = await sql<{ id: string }>(`insert into shop.product_variants(entity_id, product_id, sku, name, price) values ($1, $2, 'SKU2-' || substr(md5(random()::text),1,6), 'Cỡ lớn', 180000) returning id`, [E1, productId]);
    await sql(`insert into shop.inventory(entity_id, variant_id, warehouse_id, on_hand) values ($1, $2, '90000000-0000-4000-8000-000000000002', 5)`, [E1, v2!.id]);
    const { data } = await anonClient().schema("shop").rpc("variant_availability", { p_variants: [variantId, v2!.id] });
    expect(data).toEqual(expect.arrayContaining([{ variant_id: variantId, in_stock: false }, { variant_id: v2!.id, in_stock: true }]));
    expect(await anonClient().schema("shop").from("inventory").select("*")).toMatchObject({ error: { code: "42501" } });
  });

  it("đăng ký báo có hàng cần đồng ý nhận thông báo", async () => {
    const { variantId } = await seedSku({ onHand: 0 });
    const no = await anonClient().schema("shop").rpc("request_back_in_stock", { p_variant: variantId, p_email: "a@example.test", p_consent: false });
    expect(no.error?.message).toBe("VALIDATION");
    const yes = await anonClient().schema("shop").rpc("request_back_in_stock", { p_variant: variantId, p_email: "a@example.test", p_consent: true });
    expect(yes.error).toBeNull();
    // Restock triggers one notification job per request.
    await sql(`update shop.inventory set on_hand = 3 where variant_id = $1`, [variantId]);
    expect(await sql(`select 1 from core.outbox where kind = 'stock.back' and aggregate_id in (select id from shop.back_in_stock_requests where variant_id = $1)`, [variantId])).toHaveLength(1);
    void randomUUID;
  });
});
