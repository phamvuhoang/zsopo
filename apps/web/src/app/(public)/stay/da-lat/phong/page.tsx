import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RoomCard } from "@/features/stay/components/room-card";
import { getLocation, listRooms } from "@/features/stay/queries";
import { createPublicClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Phòng tại Zen Homestay Đà Lạt",
  description: "Danh sách phòng, sức chứa, bảng năng lượng và giá theo đêm tại Zen Homestay Đà Lạt.",
  alternates: { canonical: "/stay/da-lat/phong" },
};

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

async function RoomList({ searchParams }: Pick<PageProps<"/stay/da-lat/phong">, "searchParams">) {
  const loc = await getLocation("da-lat");
  if (!loc) notFound();
  const sp = await searchParams;
  const guests = Math.max(1, Math.min(10, Number(sp.khach) || 1));
  const from = isDate(sp.nhan) ? sp.nhan : null;
  const to = isDate(sp.tra) && from && sp.tra > from ? sp.tra : null;
  const rooms = (await listRooms(loc.id)).filter((r) => r.maxGuests >= guests);
  // Availability is live (uncached) and only computed when dates are chosen.
  const availability = new Map<string, boolean>();
  if (from && to) {
    const db = createPublicClient();
    await Promise.all(
      rooms.filter((r) => r.sellable).map(async (r) => {
        const { data } = await db.schema("stay").rpc("room_calendar", { p_room: r.id, p_from: from, p_to: to });
        availability.set(r.id, !!data?.length && data.every((d: { available: boolean }) => d.available));
      }),
    );
  }
  return (
    <>
      <form className="mt-6 flex flex-wrap items-end gap-3 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-4" role="search" aria-label="Tìm phòng">
        <label className="flex flex-col gap-1 text-sm">
          Nhận phòng
          <input type="date" name="nhan" defaultValue={from ?? ""} className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--bg)] px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Trả phòng
          <input type="date" name="tra" defaultValue={to ?? ""} className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--bg)] px-3" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Số khách
          <input type="number" name="khach" min={1} max={10} defaultValue={guests} className="min-h-11 w-24 rounded-md border border-[var(--line)] bg-[var(--bg)] px-3" />
        </label>
        <button className="min-h-11 rounded-md bg-[var(--accent)] px-5 font-semibold text-[var(--on-accent)]">Xem phòng trống</button>
      </form>
      {rooms.length === 0 ? (
        <p className="mt-8">Không có phòng phù hợp {guests} khách. <Link href="/stay/da-lat/phong" className="underline">Xóa bộ lọc</Link></p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((r) => (
            <RoomCard key={r.id} room={r} available={from && to ? (availability.get(r.id) ?? null) : null} />
          ))}
        </ul>
      )}
    </>
  );
}

export default function RoomsPage({ searchParams }: PageProps<"/stay/da-lat/phong">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--ink-3)]">
        <Link href="/stay">Space</Link> / <Link href="/stay/da-lat">Đà Lạt</Link> / <span>Phòng</span>
      </nav>
      <h1 className="mt-4 text-3xl font-semibold">Phòng tại Zen Homestay Đà Lạt</h1>
      <Suspense fallback={<p className="mt-6">Đang tải danh sách phòng...</p>}>
        <RoomList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
