import { Price, StatusBadge } from "@zsopo/ui";
import { notFound } from "next/navigation";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { noteAction, tagAction } from "@/features/crm/actions";
import { getStaffContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Hồ sơ khách" };

export default async function Customer360({ params }: PageProps<"/admin/khach-hang/[id]">) {
  const { id } = await params;
  await getStaffContext(`/admin/khach-hang/${id}`);
  const db = await createClient();
  const { data: c } = await db.schema("core").from("customers").select("id, display_name, source, created_at, merged_into").eq("id", id).maybeSingle();
  if (!c) notFound();
  const [{ data: contacts }, { data: consents }, { data: timeline }, { data: tags }] = await Promise.all([
    db.schema("core").from("customer_contacts").select("kind, value, verified_at").eq("customer_id", id),
    db.schema("core").from("consent_records").select("purpose, version, accepted_at, revoked_at").eq("customer_id", id),
    db.schema("crm").rpc("customer_timeline", { p_customer: id }),
    db.schema("crm").from("customer_tags").select("tags(name)").eq("customer_id", id),
  ]);
  return (
    <>
      <h1 className="text-2xl font-semibold">{c.display_name}</h1>
      <p className="text-sm text-[var(--ink-2)]">Nguồn {c.source} · tạo {new Date(c.created_at).toLocaleDateString("vi-VN")}{c.merged_into ? " · đã gộp vào hồ sơ khác" : ""}</p>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <section><h2 className="font-semibold">Liên hệ</h2><ul className="text-sm">{(contacts ?? []).map((x, i) => <li key={i}>{x.kind}: {x.value} {x.verified_at ? <StatusBadge tone="success">Đã xác minh</StatusBadge> : <StatusBadge>Chưa xác minh</StatusBadge>}</li>)}</ul></section>
        <section><h2 className="font-semibold">Đồng ý</h2><ul className="text-sm">{(consents ?? []).map((x, i) => <li key={i}>{x.purpose} {x.version} · {x.revoked_at ? "đã rút" : "hiệu lực"}</li>)}</ul></section>
      </div>
      <section className="mt-4">
        <h2 className="font-semibold">Thẻ</h2>
        <p className="text-sm">{(tags ?? []).map((t) => (t.tags as unknown as { name: string })?.name).join(", ") || "Chưa có"}</p>
        <ActionForm action={tagAction} submit="Gắn thẻ" className="mt-2 flex items-end gap-2"><input type="hidden" name="customerId" value={id} /><Field label="Thẻ"><input name="tag" required className={inputCls} /></Field></ActionForm>
      </section>
      <section className="mt-6">
        <h2 className="font-semibold">Dòng thời gian (lưu trú, shop, dịch vụ)</h2>
        <p className="text-xs text-[var(--ink-3)]">Học tập, tư vấn và điểm thưởng chưa mở ở giai đoạn này.</p>
        <ul className="mt-2 flex flex-col gap-1 text-sm">{((timeline ?? []) as { kind: string; at: string; title: string; detail: { total?: number; amount?: number; body?: string; status?: string } }[]).map((e, i) => (
          <li key={i}>{new Date(e.at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} · {e.title} {e.detail.total != null && <Price value={String(e.detail.total)} />}{e.detail.amount != null && <Price value={String(e.detail.amount)} />} {e.detail.status ?? ""} {e.detail.body ?? ""}</li>
        ))}</ul>
        <ActionForm action={noteAction} submit="Thêm ghi chú" className="mt-3 flex items-end gap-2"><input type="hidden" name="customerId" value={id} /><Field label="Ghi chú"><input name="body" required className={`${inputCls} w-96 max-w-full`} /></Field></ActionForm>
      </section>
    </>
  );
}
