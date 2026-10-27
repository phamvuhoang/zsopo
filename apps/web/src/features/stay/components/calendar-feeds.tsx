import { StatusBadge } from "@zsopo/ui";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { createClient } from "@/lib/supabase/server";
import { addFeed, resolveConflict, rotateExport } from "../calendar-actions";

const fmt = (t: string | null) => (t ? new Date(t).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "chưa có");
const PROVIDERS = { airbnb: "Airbnb", booking: "Booking.com", agoda: "Agoda", expedia: "Expedia", other: "Khác" } as const;

/** OTA connections: import status (eventual consistency), export link rotation, open conflicts. */
export async function CalendarFeeds({ locationId, rooms }: { locationId: string; rooms: { id: string; code: string; name: string }[] }) {
  const db = await createClient();
  const [{ data: feeds }, { data: conflicts }] = await Promise.all([
    db.schema("stay").from("calendar_feeds").select("id, room_id, provider, export_token_hint, last_success_at, last_attempt_at, consecutive_failures, last_error, active").eq("location_id", locationId),
    db.schema("stay").from("calendar_conflicts").select("id, room_id, booking_id, night, detected_at").eq("location_id", locationId).eq("status", "open").order("night"),
  ]);
  const roomName = new Map(rooms.map((r) => [r.id, `${r.code} ${r.name}`]));
  return (
    <section className="mt-10" aria-labelledby="ota">
      <h2 id="ota" className="text-lg font-semibold">Đồng bộ lịch OTA (iCal)</h2>
      <p className="mt-1 text-sm text-[var(--ink-2)]">Lịch OTA cập nhật mỗi 15 phút, không tức thời: vẫn có thể trùng phòng trong khoảng giữa hai lần đồng bộ. Khi trùng, hệ thống giữ cả hai bằng chứng và báo xung đột; xử lý theo runbook đồng bộ OTA.</p>
      {(conflicts ?? []).length > 0 && (
        <div className="mt-3 rounded-md border border-[var(--danger)] bg-[var(--danger-soft)] p-3">
          <h3 className="font-semibold text-[var(--danger)]">Xung đột cần xử lý</h3>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {(conflicts ?? []).map((c) => (
              <li key={c.id} className="flex flex-wrap items-end gap-2">
                <span>{roomName.get(c.room_id)} · đêm {c.night}</span>
                <ActionForm action={resolveConflict} submit="Đã xử lý">
                  <input type="hidden" name="conflictId" value={c.id} />
                  <Field label="Cách xử lý"><input name="resolution" required placeholder="VD: Chuyển khách OTA sang P05" className={`${inputCls} w-64`} /></Field>
                </ActionForm>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {(feeds ?? []).length === 0 && <li className="text-[var(--ink-3)]">Chưa có kết nối OTA nào.</li>}
        {(feeds ?? []).map((f) => (
          <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--line)] p-3">
            <span className="font-semibold">{roomName.get(f.room_id)}</span>
            <span>{PROVIDERS[f.provider as keyof typeof PROVIDERS]}</span>
            {f.consecutive_failures >= 2 ? <StatusBadge tone="danger">Lỗi {f.consecutive_failures} lần liên tiếp</StatusBadge> : f.consecutive_failures === 1 ? <StatusBadge tone="warning">Lỗi lần gần nhất</StatusBadge> : <StatusBadge tone="success">Ổn định</StatusBadge>}
            <span className="text-[var(--ink-3)]">Thành công gần nhất: {fmt(f.last_success_at)}</span>
            {f.last_error && <span className="text-xs text-[var(--danger)]">{f.last_error}</span>}
            <ActionForm action={rotateExport} submit={f.export_token_hint ? "Xoay link xuất" : "Tạo link xuất"}>
              <input type="hidden" name="feedId" value={f.id} />
            </ActionForm>
          </li>
        ))}
      </ul>
      <ActionForm action={addFeed} submit="Thêm kết nối" className="mt-4 flex flex-wrap items-end gap-2">
        <Field label="Phòng"><select name="roomId" className={inputCls}>{rooms.map((r) => <option key={r.id} value={r.id}>{r.code} {r.name}</option>)}</select></Field>
        <Field label="Kênh"><select name="provider" className={inputCls}>{Object.entries(PROVIDERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Link iCal nhập (https, chỉ ghi)"><input name="importUrl" type="url" className={`${inputCls} w-80`} /></Field>
      </ActionForm>
    </section>
  );
}
