import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { getPublishedPage, listPublishedPolicies } from "@/lib/content";

export async function generateStaticParams() {
  const policies = await listPublishedPolicies();
  return policies.length ? policies.map((p) => ({ slug: p.slug })) : [{ slug: "bao-mat" }];
}

export async function generateMetadata({ params }: PageProps<"/chinh-sach/[slug]">): Promise<Metadata> {
  const page = await getPublishedPage((await params).slug);
  if (!page || page.kind !== "policy") return { title: "Không tìm thấy" };
  return { title: page.title, description: page.excerpt, alternates: { canonical: `/chinh-sach/${page.slug}` } };
}

// Proxy checks unknown slugs before the static shell streams to preserve HTTP 404.
export const instant = false;

export default async function PolicyPage({ params }: PageProps<"/chinh-sach/[slug]">) {
  const page = await getPublishedPage((await params).slug);
  if (!page || page.kind !== "policy") notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold">{page.title}</h1>
      <p className="mt-2 text-sm text-[var(--ink-3)]">Cập nhật: {new Date(page.updated_at).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
      <div className="mt-8">
        <Markdown source={page.body_md} />
      </div>
    </article>
  );
}
