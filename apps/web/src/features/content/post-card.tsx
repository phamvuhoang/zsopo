import Link from "next/link";
import type { PostCard } from "./queries";

export const fmtDate = (d: string) => new Date(d).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

export function PostTile({ p }: { p: PostCard }) {
  return (
    <li className="relative rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5">
      <h3 className="font-display text-lg font-semibold"><Link href={`/blog/${p.slug}`} className="after:absolute after:inset-0 hover:underline">{p.title}</Link></h3>
      <p className="mt-2 text-sm text-[var(--ink-2)]">{p.excerpt}</p>
      <p className="mt-3 text-xs text-[var(--ink-3)]">{fmtDate(p.published_at)} · {p.reading_minutes} phút đọc</p>
    </li>
  );
}
