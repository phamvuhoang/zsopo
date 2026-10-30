import { StatusBadge } from "@zsopo/ui";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { moveLost, recordLost } from "@/features/housekeeping/actions";
import { fmtTime } from "@/features/ops/day";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Đồ thất lạc" };

export default async function LostFound() {
  const ctx = await getStaffContext("/ops/do-that-lac");
  await requirePermission("lostfound.manage", ctx.location.entity_id, ctx.location.id, "/ops/do-that-lac");
  const db = await createClient();
  const [{ data: items }, { data: rooms }, { data: colleagues }] = await Promise.all([
    db.schema("stay").from("lost_found_items").select("*").eq("location_id", ctx.location.id).in("status", ["stored", "contacted"]).order("found_at", { ascending: false }),
    db.schema("stay").from("rooms").select("id, code, name").eq("location_id", ctx.location.id).order("sort"),
    db.schema("stay").rpc("shift_receivers", { p_location: ctx.location.id }),
  ]);
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Đồ thất lạc</h1>
      <p className="text-sm text-[var(--ink-2)]">Ảnh tránh chụp giấy tờ/thông tin cá nhân. Chưa có thời hạn thanh lý được duyệt: thanh lý chỉ khi quản lý quyết định.</p>
      <ActionForm action={recordLost} submit="Ghi nhận" className="mt-4 grid gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 sm:grid-cols-2">
        <input type="hidden" name="locationId" value={ctx.location.id} />
        <Field label="Mô tả"><input name="description" required className={inputCls} /></Field>
        <Field label="Phòng"><select name="roomId" className={inputCls}><option value="">Khu chung</option>{(rooms ?? []).map((r) => <option key={r.id} value={r.id}>{r.code} {r.name}</option>)}</select></Field>
        <Field label="Nơi cất"><input name="storage" required className={inputCls} /></Field>
        <Field label="Mã niêm phong"><input name="seal" className={inputCls} /></Field>
        <Field label="Người chứng kiến"><select name="witness" className={inputCls}>{(colleagues ?? []).map((c) => <option key={c.user_id} value={c.user_id}>{c.display_name}</option>)}</select></Field>
      </ActionForm>
      <ul className="mt-6 flex flex-col gap-3">
        {(items ?? []).map((i) => (
          <li key={i.id} className="rounded-md border border-[var(--line)] p-3 text-sm">
            <div className="flex flex-wrap gap-2"><span className="font-semibold">{i.description}</span><StatusBadge>{i.status}</StatusBadge><span className="text-[var(--ink-3)]">{fmtTime(i.found_at)} · {i.storage_place} {i.seal_code ? `· niêm phong ${i.seal_code}` : ""}</span></div>
            <ActionForm action={moveLost} submit="Trả khách" className="mt-2 flex flex-wrap items-end gap-2">
              <input type="hidden" name="itemId" value={i.id} /><input type="hidden" name="to" value="returned" />
              <Field label="Xác minh chủ sở hữu"><input name="note" required className={inputCls} /></Field>
              <Field label="Số biên nhận"><input name="receipt" required className={`${inputCls} w-32`} /></Field>
            </ActionForm>
            <ActionForm action={moveLost} submit="Thanh lý (quản lý)" danger className="mt-2 flex flex-wrap items-end gap-2">
              <input type="hidden" name="itemId" value={i.id} /><input type="hidden" name="to" value="disposed" />
              <Field label="Quyết định thanh lý"><input name="note" required className={inputCls} /></Field>
            </ActionForm>
          </li>
        ))}
      </ul>
    </main>
  );
}
