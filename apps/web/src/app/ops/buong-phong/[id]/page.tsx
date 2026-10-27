import { ActionForm, Field, inputCls } from "@/components/action-form";
import { refuseService, submitInspection } from "@/features/housekeeping/actions";
import { OfflineChecklist } from "@/features/housekeeping/offline-checklist";
import { loadTask } from "@/features/housekeeping/data";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";

export const instant = false;
export const metadata = { title: "Checklist dọn phòng" };

export default async function TaskPage({ params }: PageProps<"/ops/buong-phong/[id]">) {
  const { id } = await params;
  const ctx = await getStaffContext(`/ops/buong-phong/${id}`);
  await requirePermission("housekeeping.work", ctx.location.entity_id, ctx.location.id, `/ops/buong-phong/${id}`);
  const { task, tpl, items, saved, room } = await loadTask(id);
  const editable = ["pending", "in_progress", "rework"].includes(task.state);
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-semibold">{room ? `${room.code} ${room.name}` : `Khu chung ${task.area_code}`}</h1>
      <p className="text-sm text-[var(--ink-2)]">{tpl?.title} · mẫu phiên bản {tpl?.version} · trạng thái {task.state}</p>
      {task.state === "rework" && task.inspection_notes && <p className="mt-2 rounded-md bg-[var(--danger-soft)] p-2 text-sm">Cần làm lại: {task.inspection_notes}</p>}
      {task.kind === "stayover" && editable && (
        <ActionForm action={refuseService} submit="Khách từ chối / DND" danger className="mt-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="taskId" value={task.id} />
          <Field label="Lý do"><input name="reason" required className={inputCls} /></Field>
          <Field label="Hẹn lại lúc"><input name="rescheduleAt" type="datetime-local" className={inputCls} /></Field>
        </ActionForm>
      )}
      <div className="mt-6">{editable ? <OfflineChecklist userId={ctx.actor.userId} locationId={ctx.location.id} entityId={ctx.location.entity_id} taskId={task.id} version={task.version} items={items} saved={saved} /> : <p>Việc không còn ở trạng thái làm được.</p>}</div>
      {editable && (
        <ActionForm action={submitInspection} submit="Hoàn tất tự kiểm (BM02), gửi nghiệm thu" className="mt-6">
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="version" value={task.version} />
        </ActionForm>
      )}
    </main>
  );
}
