import { StatusBadge } from "@zsopo/ui";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { confirmMovement, supplyMovement } from "@/features/housekeeping/actions";
import { fmtTime } from "@/features/ops/day";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Đồ vải và vật tư" };

const KIND = { receive_clean: "Nhận sạch", issue_room: "Cấp phòng", collect_dirty: "Thu bẩn", send_laundry: "Giao giặt", receive_laundry: "Nhận từ giặt", discard: "Loại/hỏng/mất" } as const;

export default async function Supplies() {
  const ctx = await getStaffContext("/ops/vat-tu");
  await requirePermission("supply.manage", ctx.location.entity_id, ctx.location.id, "/ops/vat-tu");
  const db = await createClient();
  const [{ data: balances }, { data: pending }, { data: colleagues }] = await Promise.all([
    db.schema("stay").rpc("supply_balances", { p_location: ctx.location.id }),
    db.schema("stay").from("supply_movements").select("id, kind, qty, created_at, item_id").eq("counterpart", ctx.actor.userId).is("confirmed_at", null),
    db.schema("stay").rpc("shift_receivers", { p_location: ctx.location.id }),
  ]);
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Đồ vải và vật tư (BP03)</h1>
      {(pending ?? []).length > 0 && (
        <section className="mt-4 rounded-md border border-[var(--warning)] p-3">
          <h2 className="font-semibold">Chờ bạn xác nhận</h2>
          {(pending ?? []).map((m) => (
            <ActionForm key={m.id} action={confirmMovement} submit="Xác nhận" className="mt-2 flex items-center gap-2">
              <input type="hidden" name="movementId" value={m.id} />
              <span className="text-sm">{KIND[m.kind as keyof typeof KIND]} · {m.qty} · {fmtTime(m.created_at)}</span>
            </ActionForm>
          ))}
        </section>
      )}
      <table className="mt-4 w-full text-left text-sm">
        <thead><tr className="border-b border-[var(--line)]"><th className="py-2">Mặt hàng</th><th>Sạch</th><th>Bẩn</th><th>Ở giặt</th><th>Loại</th><th /></tr></thead>
        <tbody>
          {((balances ?? []) as { item_id: string; name: string; clean: number; dirty: number; at_laundry: number; discarded: number; below_min: boolean; min_level: number }[]).map((b) => (
            <tr key={b.item_id} className="border-b border-[var(--line)]">
              <td className="py-2">{b.name}</td><td>{b.clean}</td><td>{b.dirty}</td><td>{b.at_laundry}</td><td>{b.discarded}</td>
              <td>{b.below_min && <StatusBadge tone="danger">Dưới tồn tối thiểu {b.min_level}: cần bổ sung</StatusBadge>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ActionForm action={supplyMovement} submit="Ghi giao nhận" className="mt-4 flex flex-wrap items-end gap-2">
        <Field label="Mặt hàng"><select name="itemId" className={inputCls}>{((balances ?? []) as { item_id: string; name: string }[]).map((b) => <option key={b.item_id} value={b.item_id}>{b.name}</option>)}</select></Field>
        <Field label="Loại"><select name="kind" className={inputCls}>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Số lượng"><input name="qty" inputMode="numeric" required className={`${inputCls} w-20`} /></Field>
        <Field label="Bên nhận xác nhận"><select name="counterpart" className={inputCls}><option value="">Không cần</option>{(colleagues ?? []).map((c) => <option key={c.user_id} value={c.user_id}>{c.display_name}</option>)}</select></Field>
        <Field label="Ghi chú"><input name="note" className={inputCls} /></Field>
      </ActionForm>
    </main>
  );
}
