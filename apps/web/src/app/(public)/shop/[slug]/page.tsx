import { EnergyCard, Price, StatusBadge } from "@zsopo/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { notifyBackInStock } from "@/features/shop/actions";
import { getProduct, listProducts } from "@/features/shop/queries";
import { FEATURES } from "@/lib/flags";
import { createPublicClient } from "@/lib/supabase/server";
import { AddToCart } from "@/features/shop/add-to-cart";
import { JsonLd, product } from "@/lib/seo/json-ld";

export async function generateStaticParams() {
  const ps = await listProducts();
  return ps.length ? ps.map((p) => ({ slug: p.slug })) : [{ slug: "vong-tay-thach-anh-hong-8-ly" }];
}

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return { title: "Không tìm thấy sản phẩm" };
  return { title: `${p.name} | Shop ZSOPO`, description: `${p.summary} Nguồn gốc: ${p.origin}.`.slice(0, 160), alternates: { canonical: `/shop/${p.slug}` } };
}

/** Live stock state per variant (uncached): in stock or not, never the quantity. */
async function Variants({ product }: { product: NonNullable<Awaited<ReturnType<typeof getProduct>>> }) {
  const { data } = await createPublicClient().schema("shop").rpc("variant_availability", { p_variants: product.variants.map((v) => v.id) });
  const inStock = new Map(((data ?? []) as { variant_id: string; in_stock: boolean }[]).map((a) => [a.variant_id, a.in_stock]));
  return (
    <ul className="flex flex-col gap-3">
      {product.variants.map((v) => (
        <li key={v.id} className="rounded-md border border-[var(--line)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">{v.name}</span>
            <Price value={String(v.price)} className="font-semibold" />
            {inStock.get(v.id) ? <StatusBadge tone="success">Còn hàng</StatusBadge> : <StatusBadge tone="danger">Hết hàng</StatusBadge>}
          </div>
          {inStock.get(v.id) ? (FEATURES.cart && <AddToCart variantId={v.id} name={`${product.name} - ${v.name}`} price={v.price} />) : (
            <ActionForm action={notifyBackInStock} submit="Báo tôi khi có hàng" className="mt-2 flex flex-wrap items-end gap-2">
              <input type="hidden" name="variantId" value={v.id} />
              <Field label="Email"><input name="email" type="email" required className={inputCls} /></Field>
              <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" name="consent" required /> Đồng ý nhận email thông báo có hàng</label>
            </ActionForm>
          )}
        </li>
      ))}
    </ul>
  );
}

export const instant = false;

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <JsonLd data={product(p)} />
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--ink-3)]"><Link href="/shop">Shop</Link> / {p.name}</nav>
      <div className="mt-4 grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div>
          <h1 className="text-3xl font-semibold">{p.name}</h1>
          <p className="mt-3 text-lg text-[var(--ink-2)]">{p.summary}</p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-[var(--ink-3)]">Nguồn gốc</dt><dd>{p.origin}</dd>
            <dt className="text-[var(--ink-3)]">Cách dùng</dt><dd>{p.usage}</dd>
          </dl>
          {p.energy && <div className="mt-6"><EnergyCard card={p.energy} /></div>}
          {p.ritualSlug && <p className="mt-4 text-sm"><Link href={`/la/${p.ritualSlug}`} className="underline">Hướng dẫn nghi lễ cho sản phẩm này</Link></p>}
        </div>
        <aside>
          <p className="text-2xl font-semibold"><Price value={String(p.priceFrom)} prefix="Từ" /></p>
          <div className="mt-4"><Suspense fallback={<p>Đang kiểm tra tồn kho...</p>}><Variants product={p} /></Suspense></div>
        </aside>
      </div>
    </div>
  );
}
