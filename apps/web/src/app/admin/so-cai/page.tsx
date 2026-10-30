import { Price } from "@zsopo/ui";
import { Suspense } from "react";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Sổ cái" };

async function Ledger({ searchParams }: Pick<PageProps<"/admin/so-cai">, "searchParams">) {
  const ctx = await getStaffContext("/admin/so-cai");
  await requirePermission("ledger.read", ctx.location.entity_id, null, "/admin/so-cai");
  const sp = await searchParams;
  const account = typeof sp.tk === "string" ? sp.tk : "";
  let q = (await createClient()).schema("commerce").from("ledger_entries").select("id, event_id, account, amount, source, recognition_date, created_at").eq("entity_id", ctx.location.entity_id).order("id", { ascending: false }).limit(200);
  if (account) q = q.eq("account", account);
  const { data } = await q;
  return (
    <>
      <h1 className="text-2xl font-semibold">Sổ cái vận hành</h1>
      <p className="text-sm text-[var(--ink-2)]">Chỉ ghi thêm; sửa sai bằng bút toán đảo. Đây là sổ phụ để đối soát, không thay phần mềm kế toán/hóa đơn điện tử.</p>
      <form className="mt-3 flex items-end gap-2 text-sm"><label className="flex flex-col gap-1">Tài khoản<input name="tk" defaultValue={account} className="min-h-11 rounded-md border border-[var(--line)] px-2" placeholder="bank, cash, deposit_liability..." /></label><button className="min-h-11 rounded-md border px-3">Lọc</button>
        <a href={`/admin/so-cai/export${account ? `?tk=${account}` : ""}`} className="ml-2 underline">Xuất CSV (cần MFA)</a></form>
      <table className="mt-3 w-full text-left text-sm">
        <thead><tr className="border-b border-[var(--line)]"><th className="py-2">Ngày</th><th>Sự kiện</th><th>Tài khoản</th><th className="text-right">Nợ (+) / Có (-)</th></tr></thead>
        <tbody>{(data ?? []).map((e) => <tr key={e.id} className="border-b border-[var(--line)]"><td className="py-1">{e.recognition_date}</td><td className="font-mono text-xs">{e.source} · {e.event_id.slice(0, 8)}</td><td>{e.account}</td><td className="text-right"><Price value={String(e.amount)} /></td></tr>)}</tbody>
      </table>
    </>
  );
}

export default function LedgerPage(props: PageProps<"/admin/so-cai">) {
  return <Suspense fallback={<p>Đang tải...</p>}><Ledger searchParams={props.searchParams} /></Suspense>;
}
