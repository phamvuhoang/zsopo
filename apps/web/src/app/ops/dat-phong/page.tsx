import { StatusBadge } from "@zsopo/ui";
import Link from "next/link";
import { addDays, todayVn } from "@/features/ops/day";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Đặt phòng" };

export default async function BookingsList() {
  const ctx = await getStaffContext("/ops/dat-phong");
  await requirePermission("booking.read", ctx.location.entity_id, ctx.location.id, "/ops/dat-phong");
  const db = await createClient();
  const today = todayVn();
  const { data: bookings } = await db.schema("stay").from("bookings")
    .select("id, state, arrival, departure, room_id, adults, order_id, source")
    .eq("location_id", ctx.location.id).gte("departure", today).lte("arrival", addDays(today, 14))
    .in("state", ["held", "confirmed", "checked_in", "needs_review"]).order("arrival");
  const [{ data: rooms }, { data: orders }] = await Promise.all([
    db.schema("stay").from("rooms").select("id, code, name").eq("location_id", ctx.location.id),
    db.schema("commerce").from("orders").select("id, code, contact_snapshot").in("id", (bookings ?? []).map((b) => b.order_id)),
  ]);
  const room = new Map((rooms ?? []).map((r) => [r.id, `${r.code} ${r.name}`]));
  const order = new Map((orders ?? []).map((o) => [o.id, o]));
  const groups = [
    ["Đến hôm nay", (bookings ?? []).filter((b) => b.arrival === today && b.state === "confirmed")],
    ["Đang ở", (bookings ?? []).filter((b) => b.state === "checked_in")],
    ["Đi hôm nay", (bookings ?? []).filter((b) => b.departure === today && b.state === "checked_in")],
    ["Sắp tới (14 ngày)", (bookings ?? []).filter((b) => b.arrival > today)],
    ["Cần xử lý", (bookings ?? []).filter((b) => b.state === "needs_review" || b.state === "held")],
  ] as const;
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Đặt phòng</h1>
        <Link href="/ops/dat-phong/moi" className="inline-flex min-h-11 items-center rounded-md bg-[var(--accent)] px-4 font-semibold text-[var(--on-accent)]">Đặt phòng thủ công</Link>
      </div>
      {groups.map(([title, list]) => (
        <section key={title} className="mt-6">
          <h2 className="font-semibold">{title} ({list.length})</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {list.map((b) => (
              <li key={b.id}>
                <Link href={`/ops/dat-phong/${b.id}`} className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 text-sm hover:bg-[var(--surface-2)]">
                  <span className="font-mono">{order.get(b.order_id)?.code}</span>
                  <span className="font-semibold">{(order.get(b.order_id)?.contact_snapshot as { name?: string })?.name}</span>
                  <span>{room.get(b.room_id)}</span>
                  <span>{b.arrival} → {b.departure}</span>
                  <StatusBadge>{b.state}</StatusBadge>
                  <span className="text-xs text-[var(--ink-3)]">{b.source}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
