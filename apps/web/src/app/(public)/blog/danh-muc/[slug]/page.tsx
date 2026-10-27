import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostTile } from "@/features/content/post-card";
import { listBlogCategories, listPosts } from "@/features/content/queries";

export async function generateStaticParams() {
  const cats = await listBlogCategories();
  return cats.length ? cats.map((c) => ({ slug: c.slug })) : [{ slug: "da-lat" }];
}
export async function generateMetadata({ params }: PageProps<"/blog/danh-muc/[slug]">): Promise<Metadata> {
  const slug = (await params).slug;
  const c = (await listBlogCategories()).find((x) => x.slug === slug);
  return { title: c ? `${c.name} | Blog` : "Blog", alternates: { canonical: `/blog/danh-muc/${slug}` } };
}
export const instant = false;

export default async function BlogCategory({ params }: PageProps<"/blog/danh-muc/[slug]">) {
  const slug = (await params).slug;
  const c = (await listBlogCategories()).find((x) => x.slug === slug);
  if (!c) notFound();
  const posts = (await listPosts()).filter((p) => p.category_id === c.id);
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--ink-3)]"><Link href="/blog">Blog</Link> / {c.name}</nav>
      <h1 className="mt-2 text-3xl font-semibold">{c.name}</h1>
      {posts.length ? <ul className="mt-6 grid gap-4 md:grid-cols-2">{posts.map((p) => <PostTile key={p.id} p={p} />)}</ul> : <p className="mt-6">Chưa có bài trong danh mục này. <Link href="/blog" className="underline">Xem tất cả bài viết</Link></p>}
    </div>
  );
}
