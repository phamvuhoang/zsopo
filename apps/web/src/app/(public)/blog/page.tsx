import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PostTile } from "@/features/content/post-card";
import { listBlogCategories, listPosts } from "@/features/content/queries";

export const metadata: Metadata = { title: "Blog ZSOPO", description: "Bài viết về thiền, năng lượng, Đà Lạt và cách sống chậm.", alternates: { canonical: "/blog" } };
const PER = 12;

async function Listing({ searchParams }: Pick<PageProps<"/blog">, "searchParams">) {
  const page = Math.max(1, Number((await searchParams).trang) || 1);
  const posts = await listPosts();
  const pages = Math.max(1, Math.ceil(posts.length / PER));
  return (
    <>
      <ul className="mt-6 grid gap-4 md:grid-cols-2">{posts.slice((page - 1) * PER, page * PER).map((p) => <PostTile key={p.id} p={p} />)}</ul>
      {posts.length === 0 && <p className="mt-6">Chưa có bài viết.</p>}
      {pages > 1 && <nav aria-label="Phân trang" className="mt-6 flex gap-2">{Array.from({ length: pages }, (_, i) => i + 1).map((n) => <Link key={n} href={n > 1 ? `/blog?trang=${n}` : "/blog"} aria-current={n === page ? "page" : undefined} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[var(--line)]">{n}</Link>)}</nav>}
    </>
  );
}

export default async function Blog(props: PageProps<"/blog">) {
  const cats = await listBlogCategories();
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-semibold md:text-4xl">Blog</h1>
      <nav aria-label="Danh mục" className="mt-4 flex flex-wrap gap-2">{cats.map((c) => <Link key={c.id} href={`/blog/danh-muc/${c.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-[var(--line)] px-4">{c.name}</Link>)}</nav>
      <Suspense fallback={<p className="mt-6">Đang tải...</p>}><Listing searchParams={props.searchParams} /></Suspense>
    </div>
  );
}
