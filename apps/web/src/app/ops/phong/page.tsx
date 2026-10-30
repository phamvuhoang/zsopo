import { deriveRoomStatus, type Sale } from "@zsopo/core";
import { StatusBadge, type Tone } from "@zsopo/ui";
import Link from "next/link";
import { addDays, coversNight, todayVn } from "@/features/ops/day";
import { LiveRefresh } from "@/features/ops/live-refresh";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Sơ đồ phòng" };

const SALE: Record<string, Sale> = { hold: "held", booking: "booked", ota: "ota", maintenance: "maintenance" };
const TONE: Record<string, Tone> = { "Trống sạch": "success", "Trống bẩn": "warning", "Đang dọn": "info", "Chờ nghiệm thu": "accent", "Đang có khách": "neutral", "Đã đặt": "info", "Bảo trì": "danger" };
const CELL: Record<string, string> = { hold: "bg-[var(--warning-soft)]", booking: "bg-[var(--accent-soft)]", ota: "bg-[var(--info-soft)]", maintenance: "bg-[var(--danger-soft)]" };

export default async function RoomBoard() {
  const ctx = await getStaffContext("/ops/phong");
  await requirePermission("room.read", ctx.location.entity_id, ctx.location.id, "/ops/phong");
  const db = await createClient();
  const today = todayVn();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const [{ data: rooms }, { data: allocs }] = await Promise.all([
    db.schema("stay").from("rooms").select("id, code, name, sellable, cleanliness, occupancy, safety_block, status").eq("location_id", ctx.location.id).eq("status", "published").order("sort"),
    db.schema("stay").from("room_allocations").select("room_id, kind, occupied_range, source_id").eq("location_id", ctx.location.id).eq("active", true),
  ]);
  const at = (roomId: string, d: string) => (allocs ?? []).find((a) => a.room_id === roomId && coversNight(String(a.occupied_range), d));
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sơ đồ phòng hôm nay</h1>
        <LiveRefresh schema="stay" table="rooms" filter={`location_id=eq.${ctx.location.id}`} />
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(rooms ?? []).map((r) => {
          const a = at(r.id, today);
          const status = deriveRoomStatus({ cleanliness: r.cleanliness as "ready", occupancy: r.occupancy as "vacant", sale: a ? SALE[a.kind]! : "available", safetyBlock: r.safety_block });
          return (
            <li key={r.id} className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3">
              <div className="flex justify-between gap-2">
                <span className="font-semibold">{r.code} {r.name}</span>
                <StatusBadge tone={TONE[status] ?? "neutral"}>{status}</StatusBadge>
              </div>
              <p className="mt-1 text-xs text-[var(--ink-3)]">Vệ sinh: {r.cleanliness} · Có khách: {r.occupancy} · Bán: {a ? SALE[a.kind] : r.sellable ? "available" : "không bán"}</p>
              {a && (a.kind === "booking" || a.kind === "hold") && <Link href={`/ops/dat-phong/${a.source_id}`} className="text-sm underline">Xem đặt phòng</Link>}
            </li>
          );
        })}
      </ul>
      <h2 className="mt-8 text-lg font-semibold">7 đêm tới</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[720px] text-center text-xs">
          <thead><tr><th className="text-left">Phòng</th>{days.map((d) => <th key={d} className="py-1">{d.slice(8)}/{d.slice(5, 7)}</th>)}</tr></thead>
          <tbody>
            {(rooms ?? []).map((r) => (
              <tr key={r.id} className="border-t border-[var(--line)]">
                <td className="py-1 text-left whitespace-nowrap">{r.code} {r.name}</td>
                {days.map((d) => {
                  const a = at(r.id, d);
                  return <td key={d} className={`py-2 ${a ? CELL[a.kind] : r.sellable ? "" : "bg-[var(--surface-2)]"}`}>{a ? { hold: "Giữ", booking: "Đặt", ota: "OTA", maintenance: "BT" }[a.kind] : r.sellable ? "" : "-"}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-[var(--ink-3)]">Giữ: đang chờ cọc · Đặt: đã xác nhận · OTA: lịch kênh ngoài (đồng bộ 15 phút) · BT: bảo trì/khóa lịch · -: phòng không bán.</p>
      </div>
    </main>
  );
}
