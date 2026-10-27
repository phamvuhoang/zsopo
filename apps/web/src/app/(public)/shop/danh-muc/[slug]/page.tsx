import { CHAKRAS, CHAKRA_LABEL } from "@zsopo/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductTile } from "@/features/shop/product-card";
import { listCategories, listProducts } from "@/features/shop/queries";

const PAGE = 12;

export async function generateStaticParams() {
  const cats = await listCategories();
  return cats.length ? cats.map((c) => ({ slug: c.slug })) : [{ slug: "da-va-vat-pham" }];
}

export async function generateMetadata({ params }: PageProps<"/shop/danh-muc/[slug]">): Promise<Metadata> {
  const slug = (await params).slug;
  const c = (await listCategories()).find((x) => x.slug === slug);
  return { title: c ? `${c.name} | Shop` : "Danh mục", alternates: { canonical: `/shop/danh-muc/${slug}` } };
}

async function Listing({ params, searchParams }: PageProps<"/shop/danh-muc/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const cat = (await listCategories()).find((c) => c.slug === slug);
  if (!cat) notFound();
  const chakra = typeof sp["luan-xa"] === "string" && (CHAKRAS as readonly string[]).includes(sp["luan-xa"]) ? sp["luan-xa"] : null;
  const sort = sp["sap-xep"] === "gia-giam" ? -1 : sp["sap-xep"] === "gia-tang" ? 1 : 0;
  const page = Math.max(1, Number(sp.trang) || 1);
  let list = (await listProducts()).filter((p) => p.categoryId === cat.id && (!chakra || p.chakras.includes(chakra)));
  if (sort) list = [...list].sort((a, b) => (a.priceFrom - b.priceFrom) * sort);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const qs = (o: Record<string, string | number | null>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ "luan-xa": chakra, "sap-xep": sp["sap-xep"] as string | null, ...o })) if (v) u.set(k, String(v));
    return u.size ? `?${u}` : "";
  };
  return (
    <>
      <h1 className="text-3xl font-semibold">{cat.name}</h1>
      <form className="mt-4 flex flex-wrap items-end gap-3" aria-label="Lọc sản phẩm">
        <label className="flex flex-col gap-1 text-sm">Luân xa
          <select name="luan-xa" defaultValue={chakra ?? ""} className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3">
            <option value="">Tất cả</option>{CHAKRAS.map((c) => <option key={c} value={c}>{CHAKRA_LABEL[c]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">Sắp xếp
          <select name="sap-xep" defaultValue={(sp["sap-xep"] as string) ?? ""} className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3">
            <option value="">Mới nhất</option><option value="gia-tang">Giá tăng dần</option><option value="gia-giam">Giá giảm dần</option>
          </select>
        </label>
        <button className="min-h-11 rounded-md border border-[var(--line-2)] px-4">Lọc</button>
      </form>
      {list.length === 0 ? (
        <p className="mt-8">Chưa có sản phẩm phù hợp. <Link href={`/shop/danh-muc/${slug}`} className="underline">Xóa bộ lọc</Link></p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{list.slice((page - 1) * PAGE, page * PAGE).map((p) => <ProductTile key={p.id} p={p} />)}</ul>
      )}
      {pages > 1 && (
        <nav aria-label="Phân trang" className="mt-6 flex gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => <Link key={n} href={`/shop/danh-muc/${slug}${qs({ trang: n > 1 ? n : null })}`} aria-current={n === page ? "page" : undefined} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[var(--line)]">{n}</Link>)}
        </nav>
      )}
    </>
  );
}

export default function CategoryPage(props: PageProps<"/shop/danh-muc/[slug]">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--ink-3)]"><Link href="/shop">Shop</Link> / Danh mục</nav>
      <Suspense fallback={<p className="mt-4">Đang tải...</p>}><Listing {...props} /></Suspense>
    </div>
  );
}
