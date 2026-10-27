import { CHAKRA_LABEL } from "@zsopo/core";
import { Price, StatusBadge } from "@zsopo/ui";
import Link from "next/link";
import type { PublicRoom } from "../queries";

export function RoomCard({ room, available }: { room: PublicRoom; available?: boolean | null }) {
  const chakra = room.energy?.chakras[0];
  return (
    <li className="relative flex flex-col rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs tracking-wide text-[var(--wood)] uppercase">{room.roomType}</p>
          <h3 className="font-display text-lg font-semibold">
            <Link href={`/stay/da-lat/phong/${room.slug}`} className="after:absolute after:inset-0 hover:underline">
              Phòng {room.name}
            </Link>
          </h3>
        </div>
        {!room.sellable ? (
          <StatusBadge>Chưa mở bán</StatusBadge>
        ) : available === false ? (
          <StatusBadge tone="danger">Hết phòng</StatusBadge>
        ) : available ? (
          <StatusBadge tone="success">Còn phòng</StatusBadge>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-[var(--ink-2)]">
        {room.areaM2 ? `${room.areaM2} m² · ` : ""}Tối đa {room.maxGuests} khách
        {chakra ? ` · Luân xa ${CHAKRA_LABEL[chakra]}` : ""}
      </p>
      {room.basePrice && room.sellable && (
        <p className="mt-auto pt-3 font-semibold">
          <Price value={room.basePrice} prefix="Từ" /> <span className="text-sm font-normal text-[var(--ink-3)]">/ đêm</span>
        </p>
      )}
    </li>
  );
}
