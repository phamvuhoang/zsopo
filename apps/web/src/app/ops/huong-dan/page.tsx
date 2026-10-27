import Link from "next/link";
import { getStaffContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Hướng dẫn và SOP" };

export default async function Guide() {
  const ctx = await getStaffContext("/ops/huong-dan");
  const db = await createClient();
  const { data: tpls } = await db.schema("stay").from("checklist_templates").select("kind, version, title").eq("active", true);
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Hướng dẫn trực</h1>
      <p className="text-sm text-[var(--ink-2)]">{ctx.location.name}. Trang này đọc được khi mất mạng nếu đã mở trước đó.</p>
      <section className="mt-4">
        <h2 className="font-semibold">Khẩn cấp</h2>
        <ul className="text-sm"><li>Cứu hỏa: 114 · Cấp cứu: 115 · Công an: 113</li><li>Số người trực điểm: cấu hình bởi quản lý (chưa có số đã duyệt).</li><li>Sự cố nguy hiểm: tạo sự cố mức Nguy hiểm để báo người trực ngay.</li></ul>
      </section>
      <section className="mt-4">
        <h2 className="font-semibold">Quy trình đang áp dụng</h2>
        <ul className="text-sm">{(tpls ?? []).map((t) => <li key={t.kind}>{t.title} (phiên bản {t.version})</li>)}</ul>
        <ul className="mt-2 text-sm"><li>LT01-LT05: đặt phòng thủ công, nhận phòng, sự cố, trả phòng, bàn giao ca BM01.</li><li>BP01-BP05: dọn phòng trả, phòng đang ở, đồ vải, khu chung, tự kiểm BM02 và nghiệm thu BM03.</li></ul>
      </section>
      <p className="mt-4 text-sm"><Link href="/chinh-sach/noi-quy" className="underline">Nội quy lưu trú</Link></p>
    </main>
  );
}
