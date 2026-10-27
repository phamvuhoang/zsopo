import { StatusBadge } from "@zsopo/ui";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { mergeAction } from "@/features/crm/actions";
import { filterFromParams } from "@/features/crm/segments";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Khách hàng" };

async function Crm({ searchParams }: Pick<PageProps<"/admin/khach-hang">, "searchParams">) {
  const ctx = await getStaffContext("/admin/khach-hang");
  await requirePermission("crm.read", ctx.location.entity_id, null, "/admin/khach-hang");
  const sp = await searchParams;
  const filter = filterFromParams(sp);
  const db = await createClient();
  const [{ data: count }, { data: list }, { data: dups }] = await Promise.all([
    db.schema("crm").rpc("segment_count", { p_entity: ctx.location.entity_id, p_filter: filter }),
    db.schema("crm").rpc("segment_list", { p_entity: ctx.location.entity_id, p_filter: filter, p_limit: 50, p_offset: 0 }),
    db.schema("crm").rpc("duplicate_suggestions", { p_entity: ctx.location.entity_id }),
  ]);
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]).toString();
  return (
    <>
      <h1 className="text-2xl font-semibold">Khách hàng</h1>
      <form className="mt-4 grid gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-4" aria-label="Phân khúc">
        <Field label="Số lần ở tối thiểu"><input name="visits" inputMode="numeric" defaultValue={sp.visits as string} className={inputCls} /></Field>
        <Field label="Ở gần nhất từ"><input name="after" type="date" defaultValue={sp.after as string} className={inputCls} /></Field>
        <Field label="Ở gần nhất đến"><input name="before" type="date" defaultValue={sp.before as string} className={inputCls} /></Field>
        <Field label="Đã mua shop"><select name="shop" defaultValue={(sp.shop as string) ?? ""} className={inputCls}><option value="">Tất cả</option><option value="1">Có</option><option value="0">Chưa</option></select></Field>
        <Field label="Nguồn"><input name="source" defaultValue={sp.source as string} placeholder="web, zalo, walk_in..." className={inputCls} /></Field>
        <Field label="Thẻ"><input name="tag" defaultValue={sp.tag as string} className={inputCls} /></Field>
        <Field label="Đồng ý marketing"><select name="consent" defaultValue={(sp.consent as string) ?? ""} className={inputCls}><option value="">Tất cả</option><option value="1">Có</option><option value="0">Không</option></select></Field>
        <button className="min-h-11 self-end rounded-md bg-[var(--accent)] px-4 font-semibold text-[var(--on-accent)]">Lọc</button>
      </form>
      <p className="mt-3 text-sm">{count ?? 0} khách phù hợp · <a href={`/admin/khach-hang/export?${qs}`} className="underline">Xuất CSV (cần MFA, có nhật ký)</a></p>
      <table className="mt-3 w-full text-left text-sm">
        <thead><tr className="border-b border-[var(--line)]"><th className="py-2">Khách</th><th>Liên hệ</th><th>Nguồn</th><th>Marketing</th></tr></thead>
        <tbody>{(list ?? []).map((c) => (
          <tr key={c.id} className="border-b border-[var(--line)]"><td className="py-2"><Link href={`/admin/khach-hang/${c.id}`} className="underline">{c.display_name}</Link></td><td>{c.email ?? ""} {c.phone ?? ""}</td><td>{c.source}</td><td>{c.marketing ? <StatusBadge tone="success">Có</StatusBadge> : <StatusBadge>Không</StatusBadge>}</td></tr>
        ))}</tbody>
      </table>
      {(dups ?? []).length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Gợi ý gộp (trùng liên hệ, chưa phải bằng chứng cùng người)</h2>
          <ul className="mt-2 flex flex-col gap-2">{(dups ?? []).map((d, i) => (
            <li key={i} className="rounded-md border border-[var(--line)] p-3 text-sm">
              <span>{d.kind}: {d.normalized} · {d.customer_ids.length} hồ sơ</span>
              <ActionForm action={mergeAction} submit="Gộp vào hồ sơ đầu" className="mt-2 flex flex-wrap items-end gap-2">
                <input type="hidden" name="survivor" value={d.customer_ids[0]} /><input type="hidden" name="merged" value={d.customer_ids[1]} />
                <Field label="Lý do"><input name="reason" required className={inputCls} /></Field>
                <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="verified" /> Đã xác minh với khách</label>
              </ActionForm>
            </li>))}</ul>
        </section>
      )}
    </>
  );
}

export default function CrmPage(props: PageProps<"/admin/khach-hang">) {
  return <Suspense fallback={<p>Đang tải...</p>}><Crm searchParams={props.searchParams} /></Suspense>;
}
