import { StatusBadge } from "@zsopo/ui";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { createCommonTask } from "@/features/housekeeping/actions";
import { fmtTime } from "@/features/ops/day";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Lịch dọn" };

export default async function CleaningSchedule() {
  const ctx = await getStaffContext("/ops/lich-don");
  await requirePermission("housekeeping.read", ctx.location.entity_id, ctx.location.id, "/ops/lich-don");
  const db = await createClient();
  const [{ data: refused }, { data: tpl }] = await Promise.all([
    db.schema("stay").from("housekeeping_tasks").select("id, room_id, refused_reason, reschedule_at, updated_at").eq("location_id", ctx.location.id).eq("state", "refused").order("updated_at", { ascending: false }).limit(20),
    db.schema("stay").from("checklist_templates").select("items").eq("kind", "common_area").eq("active", true).maybeSingle(),
  ]);
  const areas = [...new Set(((tpl?.items ?? []) as { group: string }[]).map((i) => i.group))];
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Lịch dọn (BP02, BP04)</h1>
      <section className="mt-4">
        <h2 className="font-semibold">Phòng đang ở: khách từ chối hoặc DND</h2>
        <p className="text-sm text-[var(--ink-2)]">Không vào phòng khi khách chưa đồng ý. Lịch hẹn lại tạo việc mới.</p>
        <ul className="mt-2 text-sm">{(refused ?? []).map((r) => <li key={r.id}><StatusBadge>Từ chối</StatusBadge> {r.refused_reason} {r.reschedule_at ? `· hẹn ${fmtTime(r.reschedule_at)}` : ""}</li>)}</ul>
      </section>
      <section className="mt-6">
        <h2 className="font-semibold">Khu chung theo ngày/tuần/tháng</h2>
        <p className="text-sm text-[var(--ink-2)]">Khu không có tại điểm thì đánh “Không áp dụng” kèm lý do trong checklist.</p>
        <ActionForm action={createCommonTask} submit="Tạo việc khu chung hôm nay" className="mt-2 flex flex-wrap items-end gap-2">
          <input type="hidden" name="locationId" value={ctx.location.id} />
          <Field label="Khu vực"><select name="area" className={inputCls}>{areas.map((a) => <option key={a} value={a}>{a}</option>)}<option value="Toàn bộ khu chung">Toàn bộ khu chung</option></select></Field>
        </ActionForm>
      </section>
    </main>
  );
}
