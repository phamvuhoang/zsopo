import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Nhật ký kiểm soát" };

export default async function AuditPage() {
  const ctx = await getStaffContext("/admin/audit");
  await requirePermission("audit.read", ctx.location.entity_id, null, "/admin/audit");
  const { data } = await (await createClient()).schema("core").from("audit_logs").select("id, actor_id, action, subject_type, subject_id, reason, diff, created_at").order("id", { ascending: false }).limit(200);
  return (
    <>
      <h1 className="text-2xl font-semibold">Nhật ký kiểm soát</h1>
      <p className="text-sm text-[var(--ink-2)]">Chỉ ghi thêm. Dữ liệu cá nhân trong thay đổi đã được che.</p>
      <table className="mt-3 w-full text-left text-xs">
        <thead><tr className="border-b border-[var(--line)]"><th className="py-2">Thời gian</th><th>Hành động</th><th>Đối tượng</th><th>Lý do</th><th>Thay đổi</th></tr></thead>
        <tbody>{(data ?? []).map((a) => <tr key={a.id} className="border-b border-[var(--line)] align-top"><td className="py-1 whitespace-nowrap">{new Date(a.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</td><td className="font-mono">{a.action}</td><td>{a.subject_type} {a.subject_id?.slice(0, 8)}</td><td>{a.reason}</td><td className="max-w-72 font-mono break-all">{JSON.stringify(a.diff).slice(0, 200)}</td></tr>)}</tbody>
      </table>
    </>
  );
}
