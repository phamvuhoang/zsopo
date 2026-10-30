import { randomUUID } from "node:crypto";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { manualBooking } from "@/features/ops/actions";
import { todayVn, addDays } from "@/features/ops/day";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Đặt phòng thủ công" };

export default async function NewManualBooking() {
  const ctx = await getStaffContext("/ops/dat-phong/moi");
  await requirePermission("booking.write", ctx.location.entity_id, ctx.location.id, "/ops/dat-phong/moi");
  const db = await createClient();
  const { data: rooms } = await db.schema("stay").from("rooms").select("id, code, name, max_guests").eq("location_id", ctx.location.id).eq("sellable", true).eq("status", "published").order("sort");
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Đặt phòng thủ công (LT01)</h1>
      <p className="text-sm text-[var(--ink-2)]">Dùng cùng bảng giá và lịch chống trùng với web. Đơn ở trạng thái giữ chỗ cho tới khi ghi nhận tiền cọc.</p>
      <ActionForm action={manualBooking} submit="Tạo đặt phòng" className="mt-4 grid gap-3">
        <input type="hidden" name="idempotencyKey" value={randomUUID()} />
        <Field label="Phòng"><select name="roomId" className={inputCls}>{(rooms ?? []).map((r) => <option key={r.id} value={r.id}>{r.code} {r.name} (tối đa {r.max_guests})</option>)}</select></Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Nhận phòng"><input type="date" name="arrival" defaultValue={todayVn()} required className={inputCls} /></Field>
          <Field label="Trả phòng"><input type="date" name="departure" defaultValue={addDays(todayVn(), 1)} required className={inputCls} /></Field>
          <Field label="Người lớn"><input type="number" name="adults" min={1} defaultValue={2} className={inputCls} /></Field>
        </div>
        <Field label="Họ tên khách"><input name="name" required className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Số điện thoại"><input name="phone" required className={inputCls} /></Field>
          <Field label="Email (không bắt buộc)"><input name="email" type="email" className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Nguồn"><select name="source" className={inputCls}><option value="walk_in">Khách vãng lai</option><option value="phone">Điện thoại</option><option value="zalo">Zalo</option><option value="ota">OTA</option><option value="b2b">B2B/đoàn</option></select></Field>
          <Field label="Bên thu tiền"><select name="collectedBy" className={inputCls}><option value="zsopo">ZSOPO thu</option><option value="ota">OTA thu</option></select></Field>
        </div>
        <Field label="Ghi chú"><textarea name="notes" className={`${inputCls} py-2`} /></Field>
      </ActionForm>
    </main>
  );
}
