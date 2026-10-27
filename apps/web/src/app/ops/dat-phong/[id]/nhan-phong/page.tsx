import { Price, StatusBadge } from "@zsopo/ui";
import { randomUUID } from "node:crypto";
import { Field, inputCls } from "@/components/action-form";
import { loadBooking } from "@/features/ops/booking-data";
import { IdentityUpload } from "@/features/ops/identity-upload";
import { TransitionForm } from "@/features/ops/transition-form";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";

export const instant = false;
export const metadata = { title: "Nhận phòng" };

export default async function CheckIn({ params }: PageProps<"/ops/dat-phong/[id]/nhan-phong">) {
  const { id } = await params;
  const ctx = await getStaffContext(`/ops/dat-phong/${id}/nhan-phong`);
  await requirePermission("booking.write", ctx.location.entity_id, ctx.location.id, `/ops/dat-phong/${id}/nhan-phong`);
  const { b, order, room } = await loadBooking(id, ctx.actor.userId);
  const ready = room.cleanliness === "ready" && !room.safety_block && room.occupancy === "vacant";
  const due = Number(order.total) - Number(order.paid_amount);
  const contact = order.contact_snapshot as { name?: string };
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Nhận phòng (LT02)</h1>
      <p className="text-sm">{contact.name} · {room.code} {room.name} · {b.arrival} → {b.departure}</p>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        <li>Phòng: {ready ? <StatusBadge tone="success">Đã nghiệm thu, sẵn sàng</StatusBadge> : <StatusBadge tone="danger">Chưa sẵn sàng ({room.cleanliness}{room.safety_block ? ", khóa an toàn" : ""})</StatusBadge>}</li>
        <li>Khoản còn lại thu khi trả phòng: <Price value={String(due)} /></li>
      </ul>
      <div className="mt-4"><IdentityUpload bookingId={b.id} /></div>
      <div className="mt-4">
        <TransitionForm submit="Xác nhận giao phòng">
          <input type="hidden" name="bookingId" value={b.id} />
          <input type="hidden" name="version" value={b.version} />
          <input type="hidden" name="action" value="check_in" />
          <input type="hidden" name="idempotencyKey" value={randomUUID()} />
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="font-semibold">Kiểm tra trước khi giao phòng</legend>
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" required /> Đối chiếu đặt phòng và số người ở thực tế</label>
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="identityVerified" /> Đã đối chiếu giấy tờ tùy thân (đăng ký tạm trú)</label>
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" required /> Đã hướng dẫn nội quy, Wifi, lối thoát hiểm</label>
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" required /> Khách xác nhận nhận phòng và chìa khóa</label>
          </fieldset>
          <Field label="Chìa khóa / mã cửa đã giao"><input name="key" className={inputCls} /></Field>
        </TransitionForm>
      </div>
    </main>
  );
}
