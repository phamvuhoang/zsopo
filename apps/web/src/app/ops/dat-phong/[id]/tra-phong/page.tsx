import { Price } from "@zsopo/ui";
import { randomUUID } from "node:crypto";
import { Field, inputCls } from "@/components/action-form";
import { loadBooking } from "@/features/ops/booking-data";
import { TransitionForm } from "@/features/ops/transition-form";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";

export const instant = false;
export const metadata = { title: "Trả phòng" };

export default async function CheckOut({ params }: PageProps<"/ops/dat-phong/[id]/tra-phong">) {
  const { id } = await params;
  const ctx = await getStaffContext(`/ops/dat-phong/${id}/tra-phong`);
  await requirePermission("booking.write", ctx.location.entity_id, ctx.location.id, `/ops/dat-phong/${id}/tra-phong`);
  const { b, order, items, room } = await loadBooking(id, ctx.actor.userId);
  const balance = Number(order.total) - Number(order.paid_amount);
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Trả phòng (LT04)</h1>
      <p className="text-sm">{room.code} {room.name} · mã {order.code}</p>
      <h2 className="mt-4 font-semibold">Bảng kê phòng, dịch vụ, điều chỉnh</h2>
      <ul className="mt-2 text-sm">{items.map((i) => <li key={i.id} className={`flex justify-between ${i.status === "cancelled" ? "line-through opacity-60" : ""}`}><span>{i.title}</span><Price value={String(i.amount)} /></li>)}</ul>
      <dl className="mt-2 border-t border-[var(--line)] pt-2 text-sm">
        <div className="flex justify-between"><dt>Tổng</dt><dd><Price value={String(order.total)} /></dd></div>
        <div className="flex justify-between"><dt>Đã thu</dt><dd><Price value={String(order.paid_amount)} /></dd></div>
        <div className="flex justify-between font-semibold"><dt>{balance >= 0 ? "Còn phải thu" : "Thu thừa, cần hoàn"}</dt><dd><Price value={String(Math.abs(balance))} /></dd></div>
      </dl>
      <p className="mt-2 text-xs text-[var(--ink-3)]">Đây là bảng kê vận hành, không phải hóa đơn VAT. Xuất hóa đơn qua phần mềm kế toán.</p>
      <div className="mt-4">
        <TransitionForm submit="Xác nhận trả phòng">
          <input type="hidden" name="bookingId" value={b.id} />
          <input type="hidden" name="version" value={b.version} />
          <input type="hidden" name="action" value="check_out" />
          <input type="hidden" name="idempotencyKey" value={randomUUID()} />
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" required /> Đã thu hồi chìa khóa/thẻ và kiểm tra phòng sơ bộ</label>
          {balance > 0 && <Field label="Lý do ngoại lệ còn nợ (chỉ quản lý)"><input name="reason" className={inputCls} /></Field>}
          <Field label="Trả phòng muộn đến (nếu có)"><input name="lateUntil" type="datetime-local" className={inputCls} /></Field>
        </TransitionForm>
      </div>
    </main>
  );
}
