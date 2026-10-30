import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { getPublishedPage } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("gioi-thieu");
  return { title: page?.title ?? "Giới thiệu", description: page?.excerpt, alternates: { canonical: "/gioi-thieu" } };
}

export default async function AboutPage() {
  const page = await getPublishedPage("gioi-thieu");
  if (!page) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold md:text-4xl">{page.title}</h1>
      <p className="mt-4 text-lg text-[var(--ink-2)]">{page.excerpt}</p>
      <div className="mt-8">
        <Markdown source={page.body_md} />
      </div>
    </article>
  );
}
