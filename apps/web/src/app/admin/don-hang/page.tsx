import { Price, StatusBadge } from "@zsopo/ui";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";
import { moveFulfillment } from "./actions";

export const instant = false;
export const metadata = { title: "Đơn hàng" };

const NEXT: Record<string, string[]> = { new: ["confirmed", "cancelled"], confirmed: ["packing", "cancelled"], packing: ["ritual_hold", "ready_to_ship", "cancelled"], ritual_hold: ["ready_to_ship", "cancelled"], ready_to_ship: ["shipped", "cancelled"], shipped: ["completed", "returned"], completed: ["returned"] };
const LABEL: Record<string, string> = { confirmed: "Xác nhận", packing: "Đóng gói", ritual_hold: "Bắt đầu nghi lễ 24h", ready_to_ship: "Sẵn sàng giao", shipped: "Đã gửi", completed: "Hoàn tất", cancelled: "Hủy", returned: "Trả hàng" };

export default async function OrdersAdmin() {
  const ctx = await getStaffContext("/admin/don-hang");
  await requirePermission("orders.read", ctx.location.entity_id, null, "/admin/don-hang");
  const db = await createClient();
  const { data: orders } = await db.schema("commerce").from("orders").select("id, code, kind, status, payment_status, payment_method, fulfillment_status, total, paid_amount, ritual_required, ritual_started_at, contact_snapshot, created_at, version")
    .eq("kind", "shop").order("created_at", { ascending: false }).limit(50);
  return (
    <>
      <h1 className="text-2xl font-semibold">Đơn hàng shop</h1>
      <p className="text-sm text-[var(--ink-2)]">Trạng thái giao hàng và thanh toán độc lập: COD đã gửi chưa phải đã thu. Ghi tiền COD/chuyển khoản ở trang Thanh toán.</p>
      <ul className="mt-4 flex flex-col gap-3">
        {(orders ?? []).map((o) => (
          <li key={o.id} className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono">{o.code}</span><span>{(o.contact_snapshot as { name?: string }).name}</span><Price value={String(o.total)} />
              <StatusBadge tone="info">{o.fulfillment_status}</StatusBadge><StatusBadge tone={o.payment_status === "paid" ? "success" : "warning"}>{o.payment_status}</StatusBadge><StatusBadge>{o.payment_method}</StatusBadge>
              {o.ritual_required && <StatusBadge tone="accent">Nghi lễ 24h</StatusBadge>}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(NEXT[o.fulfillment_status ?? ""] ?? []).filter((to) => to !== "ritual_hold" || o.ritual_required).map((to) => (
                <ActionForm key={to} action={moveFulfillment} submit={LABEL[to]!} danger={to === "cancelled" || to === "returned"}>
                  <input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="version" value={o.version} /><input type="hidden" name="to" value={to} />
                  {to === "shipped" && <Field label="Mã vận đơn"><input name="tracking" required className={`${inputCls} w-40`} /></Field>}
                </ActionForm>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
