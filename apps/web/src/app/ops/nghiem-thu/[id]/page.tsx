import { StatusBadge } from "@zsopo/ui";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { approveInspection } from "@/features/housekeeping/actions";
import { loadTask } from "@/features/housekeeping/data";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";

export const instant = false;
export const metadata = { title: "Nghiệm thu BM03" };

export default async function InspectionPage({ params }: PageProps<"/ops/nghiem-thu/[id]">) {
  const { id } = await params;
  const ctx = await getStaffContext(`/ops/nghiem-thu/${id}`);
  await requirePermission("inspection.approve", ctx.location.entity_id, ctx.location.id, `/ops/nghiem-thu/${id}`);
  const { task, items, saved, room } = await loadTask(id);
  const fails = items.filter((i) => saved[i.code]?.result === "fail");
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Nghiệm thu BM03 · {room ? `${room.code} ${room.name}` : task.area_code}</h1>
      <p className="text-sm">Chỉ nghiệm thu khi đang trực tuyến. Phòng chỉ sẵn sàng bán khi đạt.</p>
      <ul className="mt-4 flex flex-col gap-1 text-sm">
        {items.map((i) => (
          <li key={i.code} className="flex justify-between gap-2 border-b border-[var(--line)] py-1">
            <span>{i.group} · {i.label}</span>
            <StatusBadge tone={saved[i.code]?.result === "fail" ? "danger" : saved[i.code]?.result === "pass" ? "success" : "neutral"}>{saved[i.code]?.result ?? "chưa kiểm"}{saved[i.code]?.note ? `: ${saved[i.code]!.note}` : ""}</StatusBadge>
          </li>
        ))}
      </ul>
      {task.state === "awaiting_inspection" ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <ActionForm action={approveInspection} submit="Đạt, phòng sẵn sàng" className="flex flex-col gap-2">
            <input type="hidden" name="taskId" value={task.id} /><input type="hidden" name="version" value={task.version} /><input type="hidden" name="approved" value="true" />
            <Field label="Ghi chú (bắt buộc nếu tự nghiệm thu)"><input name="notes" className={inputCls} /></Field>
            {fails.length > 0 && <p className="text-xs text-[var(--danger)]">BM02 còn {fails.length} mục không đạt: không thể nghiệm thu đạt.</p>}
          </ActionForm>
          <ActionForm action={approveInspection} submit="Không đạt, yêu cầu làm lại" danger className="flex flex-col gap-2">
            <input type="hidden" name="taskId" value={task.id} /><input type="hidden" name="version" value={task.version} /><input type="hidden" name="approved" value="false" />
            <Field label="Lý do / việc cần khắc phục"><input name="notes" required className={inputCls} /></Field>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="safety" /> Lỗi an toàn: khóa bán phòng</label>
          </ActionForm>
        </div>
      ) : <p className="mt-6">Việc không ở trạng thái chờ nghiệm thu ({task.state}).</p>}
    </main>
  );
}
