import { StatusBadge } from "@zsopo/ui";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { createTicket, moveTicket } from "@/features/ops/actions";
import { fmtTime } from "@/features/ops/day";
import { LiveRefresh } from "@/features/ops/live-refresh";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Sự cố (BM04)" };

const NEXT: Record<string, [string, string][]> = {
  open: [["in_progress", "Bắt đầu xử lý"], ["resolved", "Đã xử lý"]],
  assigned: [["in_progress", "Bắt đầu xử lý"], ["resolved", "Đã xử lý"]],
  in_progress: [["resolved", "Đã xử lý"]],
  resolved: [["closed", "Đóng (khách xác nhận)"], ["in_progress", "Mở lại"]],
};

export default async function Tickets() {
  const ctx = await getStaffContext("/ops/tickets");
  await requirePermission("ticket.manage", ctx.location.entity_id, ctx.location.id, "/ops/tickets");
  const db = await createClient();
  const [{ data: tickets }, { data: rooms }] = await Promise.all([
    db.schema("stay").from("tickets").select("*").eq("location_id", ctx.location.id).neq("state", "closed").order("sla_due_at"),
    db.schema("stay").from("rooms").select("id, code, name").eq("location_id", ctx.location.id).order("sort"),
  ]);
  const room = new Map((rooms ?? []).map((r) => [r.id, `${r.code} ${r.name}`]));
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Sự cố (BM04)</h1><LiveRefresh schema="stay" table="tickets" filter={`location_id=eq.${ctx.location.id}`} /></div>
      <ActionForm action={createTicket} submit="Tạo sự cố" className="mt-4 grid gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-2">
        <input type="hidden" name="locationId" value={ctx.location.id} />
        <Field label="Tiêu đề"><input name="title" required className={inputCls} /></Field>
        <Field label="Phòng"><select name="roomId" className={inputCls}><option value="">Khu chung</option>{(rooms ?? []).map((r) => <option key={r.id} value={r.id}>{r.code} {r.name}</option>)}</select></Field>
        <Field label="Loại"><select name="kind" className={inputCls}><option value="maintenance">Hỏng hóc</option><option value="complaint">Phàn nàn</option><option value="request">Yêu cầu</option><option value="safety">An toàn</option><option value="other">Khác</option></select></Field>
        <Field label="Ưu tiên"><select name="priority" className={inputCls} defaultValue="normal"><option value="low">Thấp</option><option value="normal">Bình thường</option><option value="high">Cao</option><option value="critical">Nguy hiểm</option></select></Field>
        <Field label="Mô tả"><textarea name="description" className={`${inputCls} py-2`} /></Field>
      </ActionForm>
      <ul className="mt-6 flex flex-col gap-3">
        {(tickets ?? []).map((t) => {
          const escalated = ["open", "assigned"].includes(t.state) && !!t.escalated_at; // set by SLA cron (15 min) or critical/safety at creation
          return (
            <li key={t.id} className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{t.title}</span>
                <StatusBadge tone={t.priority === "critical" ? "danger" : t.priority === "high" ? "warning" : "neutral"}>{t.priority}</StatusBadge>
                <StatusBadge>{t.state}</StatusBadge>
                {escalated && <StatusBadge tone="danger">Đã báo người trực</StatusBadge>}
                <span className="text-xs text-[var(--ink-3)]">{t.room_id ? room.get(t.room_id) : "Khu chung"} · hạn {fmtTime(t.sla_due_at)}</span>
              </div>
              {t.description && <p className="mt-1 text-sm">{t.description}</p>}
              {t.resolution && <p className="mt-1 text-sm">Kết quả: {t.resolution}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {(NEXT[t.state] ?? []).map(([to, label]) => (
                  <ActionForm key={to} action={moveTicket} submit={label}>
                    <input type="hidden" name="ticketId" value={t.id} /><input type="hidden" name="version" value={t.version} /><input type="hidden" name="to" value={to} />
                    {(to === "resolved" || to === "closed") && <Field label="Kết quả"><input name="note" required className={`${inputCls} w-48`} /></Field>}
                  </ActionForm>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
