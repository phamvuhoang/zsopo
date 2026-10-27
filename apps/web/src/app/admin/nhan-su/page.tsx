import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { ROLE_LABEL } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { InviteForm, StaffRowActions } from "./staff-forms";

export const instant = false;
export const metadata = { title: "Nhân sự" };

export default async function StaffPage() {
  const ctx = await getStaffContext("/admin/nhan-su");
  await requirePermission("staff.manage", ctx.location.entity_id, ctx.location.id, "/admin/nhan-su");
  const supabase = await createClient();
  const { data: staff } = await supabase.schema("core").rpc("staff_directory");
  return (
    <>
      <h1 className="text-2xl font-semibold">Nhân sự</h1>
      <p className="mt-1 text-sm text-[var(--ink-2)]">Phạm vi: {ctx.location.name}. Mọi thao tác được ghi nhật ký kiểm soát.</p>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Mời nhân sự</h2>
        <InviteForm entityId={ctx.location.entity_id} locationId={ctx.location.id} />
      </section>
      <section className="mt-8 overflow-x-auto">
        <h2 className="text-lg font-semibold">Danh sách</h2>
        <table className="mt-3 w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)]">
              <th className="py-2">Nhân sự</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {(staff ?? []).map((s) => (
              <tr key={s.user_id} className="border-b border-[var(--line)] align-top">
                <td className="py-2">
                  {s.display_name}
                  <div className="text-xs text-[var(--ink-3)]">{s.email}</div>
                </td>
                <td>
                  {(s.roles as { id: string; role: string }[]).map((r) => (
                    <div key={r.id}>{ROLE_LABEL[r.role] ?? r.role}</div>
                  ))}
                </td>
                <td>{s.disabled_at ? "Đã vô hiệu hóa" : "Đang hoạt động"}</td>
                <td>{s.user_id !== ctx.actor.userId && !s.disabled_at && <StaffRowActions userId={s.user_id} roles={s.roles as { id: string; role: string }[]} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
