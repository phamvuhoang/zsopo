import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { getPublishedPage } from "@/lib/content";

export const metadata: Metadata = {
  title: "Cẩm nang lưu trú Zen Homestay Đà Lạt",
  description: "Đường đi, giờ nhận trả phòng, nội quy và lưu ý khi lưu trú tại Zen Homestay Đà Lạt.",
  alternates: { canonical: "/handbook/da-lat" },
};

export default async function HandbookPage() {
  const page = await getPublishedPage("handbook-da-lat");
  if (!page) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold">{page.title}</h1>
      <div className="mt-6"><Markdown source={page.body_md} /></div>
    </article>
  );
}
