import { ActionForm, Field, inputCls } from "@/components/action-form";
import { receiveStock } from "@/features/shop/actions";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Kho" };

export default async function InventoryAdmin() {
  const ctx = await getStaffContext("/admin/kho");
  await requirePermission("inventory.manage", ctx.location.entity_id, null, "/admin/kho");
  const db = await createClient();
  const [{ data: inv }, { data: whs }, { data: variants }] = await Promise.all([
    db.schema("shop").from("inventory").select("variant_id, warehouse_id, on_hand, reserved").eq("entity_id", ctx.location.entity_id),
    db.schema("shop").from("warehouses").select("id, code, name").eq("entity_id", ctx.location.entity_id),
    db.schema("shop").from("product_variants").select("id, sku, name, products(name)").eq("entity_id", ctx.location.entity_id).order("sku"),
  ]);
  const wh = new Map((whs ?? []).map((w) => [w.id, w.name]));
  const vname = new Map((variants ?? []).map((v) => [v.id, `${v.sku} · ${(v.products as unknown as { name: string })?.name ?? ""} ${v.name}`]));
  return (
    <>
      <h1 className="text-2xl font-semibold">Kho showroom và online</h1>
      <ActionForm action={receiveStock} submit="Nhập / điều chỉnh" className="mt-4 flex flex-wrap items-end gap-2">
        <Field label="Biến thể"><select name="variantId" className={inputCls}>{(variants ?? []).map((v) => <option key={v.id} value={v.id}>{vname.get(v.id)}</option>)}</select></Field>
        <Field label="Kho"><select name="warehouseId" className={inputCls}>{(whs ?? []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></Field>
        <Field label="Số lượng (âm = điều chỉnh giảm)"><input name="qty" inputMode="numeric" required className={`${inputCls} w-24`} /></Field>
        <Field label="Chứng từ"><input name="note" required className={inputCls} /></Field>
      </ActionForm>
      <table className="mt-6 w-full text-left text-sm">
        <thead><tr className="border-b border-[var(--line)]"><th className="py-2">Biến thể</th><th>Kho</th><th>Tồn</th><th>Đang giữ</th><th>Khả dụng</th></tr></thead>
        <tbody>
          {(inv ?? []).map((i) => (
            <tr key={`${i.variant_id}${i.warehouse_id}`} className="border-b border-[var(--line)]">
              <td className="py-1">{vname.get(i.variant_id)}</td><td>{wh.get(i.warehouse_id)}</td><td>{i.on_hand}</td><td>{i.reserved}</td><td className={i.on_hand - i.reserved <= 0 ? "text-[var(--danger)]" : ""}>{i.on_hand - i.reserved}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
