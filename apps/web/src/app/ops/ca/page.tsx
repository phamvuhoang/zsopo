import { Price, StatusBadge } from "@zsopo/ui";
import Link from "next/link";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { ackHandover, addCashMovement, handoverShift, openShift } from "@/features/ops/actions";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Ca làm việc" };

export default async function ShiftPage() {
  const ctx = await getStaffContext("/ops/ca");
  await requirePermission("shift.manage", ctx.location.entity_id, ctx.location.id, "/ops/ca");
  const db = await createClient();
  const [{ data: mine }, { data: toAck }, { data: staff }] = await Promise.all([
    db.schema("stay").from("shifts").select("*").eq("opened_by", ctx.actor.userId).in("status", ["open", "handover_pending"]).order("opened_at", { ascending: false }).limit(1),
    db.schema("stay").from("shifts").select("id, opened_at, expected_cash, cash_counted, variance, notes, version").eq("receiver_id", ctx.actor.userId).eq("status", "handover_pending"),
    db.schema("stay").rpc("shift_receivers", { p_location: ctx.location.id }),
  ]);
  const shift = mine?.[0];
  const { data: moves } = shift ? await db.schema("commerce").from("cash_movements").select("kind, amount, note, created_at").eq("shift_id", shift.id).order("created_at") : { data: [] };
  const sum = (k: string) => (moves ?? []).filter((m) => m.kind === k).reduce((a, m) => a + BigInt(m.amount), 0n);
  const expected = shift ? BigInt(shift.cash_open) + sum("receipt") - sum("expense") - sum("remit") : 0n;
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Ca làm việc</h1>
      <p className="text-sm text-[var(--ink-2)]">{ctx.location.name} · {ctx.displayName}</p>
      {(toAck ?? []).map((s) => (
        <section key={s.id} className="mt-4 rounded-md border border-[var(--warning)] bg-[var(--warning-soft)] p-4">
          <h2 className="font-semibold">Ca chờ bạn nhận</h2>
          <p className="text-sm">Dự kiến <Price value={String(s.expected_cash)} />, thực đếm <Price value={String(s.cash_counted)} />, chênh lệch <Price value={String(s.variance)} />. {s.notes}</p>
          <Link href={`/ops/ca/${s.id}/ban-giao`} className="text-sm underline">Xem BM01</Link>
          <ActionForm action={ackHandover} submit="Xác nhận đã nhận ca" className="mt-2">
            <input type="hidden" name="shiftId" value={s.id} />
            <input type="hidden" name="version" value={s.version} />
          </ActionForm>
        </section>
      ))}
      {!shift ? (
        <ActionForm action={openShift} submit="Mở ca" className="mt-6 flex flex-wrap items-end gap-2">
          <input type="hidden" name="locationId" value={ctx.location.id} />
          <Field label="Tiền mặt đầu ca (đ)"><input name="cashOpen" inputMode="numeric" required className={inputCls} /></Field>
        </ActionForm>
      ) : shift.status === "handover_pending" ? (
        <p className="mt-6" role="status">Đã bàn giao lúc {new Date(shift.handed_over_at!).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}, chờ người nhận xác nhận. <Link href={`/ops/ca/${shift.id}/ban-giao`} className="underline">BM01</Link></p>
      ) : (
        <>
          <section className="mt-6 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
            <h2 className="font-semibold">Két tiền mặt <StatusBadge tone="success">Đang mở</StatusBadge></h2>
            <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
              <dt>Tiền đầu ca</dt><dd><Price value={String(shift.cash_open)} /></dd>
              <dt>Thu tiền mặt</dt><dd><Price value={sum("receipt")} /></dd>
              <dt>Chi</dt><dd><Price value={sum("expense")} /></dd>
              <dt>Nộp quỹ</dt><dd><Price value={sum("remit")} /></dd>
              <dt className="font-semibold">Dự kiến trong két</dt><dd className="font-semibold"><Price value={expected} /></dd>
            </dl>
            <p className="mt-2 text-xs text-[var(--ink-3)]">Tiền chuyển khoản và OTA không tính vào két; đối soát riêng ở trang Thanh toán.</p>
            <ActionForm action={addCashMovement} submit="Ghi" className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="shiftId" value={shift.id} />
              <Field label="Loại"><select name="kind" className={inputCls}><option value="expense">Chi</option><option value="remit">Nộp quỹ</option></select></Field>
              <Field label="Số tiền"><input name="amount" inputMode="numeric" required className={`${inputCls} w-28`} /></Field>
              <Field label="Diễn giải"><input name="note" required className={inputCls} /></Field>
            </ActionForm>
          </section>
          <section className="mt-6 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
            <h2 className="font-semibold">Bàn giao ca (BM01)</h2>
            <ActionForm action={handoverShift} submit="Bàn giao" className="mt-2 flex flex-wrap items-end gap-2">
              <input type="hidden" name="shiftId" value={shift.id} />
              <input type="hidden" name="version" value={shift.version} />
              <Field label="Thực đếm (đ)"><input name="counted" inputMode="numeric" required className={`${inputCls} w-32`} /></Field>
              <Field label="Người nhận ca">
                <select name="receiver" required className={inputCls}>
                  {(staff ?? []).map((s) => <option key={s.user_id} value={s.user_id}>{s.display_name}{s.user_id === ctx.actor.userId ? " (tôi, kiêm nhiệm)" : ""}</option>)}
                </select>
              </Field>
              <Field label="Giải trình chênh lệch / ghi chú"><input name="notes" className={`${inputCls} w-72`} /></Field>
            </ActionForm>
          </section>
        </>
      )}
    </main>
  );
}
