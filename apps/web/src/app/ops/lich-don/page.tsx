import { StatusBadge } from "@zsopo/ui";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { createCommonTask, setCommonScheduleAction } from "@/features/housekeeping/actions";
import { fmtTime } from "@/features/ops/day";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Lịch dọn" };

const ISO_DAY = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const FREQ = { daily: "Hằng ngày", weekly: "Hằng tuần", monthly: "Hằng tháng" } as const;

export default async function CleaningSchedule() {
  const ctx = await getStaffContext("/ops/lich-don");
  await requirePermission("housekeeping.read", ctx.location.entity_id, ctx.location.id, "/ops/lich-don");
  const db = await createClient();
  const [{ data: refused }, { data: tpl }, { data: schedules }, { data: canManage }] = await Promise.all([
    db.schema("stay").from("housekeeping_tasks").select("id, room_id, refused_reason, reschedule_at, updated_at").eq("location_id", ctx.location.id).eq("state", "refused").order("updated_at", { ascending: false }).limit(20),
    db.schema("stay").from("checklist_templates").select("items").eq("kind", "common_area").eq("active", true).maybeSingle(),
    db.schema("stay").from("common_area_schedules").select("area, frequency, day, active").eq("location_id", ctx.location.id).order("area"),
    db.schema("core").rpc("has_permission", { p_action: "sop.manage", p_entity: ctx.location.entity_id, p_location: ctx.location.id }),
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
        <h3 className="mt-4 text-sm font-semibold">Lịch khu chung</h3>
        <p className="text-sm text-[var(--ink-2)]">Hệ thống tự tạo việc lúc 00:05 mỗi ngày cho khu đến hạn, hạn hoàn thành 10:00.</p>
        <ul className="mt-2 text-sm">
          {(schedules ?? []).map((s) => (
            <li key={s.area}>
              {s.area}: {s.frequency ? FREQ[s.frequency as keyof typeof FREQ] : ""}
              {s.frequency === "weekly" && s.day ? `, ${ISO_DAY[s.day - 1]}` : ""}
              {s.frequency === "monthly" ? `, ngày ${s.day}` : ""} {!s.active && <StatusBadge>Đã tắt</StatusBadge>}
            </li>
          ))}
          {!schedules?.length && <li className="text-[var(--ink-2)]">Chưa có lịch nào.</li>}
        </ul>
        {canManage && (
          <ActionForm action={setCommonScheduleAction} submit="Lưu lịch" className="mt-2 flex flex-wrap items-end gap-2">
            <input type="hidden" name="locationId" value={ctx.location.id} />
            <Field label="Khu vực"><select name="area" className={inputCls}>{areas.map((a) => <option key={a} value={a}>{a}</option>)}<option value="Toàn bộ khu chung">Toàn bộ khu chung</option></select></Field>
            <Field label="Tần suất">
              <select name="frequency" defaultValue="daily" className={inputCls}>
                <option value="daily">Hằng ngày</option><option value="weekly">Hằng tuần</option><option value="monthly">Hằng tháng</option><option value="off">Tắt lịch</option>
              </select>
            </Field>
            <Field label="Thứ (hằng tuần)"><select name="weekday" className={inputCls}>{ISO_DAY.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select></Field>
            <Field label="Ngày trong tháng (1-28)"><input name="monthday" type="number" min={1} max={28} defaultValue={1} className={`${inputCls} w-24`} /></Field>
          </ActionForm>
        )}
      </section>
    </main>
  );
}
