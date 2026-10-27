import { formatVnd } from "@zsopo/core";
import { Suspense } from "react";
import { addDays, todayVn } from "@/features/ops/day";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Tổng quan" };

const SOURCES = [["room", "Phòng"], ["beverage", "Đồ uống"], ["own_service", "Dịch vụ tự vận hành"], ["product", "Sản phẩm"], ["cohost_service", "Dịch vụ đồng tổ chức"]] as const;
type Metrics = {
  recognizedRevenueBySource: Record<string, string>; cashCollected: string; depositsLiability: string;
  occupancy: { occupied: number; sellable: number; pct: number | null }; adr: string | null; bookingsByChannel: Record<string, number>; shopOrders: { count: number; total: string }; onlineShopRevenue: string;
};

async function Dashboard({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  const ctx = await getStaffContext("/admin");
  await requirePermission("metrics.read", ctx.location.entity_id, ctx.location.id, "/admin");
  const sp = await searchParams;
  const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const to = isDate(sp.den) ? sp.den : todayVn();
  const from = isDate(sp.tu) ? sp.tu : addDays(to, -29);
  const { data, error } = await (await createClient()).schema("commerce").rpc("get_location_metrics", { p_entity: ctx.location.entity_id, p_location: ctx.location.id, p_from: from, p_to: to });
  const m = data as Metrics | null;
  const totalRev = m ? Object.values(m.recognizedRevenueBySource).reduce((a, v) => a + BigInt(v), 0n) : 0n;
  const channels = m ? Object.entries(m.bookingsByChannel) : [];
  const allBookings = channels.reduce((a, [, n]) => a + n, 0);
  return (
    <>
      <h1 className="text-2xl font-semibold">Tổng quan vận hành</h1>
      <form className="mt-3 flex flex-wrap items-end gap-2 text-sm" aria-label="Kỳ báo cáo">
        <label className="flex flex-col gap-1">Từ ngày<input type="date" name="tu" defaultValue={from} className="min-h-11 rounded-md border border-[var(--line)] px-2" /></label>
        <label className="flex flex-col gap-1">Đến ngày<input type="date" name="den" defaultValue={to} className="min-h-11 rounded-md border border-[var(--line)] px-2" /></label>
        <button className="min-h-11 rounded-md border border-[var(--line-2)] px-4">Xem</button>
        <span className="text-[var(--ink-3)]">{ctx.location.name} · múi giờ Asia/Ho_Chi_Minh</span>
      </form>
      {error || !m ? <p role="alert" className="mt-4 text-[var(--danger)]">Chưa tải được số liệu.</p> : (
        <>
          <p className="mt-3 rounded-md bg-[var(--warning-soft)] p-2 text-xs">Quy tắc ghi nhận doanh thu chờ tài chính duyệt: số liệu dùng cho vận hành, chưa phải báo cáo chính thức.</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[["Doanh thu ghi nhận", formatVnd(totalRev)], ["Tiền đã thu", formatVnd(m.cashCollected)], ["Tiền cọc / nghĩa vụ với khách", formatVnd(m.depositsLiability)], ["Công suất phòng", m.occupancy.pct == null ? "Chưa có đêm bán" : `${m.occupancy.pct}% (${m.occupancy.occupied}/${m.occupancy.sellable} đêm)`]].map(([k, v]) => (
              <div key={k} className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-4"><dt className="text-xs text-[var(--ink-3)]">{k}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{v}</dd></div>
            ))}
          </dl>
          <section className="mt-6" aria-labelledby="nguon">
            <h2 id="nguon" className="font-semibold">Doanh thu theo 5 nguồn</h2>
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {SOURCES.map(([k, label]) => {
                const v = BigInt(m.recognizedRevenueBySource[k] ?? "0");
                const pct = totalRev > 0n ? Number((v * 1000n) / totalRev) / 10 : 0;
                return (
                  <li key={k} className="grid grid-cols-[10rem_1fr_8rem] items-center gap-2">
                    <span>{label}</span>
                    <span className="h-3 rounded-full bg-[var(--surface-2)]" role="img" aria-label={`${label} ${pct}%`}><span className="block h-3 rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} /></span>
                    <span className="text-right tabular-nums">{formatVnd(v)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
          <section className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="font-semibold">ADR</h2>
              <p className="text-sm">{m.adr ? formatVnd(m.adr) : "Chưa có đêm đã phục vụ"} <span className="text-[var(--ink-3)]">(chỉ doanh thu phòng, không gồm dịch vụ/ship)</span></p>
            </div>
            <div>
              <h2 className="font-semibold">Đặt phòng theo kênh (không gồm hủy/hết hạn)</h2>
              {channels.length === 0 ? <p className="text-sm text-[var(--ink-3)]">Chưa có đặt phòng trong kỳ.</p> : (
                <ul className="text-sm">{channels.map(([k, n]) => <li key={k}>{k}: {n}{allBookings ? ` (${Math.round((n / allBookings) * 100)}%)` : ""}</li>)}</ul>
              )}
              <p className="mt-2 text-sm">Đơn shop: {m.shopOrders.count} · {formatVnd(m.shopOrders.total)}</p>
              <p className="text-sm">Doanh thu sản phẩm shop online đã giao: {formatVnd(m.onlineShopRevenue)} <span className="text-[var(--ink-3)]">(toàn đơn vị, không cộng vào tổng của điểm)</span></p>
            </div>
          </section>
        </>
      )}
    </>
  );
}

export default function AdminHome(props: PageProps<"/admin">) {
  return <Suspense fallback={<p>Đang tải số liệu...</p>}><Dashboard searchParams={props.searchParams} /></Suspense>;
}
