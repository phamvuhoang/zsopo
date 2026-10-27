import { Price, StatusBadge } from "@zsopo/ui";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { staffPayment } from "@/features/ops/actions";
import { loadBooking } from "@/features/ops/booking-data";
import { fmtTime } from "@/features/ops/day";
import { TransitionForm } from "@/features/ops/transition-form";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";

export const instant = false;
export const metadata = { title: "Chi tiết đặt phòng" };

export default async function BookingDetail({ params }: PageProps<"/ops/dat-phong/[id]">) {
  const { id } = await params;
  const ctx = await getStaffContext(`/ops/dat-phong/${id}`);
  await requirePermission("booking.read", ctx.location.entity_id, ctx.location.id, `/ops/dat-phong/${id}`);
  const { b, order, items, room, payments, shiftId } = await loadBooking(id, ctx.actor.userId);
  const contact = order.contact_snapshot as { name?: string; phone?: string; email?: string };
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <p className="text-sm text-[var(--ink-3)]"><Link href="/ops/dat-phong" className="underline">Đặt phòng</Link> / <span className="font-mono">{order.code}</span></p>
      <h1 className="mt-1 text-2xl font-semibold">{contact.name} · {room.code} {room.name}</h1>
      <p className="text-sm">{b.arrival} → {b.departure} · {b.adults} người lớn · nguồn {b.source}{order.collected_by ? ` · ${order.collected_by === "ota" ? "OTA thu" : "ZSOPO thu"}` : ""}</p>
      <p className="mt-1"><StatusBadge>{b.state}</StatusBadge> <StatusBadge tone="info">{order.payment_status}</StatusBadge></p>
      <p className="mt-2 text-sm">Điện thoại: {contact.phone} {contact.email ? `· ${contact.email}` : ""}</p>
      {b.notes && <p className="text-sm">Ghi chú: {b.notes}</p>}
      <nav className="mt-4 flex flex-wrap gap-2">
        {b.state === "confirmed" && <Link href={`/ops/dat-phong/${id}/nhan-phong`} className="inline-flex min-h-11 items-center rounded-md bg-[var(--accent)] px-4 font-semibold text-[var(--on-accent)]">Nhận phòng (LT02)</Link>}
        {b.state === "checked_in" && <Link href={`/ops/dat-phong/${id}/tra-phong`} className="inline-flex min-h-11 items-center rounded-md bg-[var(--accent)] px-4 font-semibold text-[var(--on-accent)]">Trả phòng (LT04)</Link>}
      </nav>
      <section className="mt-6">
        <h2 className="font-semibold">Bảng kê</h2>
        <ul className="mt-2 text-sm">{items.map((i) => <li key={i.id} className={`flex justify-between ${i.status === "cancelled" ? "line-through opacity-60" : ""}`}><span>{i.title}</span><Price value={String(i.amount)} /></li>)}</ul>
        <dl className="mt-2 border-t border-[var(--line)] pt-2 text-sm">
          <div className="flex justify-between font-semibold"><dt>Tổng</dt><dd><Price value={String(order.total)} /></dd></div>
          <div className="flex justify-between"><dt>Đã thu</dt><dd><Price value={String(order.paid_amount)} /></dd></div>
          <div className="flex justify-between"><dt>Còn lại</dt><dd><Price value={String(Number(order.total) - Number(order.paid_amount))} /></dd></div>
        </dl>
        <h3 className="mt-3 text-sm font-semibold">Thanh toán đã ghi</h3>
        <ul className="text-sm">{payments.map((p) => <li key={p.id}>{fmtTime(p.received_at)} · {p.provider} · {p.provider_ref} · <Price value={String(p.amount)} /></li>)}</ul>
      </section>
      {["held", "confirmed", "checked_in", "needs_review"].includes(b.state) && (
        <section className="mt-6 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
          <h2 className="font-semibold">Ghi nhận tiền tại quầy</h2>
          {!shiftId && <p className="text-xs text-[var(--warning)]">Bạn chưa mở ca: tiền mặt sẽ không vào két ca. <Link href="/ops/ca" className="underline">Mở ca</Link></p>}
          <ActionForm action={staffPayment} submit="Ghi nhận" className="mt-2 flex flex-wrap items-end gap-2">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="idempotencyKey" value={randomUUID()} />
            {shiftId && <input type="hidden" name="shiftId" value={shiftId} />}
            <Field label="Hình thức"><select name="provider" className={inputCls}><option value="cash">Tiền mặt</option><option value="bank_transfer">Chuyển khoản (đã thấy tiền về)</option><option value="card_terminal">Quẹt thẻ</option></select></Field>
            <Field label="Số tiền"><input name="amount" inputMode="numeric" required className={`${inputCls} w-32`} /></Field>
            <Field label="Số biên nhận / mã GD"><input name="providerRef" className={inputCls} /></Field>
            <Field label="Chứng cứ (chuyển khoản)"><input name="evidence" className={inputCls} /></Field>
          </ActionForm>
        </section>
      )}
      {["held", "confirmed", "needs_review"].includes(b.state) && (
        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <TransitionForm submit="Hủy đặt phòng" danger>
            <input type="hidden" name="bookingId" value={b.id} /><input type="hidden" name="version" value={b.version} /><input type="hidden" name="action" value="cancel" />
            <Field label="Lý do hủy (đã xác nhận cần quản lý)"><input name="reason" required className={inputCls} /></Field>
          </TransitionForm>
          {b.state === "confirmed" && (
            <TransitionForm submit="Đánh dấu không đến" danger>
              <input type="hidden" name="bookingId" value={b.id} /><input type="hidden" name="version" value={b.version} /><input type="hidden" name="action" value="no_show" />
              <Field label="Ghi chú"><input name="reason" className={inputCls} /></Field>
            </TransitionForm>
          )}
        </section>
      )}
    </main>
  );
}
