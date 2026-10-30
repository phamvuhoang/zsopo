import { StatusBadge } from "@zsopo/ui";
import Link from "next/link";
import { fmtTime } from "@/features/ops/day";
import { LiveRefresh } from "@/features/ops/live-refresh";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Buồng phòng" };

const LABEL: Record<string, string> = { pending: "Chưa dọn", in_progress: "Đang dọn", awaiting_inspection: "Chờ nghiệm thu", rework: "Làm lại", approved: "Đạt", refused: "Khách từ chối" };
const KIND: Record<string, string> = { checkout: "Khách trả", stayover: "Đang ở", common: "Khu chung", rework: "Làm lại" };

export default async function HousekeepingTasks() {
  const ctx = await getStaffContext("/ops/buong-phong");
  await requirePermission("housekeeping.read", ctx.location.entity_id, ctx.location.id, "/ops/buong-phong");
  const db = await createClient();
  const [{ data: tasks }, { data: rooms }] = await Promise.all([
    db.schema("stay").from("housekeeping_tasks").select("id, room_id, area_code, kind, state, priority, due_at, assigned_to").eq("location_id", ctx.location.id)
      .in("state", ["pending", "in_progress", "awaiting_inspection", "rework"]).order("priority").order("due_at"),
    db.schema("stay").from("rooms").select("id, code, name").eq("location_id", ctx.location.id),
  ]);
  const room = new Map((rooms ?? []).map((r) => [r.id, `${r.code} ${r.name}`]));
  const canInspect = ctx.roles.some((r) => r.role === "location_manager" || r.role === "super_admin");
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Việc buồng phòng</h1><LiveRefresh schema="stay" table="housekeeping_tasks" filter={`location_id=eq.${ctx.location.id}`} /></div>
      {(tasks ?? []).length === 0 && <p className="mt-6 text-[var(--ink-3)]">Không có việc tồn.</p>}
      <ul className="mt-4 flex flex-col gap-2">
        {(tasks ?? []).map((t) => (
          <li key={t.id}>
            <Link href={t.state === "awaiting_inspection" && canInspect ? `/ops/nghiem-thu/${t.id}` : `/ops/buong-phong/${t.id}`}
              className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 hover:bg-[var(--surface-2)]">
              <span className="font-semibold">{t.room_id ? room.get(t.room_id) : `Khu chung: ${t.area_code}`}</span>
              <StatusBadge>{KIND[t.kind]}</StatusBadge>
              <StatusBadge tone={t.state === "awaiting_inspection" ? "accent" : t.state === "rework" ? "danger" : "warning"}>{LABEL[t.state]}</StatusBadge>
              {t.due_at && <span className="text-xs text-[var(--ink-3)]">hạn {fmtTime(t.due_at)}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
