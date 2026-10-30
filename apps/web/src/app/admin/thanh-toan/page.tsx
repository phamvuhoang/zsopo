import { Price, StatusBadge } from "@zsopo/ui";
import { randomUUID } from "node:crypto";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { approveRefundAction, confirmExceptionAction, recordPaymentAction, requestRefundAction } from "@/features/payments-actions";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Thanh toán" };

const fmt = (t: string | null) => (t ? new Date(t).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "");
const STATUS: Record<string, string> = { pending: "Chờ tiền", needs_review: "Cần đối soát", cancelled: "Đã hủy", expired: "Hết hạn giữ", confirmed: "Đã xác nhận", completed: "Hoàn tất" };

export default async function PaymentsAdmin() {
  const ctx = await getStaffContext("/admin/thanh-toan");
  await requirePermission("payment.confirm", ctx.location.entity_id, ctx.location.id, "/admin/thanh-toan");
  const db = await createClient();
  const [{ data: open }, { data: claims }, { data: review }, { data: refunds }] = await Promise.all([
    db.schema("commerce").rpc("orders_to_settle", {}),
    db.schema("commerce").from("payment_claims").select("order_id, reported_at").eq("status", "reported"),
    db.schema("commerce").from("payments").select("id, provider, provider_ref, amount, received_at, review_reason").eq("state", "needs_review").order("received_at", { ascending: false }),
    db.schema("commerce").from("refund_requests").select("id, order_id, amount, reason, status, created_at").eq("status", "requested"),
  ]);
  const { data: bookings } = await db.schema("stay").from("bookings").select("id, held_until").in("id", (open ?? []).flatMap((o) => (o.booking_id ? [o.booking_id] : [])));
  const claimed = new Map((claims ?? []).map((c) => [c.order_id, c.reported_at]));
  const heldUntil = new Map((bookings ?? []).map((b) => [b.id, b.held_until]));

  return (
    <>
      <h1 className="text-2xl font-semibold">Thanh toán và đối soát</h1>
      <p className="mt-1 text-sm text-[var(--ink-2)]">Chỉ ghi tiền khi đã thấy tiền thực nhận (sao kê, biên nhận). Ảnh chuyển khoản khách gửi không đủ để xác nhận.</p>

      <section className="mt-6 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-4" aria-labelledby="ghi-tien">
        <h2 id="ghi-tien" className="text-lg font-semibold">Ghi nhận tiền thực nhận</h2>
        <ActionForm action={recordPaymentAction} submit="Ghi nhận" className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="idempotencyKey" value={randomUUID()} />
          <Field label="Mã đơn"><input name="orderCode" required className={`${inputCls} w-36 font-mono uppercase`} /></Field>
          <Field label="Hình thức">
            <select name="provider" className={inputCls}>
              <option value="bank_transfer">Chuyển khoản</option>
              <option value="cash">Tiền mặt</option>
              <option value="ota">OTA đã thu</option>
            </select>
          </Field>
          <Field label="Số tiền (đ)"><input name="amount" inputMode="numeric" required className={`${inputCls} w-36`} /></Field>
          <Field label="Mã giao dịch / số biên nhận"><input name="providerRef" required className={inputCls} /></Field>
          <Field label="Thời điểm nhận"><input name="receivedAt" type="datetime-local" className={inputCls} /></Field>
          <Field label="Chứng cứ đối soát"><input name="evidence" placeholder="VD: Sao kê VCB 27/11 dòng 12" className={`${inputCls} w-72`} /></Field>
        </ActionForm>
      </section>

      <section className="mt-8" aria-labelledby="cho-tien">
        <h2 id="cho-tien" className="text-lg font-semibold">Đơn cần xử lý tiền (chờ tiền, đối soát, cần hoàn)</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead><tr className="border-b border-[var(--line)]"><th className="py-2">Mã</th><th>Khách</th><th>Tổng</th><th>Cọc</th><th>Đã thu</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead>
            <tbody>
              {(open ?? []).map((o) => {
                const held = o.booking_id ? heldUntil.get(o.booking_id) : null;
                const warn = o.status === "needs_review" || o.payment_status === "overpaid";
                return (
                  <tr key={o.id} className="border-b border-[var(--line)] align-top">
                    <td className="py-2 font-mono">{o.code}</td>
                    <td>{(o.contact_snapshot as { name?: string }).name}</td>
                    <td><Price value={String(o.total)} /></td>
                    <td><Price value={String(o.deposit_due)} /></td>
                    <td><Price value={String(o.paid_amount)} /></td>
                    <td>
                      <StatusBadge tone={warn ? "warning" : "neutral"}>{STATUS[o.status] ?? o.status}</StatusBadge>
                      {o.payment_status === "overpaid" && <div className="text-xs text-[var(--warning)]">Thu thừa</div>}
                      {held && <div className="text-xs text-[var(--ink-3)]">Giữ tới {fmt(held)}</div>}
                    </td>
                    <td>
                      {claimed.has(o.id) && <StatusBadge tone="info">Khách báo đã chuyển {fmt(claimed.get(o.id)!)}</StatusBadge>}
                      {o.booking_id && o.booking_state === "needs_review" && (
                        <ActionForm action={confirmExceptionAction} submit="Xác nhận ngoại lệ" className="mt-2 flex flex-wrap items-end gap-1">
                          <input type="hidden" name="bookingId" value={o.booking_id} />
                          <Field label="Còn phải thu (đ)"><input name="due" inputMode="numeric" required className={`${inputCls} w-28`} /></Field>
                          <Field label="Lý do"><input name="reason" required className={`${inputCls} w-40`} /></Field>
                        </ActionForm>
                      )}
                      {o.refundable > 0 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs underline">Yêu cầu hoàn tiền (còn hoàn được <Price value={String(o.refundable)} />)</summary>
                          <ActionForm action={requestRefundAction} submit="Gửi yêu cầu" className="mt-1 flex flex-wrap items-end gap-1">
                            <input type="hidden" name="orderId" value={o.id} />
                            <Field label="Số tiền"><input name="amount" type="number" min={1} max={o.refundable} defaultValue={o.refundable} required className={`${inputCls} w-28`} /></Field>
                            <Field label="Lý do"><input name="reason" required className={`${inputCls} w-40`} /></Field>
                          </ActionForm>
                        </details>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(open ?? []).length === 0 && <p className="mt-3 text-sm text-[var(--ink-3)]">Không có đơn cần xử lý tiền.</p>}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="tien-review">
        <h2 id="tien-review" className="text-lg font-semibold">Khoản tiền cần xử lý</h2>
        <ul className="mt-2 text-sm">
          {(review ?? []).length === 0 && <li className="text-[var(--ink-3)]">Không có khoản tiền treo.</li>}
          {(review ?? []).map((p) => (
            <li key={p.id} className="flex flex-wrap gap-2 py-1">
              <Price value={String(p.amount)} /> <span>{p.provider} · {p.provider_ref}</span> <span className="text-[var(--warning)]">{p.review_reason}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="hoan-tien">
        <h2 id="hoan-tien" className="text-lg font-semibold">Hoàn tiền chờ duyệt</h2>
        <p className="text-sm text-[var(--ink-2)]">Cần quyền tài chính và xác thực hai lớp. Người yêu cầu không tự duyệt.</p>
        <ul className="mt-2 flex flex-col gap-2 text-sm">
          {(refunds ?? []).length === 0 && <li className="text-[var(--ink-3)]">Không có yêu cầu.</li>}
          {(refunds ?? []).map((r) => (
            <li key={r.id} className="rounded-md border border-[var(--line)] p-3">
              <Price value={String(r.amount)} /> · {r.reason}
              <ActionForm action={approveRefundAction} submit="Duyệt và ghi nhận đã hoàn" className="mt-2 flex flex-wrap items-end gap-2">
                <input type="hidden" name="refundId" value={r.id} />
                <Field label="Mã giao dịch hoàn"><input name="providerRef" required className={inputCls} /></Field>
                <Field label="Chứng cứ"><input name="evidence" required className={`${inputCls} w-64`} /></Field>
                <Field label="Hình thức"><select name="method" className={inputCls}><option value="bank">Chuyển khoản</option><option value="cash">Tiền mặt</option></select></Field>
              </ActionForm>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
