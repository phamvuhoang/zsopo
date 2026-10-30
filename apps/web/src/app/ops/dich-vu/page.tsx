import { StatusBadge } from "@zsopo/ui";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { LiveRefresh } from "@/features/ops/live-refresh";
import { transitionServiceAction } from "@/features/stay/service-actions";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Dịch vụ" };

const NEXT = { requested: ["accepted", "Nhận yêu cầu"], accepted: ["in_progress", "Bắt đầu phục vụ"], in_progress: ["completed", "Hoàn tất"] } as const;
const LABEL = { requested: "Mới", accepted: "Đã nhận", in_progress: "Đang phục vụ" } as const;

export default async function OpsServices() {
  const ctx = await getStaffContext("/ops/dich-vu");
  await requirePermission("service.manage", ctx.location.entity_id, ctx.location.id, "/ops/dich-vu");
  const db = await createClient();
  const { data: reqs } = await db.schema("stay").from("service_requests")
    .select("id, state, qty, scheduled_at, source, notes, version, service_id, booking_id")
    .eq("location_id", ctx.location.id).in("state", ["requested", "accepted", "in_progress"]).order("scheduled_at");
  const [{ data: services }, { data: bookings }] = await Promise.all([
    db.schema("stay").from("services").select("id, name").eq("location_id", ctx.location.id),
    db.schema("stay").from("bookings").select("id, state, room_id").in("id", (reqs ?? []).map((r) => r.booking_id)),
  ]);
  const { data: rooms } = await db.schema("stay").from("rooms").select("id, code, name").eq("location_id", ctx.location.id);
  const svc = new Map((services ?? []).map((s) => [s.id, s.name]));
  const booking = new Map((bookings ?? []).map((b) => [b.id, b]));
  const room = new Map((rooms ?? []).map((r) => [r.id, `${r.code} ${r.name}`]));
  // Prebook requests of held/expired bookings are not actionable yet.
  const visible = (reqs ?? []).filter((r) => ["confirmed", "checked_in"].includes(booking.get(r.booking_id)?.state ?? ""));
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Yêu cầu dịch vụ</h1>
        <LiveRefresh schema="stay" table="service_requests" filter={`location_id=eq.${ctx.location.id}`} />
      </div>
      {visible.length === 0 && <p className="mt-6 text-[var(--ink-3)]">Không có yêu cầu đang mở.</p>}
      <ul className="mt-4 flex flex-col gap-3">
        {visible.map((r) => {
          const next = NEXT[r.state as keyof typeof NEXT];
          const b = booking.get(r.booking_id);
          return (
            <li key={r.id} className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{svc.get(r.service_id)} x{r.qty}</span>
                <span className="text-sm">Phòng {b ? room.get(b.room_id) : ""}</span>
                <span className="text-sm text-[var(--ink-2)]">{new Date(r.scheduled_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</span>
                <StatusBadge tone={r.state === "requested" ? "warning" : "info"}>{LABEL[r.state as keyof typeof LABEL]}</StatusBadge>
                {r.source === "prebook" && <StatusBadge>Đặt trước</StatusBadge>}
              </div>
              {r.notes && <p className="mt-1 text-sm">Ghi chú: {r.notes}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionForm action={transitionServiceAction} submit={next[1]}>
                  <input type="hidden" name="requestId" value={r.id} />
                  <input type="hidden" name="version" value={r.version} />
                  <input type="hidden" name="to" value={next[0]} />
                </ActionForm>
                <ActionForm action={transitionServiceAction} submit="Hủy" danger>
                  <input type="hidden" name="requestId" value={r.id} />
                  <input type="hidden" name="version" value={r.version} />
                  <input type="hidden" name="to" value="cancelled" />
                  <Field label="Lý do hủy"><input name="note" required className={`${inputCls} w-48`} /></Field>
                </ActionForm>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
