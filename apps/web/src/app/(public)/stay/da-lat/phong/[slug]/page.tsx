import { EnergyCard, Price, StatusBadge } from "@zsopo/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/markdown";
import { RoomCalendar } from "@/features/stay/components/room-calendar";
import { getLocation, getRoom, listRooms } from "@/features/stay/queries";
import { FEATURES } from "@/lib/flags";

export async function generateStaticParams() {
  const loc = await getLocation("da-lat");
  const rooms = loc ? await listRooms(loc.id) : [];
  return rooms.length ? rooms.map((r) => ({ slug: r.slug })) : [{ slug: "thach-anh-hong" }];
}

export async function generateMetadata({ params }: PageProps<"/stay/da-lat/phong/[slug]">): Promise<Metadata> {
  const room = await getRoom((await params).slug);
  if (!room) return { title: "Không tìm thấy phòng" };
  return {
    title: `Phòng ${room.name}, Zen Homestay Đà Lạt`,
    description: `${room.roomType}, tối đa ${room.maxGuests} khách. ${room.energy?.purpose ?? room.description}`.slice(0, 160),
    alternates: { canonical: `/stay/da-lat/phong/${room.slug}` },
  };
}

// Await params outside Suspense: unknown rooms must return 404.
export const instant = false;

export default async function RoomPage({ params }: PageProps<"/stay/da-lat/phong/[slug]">) {
  const room = await getRoom((await params).slug);
  const loc = await getLocation("da-lat");
  if (!room || !loc) notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--ink-3)]">
        <Link href="/stay">Space</Link> / <Link href="/stay/da-lat">Đà Lạt</Link> / <Link href="/stay/da-lat/phong">Phòng</Link> / <span>{room.name}</span>
      </nav>
      <div className="mt-4 grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div>
          <p className="text-xs tracking-wide text-[var(--wood)] uppercase">{room.roomType}</p>
          <h1 className="text-3xl font-semibold md:text-4xl">Phòng {room.name}</h1>
          <p className="mt-3 text-lg text-[var(--ink-2)]">{room.description}</p>
          <h2 className="mt-8 text-lg font-semibold">Thông tin phòng</h2>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {room.areaM2 && (
              <div>
                <dt className="text-[var(--ink-3)]">Diện tích</dt>
                <dd>{room.areaM2} m²</dd>
              </div>
            )}
            <div>
              <dt className="text-[var(--ink-3)]">Sức chứa</dt>
              <dd>Tối đa {room.maxGuests} khách</dd>
            </div>
            <div>
              <dt className="text-[var(--ink-3)]">Nhận phòng</dt>
              <dd>Từ {loc.checkIn}</dd>
            </div>
            <div>
              <dt className="text-[var(--ink-3)]">Trả phòng</dt>
              <dd>Trước {loc.checkOut}</dd>
            </div>
          </dl>
          {room.amenities.length > 0 && (
            <>
              <h2 className="mt-8 text-lg font-semibold">Tiện nghi</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {room.amenities.map((a) => (
                  <li key={a} className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-sm whitespace-nowrap">
                    {a}
                  </li>
                ))}
              </ul>
            </>
          )}
          {room.energy && (
            <div className="mt-8">
              <EnergyCard card={room.energy} />
            </div>
          )}
        </div>
        <aside className="flex flex-col gap-4">
          <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5">
            {room.sellable && room.basePrice ? (
              <p className="text-2xl font-semibold">
                <Price value={room.basePrice} prefix="Từ" /> <span className="text-sm font-normal text-[var(--ink-3)]">/ đêm</span>
              </p>
            ) : (
              <StatusBadge>Phòng chưa mở bán</StatusBadge>
            )}
            <p className="mt-2 text-sm text-[var(--ink-2)]">Giá cuối cùng tính theo từng đêm (cuối tuần, lễ có giá riêng) và được xác nhận ở bước đặt phòng.</p>
            {loc.policySummary && (
              <div className="mt-3 text-sm">
                <Markdown source={loc.policySummary} />
              </div>
            )}
          </div>
          {room.sellable && <RoomCalendar roomId={room.id} bookingHref={FEATURES.booking ? `/dat-phong?phong=${room.slug}` : undefined} />}
        </aside>
      </div>
    </div>
  );
}
