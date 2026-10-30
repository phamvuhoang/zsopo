import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRitual } from "@/features/shop/queries";

export const metadata: Metadata = { title: "Hướng dẫn nghi lễ", robots: { index: false } };
export const instant = false;

// QR on the ritual card leads here. Public, no account, no order or personal data.
export default async function RitualPage({ params }: PageProps<"/la/[slug]">) {
  const r = await getRitual((await params).slug);
  if (!r) notFound();
  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold">{r.title}</h1>
      {r.intro && <p className="mt-3 text-lg text-[var(--ink-2)]">{r.intro}</p>}
      <ol className="mt-6 flex flex-col gap-4">
        {r.steps.map((s, i) => (
          <li key={i} className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
            <h2 className="font-semibold">Bước {i + 1}: {s.title}</h2>
            <p className="mt-1">{s.text}</p>
          </li>
        ))}
      </ol>
      {r.video_url && <p className="mt-6"><a href={r.video_url} rel="noopener noreferrer" target="_blank" className="underline">Xem video hướng dẫn</a> (nội dung văn bản ở trên dùng được khi không xem video).</p>}
      <p className="mt-6 text-xs text-[var(--ink-3)]">Nội dung mang tính hỗ trợ tinh thần, không thay thế tư vấn y khoa.</p>
    </article>
  );
}
