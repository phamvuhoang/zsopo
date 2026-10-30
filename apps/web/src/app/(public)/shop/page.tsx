import type { Metadata } from "next";
import Link from "next/link";
import { ProductTile } from "@/features/shop/product-card";
import { listCategories, listProducts } from "@/features/shop/queries";

export const metadata: Metadata = {
  title: "Shop năng lượng ZSOPO",
  description: "Đá, dụng cụ thiền, trang sức, dược liệu, nông sản khô chay, gia vị rừng, muối, combo và ấn phẩm, mỗi sản phẩm có bảng năng lượng.",
  alternates: { canonical: "/shop" },
};

export default async function ShopHome() {
  const [cats, products] = await Promise.all([listCategories(), listProducts()]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold md:text-4xl">Shop năng lượng</h1>
      <p className="mt-3 max-w-2xl text-[var(--ink-2)]">Mỗi sản phẩm có bảng năng lượng ghi rõ công dụng, nguồn gốc, cách dùng và nghi lễ. Nội dung mang tính hỗ trợ tinh thần, không thay thế tư vấn y khoa.</p>
      <h2 className="mt-8 text-xl font-semibold">Danh mục</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {cats.map((c) => (
          <li key={c.id}><Link href={`/shop/danh-muc/${c.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-[var(--line)] px-4 whitespace-nowrap hover:bg-[var(--surface-2)]">{c.name}</Link></li>
        ))}
      </ul>
      <h2 className="mt-10 text-xl font-semibold">Sản phẩm</h2>
      {products.length === 0 ? <p className="mt-3">Sản phẩm đang được chuẩn bị.</p> : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.slice(0, 12).map((p) => <ProductTile key={p.id} p={p} />)}</ul>
      )}
    </div>
  );
}
