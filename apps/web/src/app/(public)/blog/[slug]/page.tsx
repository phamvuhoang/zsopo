import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { PostTile, fmtDate } from "@/features/content/post-card";
import { getPost, getRedirect, listPosts, toc } from "@/features/content/queries";

export async function generateStaticParams() {
  const ps = await listPosts();
  return ps.length ? ps.map((p) => ({ slug: p.slug })) : [{ slug: "thien-buoi-sang-giua-doi-thong" }];
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const p = await getPost((await params).slug);
  if (!p) return { title: "Không tìm thấy bài viết" };
  return {
    title: p.seo?.title || p.title, description: p.seo?.description || p.excerpt, alternates: { canonical: `/blog/${p.slug}` },
    openGraph: { type: "article", title: p.title, description: p.excerpt, publishedTime: p.published_at, modifiedTime: p.updated_at, authors: [p.author_name] },
  };
}

export const instant = false;

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const slug = (await params).slug;
  const p = await getPost(slug);
  if (!p) {
    const to = await getRedirect(`/blog/${slug}`);
    if (to) permanentRedirect(to);
    notFound();
  }
  const headings = toc(p.body_md);
  const related = (await listPosts()).filter((x) => x.id !== p.id && x.category_id === p.category_id).slice(0, 3);
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--ink-3)]"><Link href="/blog">Blog</Link> / {p.title}</nav>
      <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{p.title}</h1>
      <p className="mt-3 text-sm text-[var(--ink-3)]">{p.author_name} · <time dateTime={p.published_at}>{fmtDate(p.published_at)}</time> · cập nhật {fmtDate(p.updated_at)} · {p.reading_minutes} phút đọc</p>
      <p className="mt-4 text-lg text-[var(--ink-2)]">{p.excerpt}</p>
      {headings.length > 1 && (
        <nav aria-label="Mục lục" className="mt-6 rounded-md border border-[var(--line)] p-4 text-sm">
          <p className="font-semibold">Mục lục</p>
          <ul className="mt-2">{headings.map((h) => <li key={h.id} className={h.level === 3 ? "ml-4" : ""}><a href={`#${h.id}`} className="underline">{h.text}</a></li>)}</ul>
        </nav>
      )}
      <div className="mt-8"><Markdown source={p.body_md} /></div>
      {p.cta?.href?.startsWith("/") && <Link href={p.cta.href} className="mt-8 inline-flex min-h-11 items-center rounded-md bg-[var(--accent)] px-5 font-semibold text-[var(--on-accent)]">{p.cta.label}</Link>}
      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="lien-quan">
          <h2 id="lien-quan" className="text-xl font-semibold">Bài liên quan</h2>
          <ul className="mt-4 grid gap-4">{related.map((r) => <PostTile key={r.id} p={r} />)}</ul>
        </section>
      )}
    </article>
  );
}
