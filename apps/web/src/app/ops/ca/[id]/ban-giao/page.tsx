import { Price } from "@zsopo/ui";
import { notFound } from "next/navigation";
import { getStaffContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "BM01 bàn giao ca" };

export default async function Bm01({ params }: PageProps<"/ops/ca/[id]/ban-giao">) {
  const { id } = await params;
  const ctx = await getStaffContext(`/ops/ca/${id}/ban-giao`);
  const db = await createClient();
  const { data: s } = await db.schema("stay").from("shifts").select("*").eq("id", id).maybeSingle();
  if (!s || !s.snapshot) notFound();
  const snap = s.snapshot as Record<string, string | number | boolean>;
  const { data: amendments } = await db.schema("stay").from("shift_amendments").select("note, amount_delta, created_at").eq("shift_id", id);
  return (
    <main className="mx-auto max-w-2xl px-4 py-6 print:p-0">
      <h1 className="text-2xl font-semibold">BM01 · Biên bản bàn giao ca</h1>
      <p className="text-sm">{ctx.location.name} · mẫu phiên bản {String(snap.template_version)}</p>
      <dl className="mt-4 grid grid-cols-2 gap-1 text-sm">
        <dt>Tiền đầu ca</dt><dd><Price value={String(snap.opening)} /></dd>
        <dt>Thu tiền mặt</dt><dd><Price value={String(snap.receipts)} /></dd>
        <dt>Chi</dt><dd><Price value={String(snap.expenses)} /></dd>
        <dt>Nộp quỹ</dt><dd><Price value={String(snap.remitted)} /></dd>
        <dt className="font-semibold">Dự kiến</dt><dd className="font-semibold"><Price value={String(snap.expected)} /></dd>
        <dt>Thực đếm</dt><dd><Price value={String(snap.counted)} /></dd>
        <dt>Chênh lệch</dt><dd><Price value={String(snap.variance)} /></dd>
        <dt>Giải trình</dt><dd>{String(snap.notes ?? "")}</dd>
        <dt>Việc dọn còn tồn</dt><dd>{String(snap.open_tasks)}</dd>
        <dt>Sự cố còn mở</dt><dd>{String(snap.open_tickets)}</dd>
      </dl>
      <p className="mt-3 text-xs">Tiền chuyển khoản/OTA không tính vào két. Xác nhận điện tử bằng tài khoản, thời gian và mã băm nội dung; không phải chữ ký số có chứng thư.</p>
      <p className="mt-2 text-sm">Bàn giao: {String(snap.handed_over_at)} · Nhận: {s.receiver_ack_at ?? "chưa xác nhận"}</p>
      {s.content_hash && <p className="font-mono text-xs break-all">Mã băm: {s.content_hash}</p>}
      {s.needs_manager_review && <p className="mt-2 text-sm text-[var(--warning)]">Cần quản lý kiểm tra lại (kiêm nhiệm hoặc có chênh lệch).</p>}
      {(amendments ?? []).length > 0 && (
        <section className="mt-4"><h2 className="font-semibold">Điều chỉnh</h2>
          <ul className="text-sm">{(amendments ?? []).map((a, i) => <li key={i}>{a.created_at}: {a.note} (<Price value={String(a.amount_delta)} />)</li>)}</ul>
        </section>
      )}
    </main>
  );
}
