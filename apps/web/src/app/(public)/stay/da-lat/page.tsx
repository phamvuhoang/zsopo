import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { RoomCard } from "@/features/stay/components/room-card";
import { getLocation, listRooms } from "@/features/stay/queries";
import { JsonLd, lodging } from "@/lib/seo/json-ld";

export const metadata: Metadata = {
  title: "Zen Homestay Đà Lạt",
  description: "Zen Homestay Đà Lạt: nhà gỗ giữa đồi thông, phòng có bảng năng lượng, nhận phòng 14:00, trả phòng 12:00.",
  alternates: { canonical: "/stay/da-lat" },
};

export default async function DalatPage() {
  const loc = await getLocation("da-lat");
  if (!loc) notFound();
  const rooms = await listRooms(loc.id);
  const open = rooms.filter((r) => r.sellable);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <JsonLd data={lodging({ ...loc, priceFrom: open.map((r) => r.basePrice).filter((x): x is string => !!x).sort((a, b) => Number(a) - Number(b))[0] ?? null })} />
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--ink-3)]">
        <Link href="/stay">Space</Link> / <span>Đà Lạt</span>
      </nav>
      <div className="mt-4 grid gap-8 md:grid-cols-[3fr_2fr]">
        <div>
          <h1 className="text-3xl font-semibold md:text-4xl">{loc.name}</h1>
          <p className="mt-3 text-lg text-[var(--ink-2)]">Nhà gỗ giữa đồi thông với {rooms.length} phòng mang tên đá năng lượng, trong đó {open.length} phòng đang nhận đặt.</p>
          <Image src="/assets/zen-homestay-front.jpg" alt="Mặt tiền Zen Homestay Đà Lạt" width={2048} height={1364} sizes="(min-width: 768px) 60vw, 100vw" className="mt-6 h-auto w-full rounded-[var(--radius-md)]" priority />
        </div>
        <aside className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-semibold">Thông tin lưu trú</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-[var(--ink-3)]">Nhận phòng</dt>
            <dd>Từ {loc.checkIn}</dd>
            <dt className="text-[var(--ink-3)]">Trả phòng</dt>
            <dd>Trước {loc.checkOut}</dd>
            {loc.address && (
              <>
                <dt className="text-[var(--ink-3)]">Địa chỉ</dt>
                <dd>{loc.address}</dd>
              </>
            )}
          </dl>
          {loc.policySummary && (
            <div className="mt-4 text-sm">
              <Markdown source={loc.policySummary} />
            </div>
          )}
          <p className="mt-2 text-sm">
            <Link className="underline" href="/chinh-sach/noi-quy">Nội quy lưu trú</Link> · <Link className="underline" href="/chinh-sach/huy-hoan">Chính sách hủy</Link>
          </p>
          <Link href="/stay/da-lat/phong" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[var(--accent)] px-5 font-semibold text-[var(--on-accent)]">
            Xem phòng trống
          </Link>
        </aside>
      </div>
      <h2 className="mt-12 text-xl font-semibold">Phòng</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.slice(0, 6).map((r) => (
          <RoomCard key={r.id} room={r} />
        ))}
      </ul>
    </div>
  );
}
