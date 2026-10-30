import { CHAKRAS, CHAKRA_LABEL } from "@zsopo/core";
import { Price, StatusBadge } from "@zsopo/ui";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { createProduct, publishProduct } from "@/features/shop/actions";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Sản phẩm" };

export default async function ProductsAdmin() {
  const ctx = await getStaffContext("/admin/san-pham");
  await requirePermission("catalog.write", ctx.location.entity_id, null, "/admin/san-pham");
  const db = await createClient();
  const [{ data: products }, { data: cats }] = await Promise.all([
    db.schema("shop").from("products").select("id, slug, name, status, energy_card_id, product_variants(sku, name, price)").eq("entity_id", ctx.location.entity_id).order("created_at", { ascending: false }),
    db.schema("shop").from("categories").select("id, name").order("sort"),
  ]);
  return (
    <>
      <h1 className="text-2xl font-semibold">Sản phẩm</h1>
      <p className="text-sm text-[var(--ink-2)]">{(products ?? []).filter((p) => p.status === "published").length} sản phẩm đang bán. Mở bán chỉ khi có bảng năng lượng; dữ liệu mẫu cần chủ nội dung duyệt trước khi bán thật.</p>
      <section className="mt-6 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
        <h2 className="font-semibold">Thêm sản phẩm (nháp)</h2>
        <ActionForm action={createProduct} submit="Tạo nháp" className="mt-2 grid gap-2 md:grid-cols-2">
          <input type="hidden" name="entityId" value={ctx.location.entity_id} />
          <Field label="Tên"><input name="name" required className={inputCls} /></Field>
          <Field label="Danh mục"><select name="categoryId" className={inputCls}>{(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="SKU"><input name="sku" required className={inputCls} /></Field>
          <Field label="Biến thể"><input name="variantName" placeholder="Tiêu chuẩn" className={inputCls} /></Field>
          <Field label="Giá (đ)"><input name="price" inputMode="numeric" required className={inputCls} /></Field>
          <Field label="Tần số"><input name="frequency" className={inputCls} /></Field>
          <Field label="Công dụng"><textarea name="purpose" className={inputCls} /></Field>
          <Field label="Nguồn gốc"><textarea name="origin" className={inputCls} /></Field>
          <Field label="Cách dùng / nghi lễ"><textarea name="usage" className={inputCls} /></Field>
          <Field label="Đá (dấu phẩy)"><input name="stones" className={inputCls} /></Field>
          <Field label="Video nghi lễ (YouTube)"><input name="videoUrl" type="url" className={inputCls} /></Field>
          <label className="flex min-h-11 items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="requiresRitual" />Cần nghi lễ 24 giờ trước khi giao</label>
          <fieldset className="md:col-span-2"><legend className="text-xs">Luân xa</legend><div className="flex flex-wrap gap-3">{CHAKRAS.map((c) => <label key={c} className="flex min-h-11 items-center gap-1 text-sm"><input type="checkbox" name="chakras" value={c} />{CHAKRA_LABEL[c]}</label>)}</div></fieldset>
        </ActionForm>
      </section>
      <ul className="mt-6 flex flex-col gap-2">
        {(products ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--line)] p-3 text-sm">
            <span className="font-semibold">{p.name}</span>
            <StatusBadge tone={p.status === "published" ? "success" : "neutral"}>{p.status === "published" ? "Đang bán" : "Nháp"}</StatusBadge>
            {(p.product_variants as { sku: string; name: string; price: number }[]).map((v) => <span key={v.sku} className="text-xs text-[var(--ink-3)]">{v.sku} {v.name} <Price value={String(v.price)} /></span>)}
            {p.status !== "published" && <ActionForm action={publishProduct} submit="Mở bán"><input type="hidden" name="productId" value={p.id} /></ActionForm>}
          </li>
        ))}
      </ul>
    </>
  );
}
