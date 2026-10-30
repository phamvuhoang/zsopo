import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createPublicClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tìm kiếm", robots: { index: false, follow: true }, alternates: { canonical: "/tim-kiem" } };
const KIND: Record<string, string> = { post: "Bài viết", page: "Trang", room: "Phòng", product: "Sản phẩm" };

async function Results({ searchParams }: Pick<PageProps<"/tim-kiem">, "searchParams">) {
  const q = String((await searchParams).q ?? "").trim().slice(0, 100);
  if (!q) return <p className="mt-6 text-[var(--ink-3)]">Nhập từ khóa, có dấu hoặc không dấu đều được.</p>;
  const { data } = await createPublicClient().schema("content").rpc("search_public", { p_query: q });
  const rows = (data ?? []) as { kind: string; title: string; url: string; excerpt: string }[];
  return rows.length === 0 ? <p className="mt-6">Không có kết quả cho “{q}”.</p> : (
    <ul className="mt-6 flex flex-col gap-4">
      {rows.map((r) => <li key={r.url}><p className="text-xs text-[var(--ink-3)]">{KIND[r.kind]}</p><Link href={r.url} className="font-semibold underline">{r.title}</Link><p className="text-sm text-[var(--ink-2)]">{r.excerpt.slice(0, 180)}</p></li>)}
    </ul>
  );
}

export default function SearchPage(props: PageProps<"/tim-kiem">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Tìm kiếm</h1>
      <form role="search" className="mt-4 flex gap-2"><label className="sr-only" htmlFor="q">Từ khóa</label><input id="q" name="q" maxLength={100} className="min-h-11 flex-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3" /><button className="min-h-11 rounded-md bg-[var(--accent)] px-5 font-semibold text-[var(--on-accent)]">Tìm</button></form>
      <Suspense fallback={<p className="mt-6">Đang tìm...</p>}><Results searchParams={props.searchParams} /></Suspense>
    </div>
  );
}
