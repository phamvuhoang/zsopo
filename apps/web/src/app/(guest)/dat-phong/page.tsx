import { BookingWizard } from "@/features/stay/components/booking-wizard";
import { getLocation, listRooms } from "@/features/stay/queries";
import { SERVICE_GROUPS, leadLabel, listServices } from "@/features/stay/service-queries";
import { createPublicClient } from "@/lib/supabase/server";

export const metadata = { title: "Đặt phòng" };
export const instant = false;

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

export default async function BookingPage({ searchParams }: PageProps<"/dat-phong">) {
  const sp = await searchParams;
  const loc = await getLocation("da-lat");
  const rooms = loc ? (await listRooms(loc.id)).filter((r) => r.sellable && r.basePrice) : [];
  const services = loc ? await listServices(loc.id) : [];
  const { data: open } = await createPublicClient().schema("content").rpc("policies_published");
  return (
    <>
      <h1 className="text-3xl font-semibold">Đặt phòng</h1>
      <p className="mt-2 text-[var(--ink-2)]">Zen Homestay Đà Lạt. Giá do hệ thống tính theo từng đêm; phòng chỉ được xác nhận khi ZSOPO ghi nhận tiền cọc.</p>
      <div className="mt-8">
        {!open || rooms.length === 0 ? (
          <p role="status">Đặt phòng trực tuyến tạm thời chưa mở. Vui lòng liên hệ lễ tân qua trang Liên hệ.</p>
        ) : (
          <BookingWizard
            rooms={rooms.map((r) => ({ id: r.id, slug: r.slug, name: r.name, maxGuests: r.maxGuests, capacityAdults: r.capacityAdults }))}
            services={services.map((s) => ({ id: s.id, name: s.name, group: SERVICE_GROUPS[s.group_key], unit: s.unit, price: s.price, leadLabel: leadLabel(s.lead_time_min), discountBp: s.prebook_discount_bp }))}
            initialRoom={typeof sp.phong === "string" ? sp.phong : undefined}
            initialArrival={isDate(sp.nhan) ? sp.nhan : undefined}
            initialDeparture={isDate(sp.tra) ? sp.tra : undefined}
          />
        )}
      </div>
    </>
  );
}
