import { StatusBadge, type Tone } from "@zsopo/ui";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";
import { retryOutbox, saveTemplate } from "./actions";
import { createCampaignAction, sendCampaignAction, snapshotAction } from "@/features/crm/actions";

export const instant = false;
export const metadata = { title: "Thông báo" };

const TONE: Record<string, Tone> = { sent: "success", pending: "neutral", processing: "info", failed: "warning", dead: "danger", disabled: "neutral", cancelled: "neutral" };
const fmt = (t: string) => new Date(t).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

export default async function NotificationsAdmin() {
  const ctx = await getStaffContext("/admin/thong-bao");
  await requirePermission("notifications.read", ctx.location.entity_id, null, "/admin/thong-bao");
  const db = await createClient();
  const [{ data: jobs }, { data: logs }, { data: templates }] = await Promise.all([
    db.schema("core").from("outbox").select("id, kind, status, attempts, next_run_at, last_error, created_at").order("created_at", { ascending: false }).limit(50),
    db.schema("ops_config").from("delivery_logs").select("outbox_id, channel, provider, recipient_masked, status, error, created_at").order("created_at", { ascending: false }).limit(200),
    db.schema("ops_config").from("notification_templates").select("id, key, channel, subject, body, allowed_vars").eq("active", true).order("key"),
  ]);
  const { data: campaigns } = await db.schema("crm").from("campaigns").select("id, name, subject, status, sent_at").order("created_at", { ascending: false }).limit(20);
  const logsByJob = new Map<string, NonNullable<typeof logs>>();
  for (const l of logs ?? []) logsByJob.set(l.outbox_id, [...(logsByJob.get(l.outbox_id) ?? []), l]);
  return (
    <>
      <h1 className="text-2xl font-semibold">Thông báo giao dịch</h1>
      <p className="mt-1 text-sm text-[var(--ink-2)]">Email là kênh chính. Zalo OA chưa được cấp nên hiển thị trạng thái “chưa bật”, không giả gửi thành công.</p>
      <section className="mt-6 overflow-x-auto" aria-labelledby="hang-doi">
        <h2 id="hang-doi" className="text-lg font-semibold">Hàng đợi gần đây</h2>
        <table className="mt-2 w-full min-w-[760px] text-left text-sm">
          <thead><tr className="border-b border-[var(--line)]"><th className="py-2">Loại</th><th>Trạng thái</th><th>Lần thử</th><th>Kênh</th><th>Lỗi</th><th>Tạo lúc</th><th /></tr></thead>
          <tbody>
            {(jobs ?? []).map((j) => (
              <tr key={j.id} className="border-b border-[var(--line)] align-top">
                <td className="py-2 font-mono text-xs">{j.kind}</td>
                <td><StatusBadge tone={TONE[j.status] ?? "neutral"}>{j.status}</StatusBadge></td>
                <td>{j.attempts}</td>
                <td className="text-xs">{(logsByJob.get(j.id) ?? []).map((l, i) => <div key={i}>{l.channel}: {l.status} {l.recipient_masked ?? ""}</div>)}</td>
                <td className="max-w-64 text-xs text-[var(--danger)]">{j.last_error}</td>
                <td className="text-xs">{fmt(j.created_at)}</td>
                <td>{["dead", "failed", "disabled"].includes(j.status) && <ActionForm action={retryOutbox} submit="Gửi lại"><input type="hidden" name="id" value={j.id} /></ActionForm>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="mt-8" aria-labelledby="chien-dich">
        <h2 id="chien-dich" className="text-lg font-semibold">Chiến dịch email (chỉ khách đồng ý nhận)</h2>
        <ActionForm action={createCampaignAction} submit="Tạo chiến dịch nháp" className="mt-2 grid gap-2 md:grid-cols-2">
          <input type="hidden" name="entityId" value={ctx.location.entity_id} />
          <Field label="Tên"><input name="name" required className={inputCls} /></Field>
          <Field label='Phân khúc (JSON, ví dụ {"source":"web","minVisits":1})'><input name="filter" defaultValue="{}" className={`${inputCls} font-mono`} /></Field>
          <Field label="Tiêu đề"><input name="subject" required className={inputCls} /></Field>
          <Field label="Nội dung"><textarea name="body" required className={`${inputCls} py-2`} /></Field>
        </ActionForm>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {(campaigns ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--line)] p-2">
              <span className="font-semibold">{c.name}</span><StatusBadge>{c.status}</StatusBadge>
              {["draft", "snapshotted"].includes(c.status) && <ActionForm action={snapshotAction} submit="Chốt người nhận"><input type="hidden" name="campaignId" value={c.id} /></ActionForm>}
              {c.status === "snapshotted" && (
                <ActionForm action={sendCampaignAction} submit="Gửi" className="flex items-center gap-2">
                  <input type="hidden" name="campaignId" value={c.id} />
                  <label className="flex min-h-11 items-center gap-1"><input type="checkbox" name="confirm" /> Tôi xác nhận gửi</label>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-8" aria-labelledby="mau">
        <h2 id="mau" className="text-lg font-semibold">Mẫu tin</h2>
        <ul className="mt-2 flex flex-col gap-3">
          {(templates ?? []).map((t) => (
            <li key={t.id} className="rounded-md border border-[var(--line)] p-3">
              <p className="font-mono text-xs">{t.key} · {t.channel}</p>
              <ActionForm action={saveTemplate} submit="Lưu mẫu" className="mt-2 grid gap-2">
                <input type="hidden" name="id" value={t.id} />
                <Field label="Tiêu đề"><input name="subject" defaultValue={t.subject} className={inputCls} /></Field>
                <Field label="Nội dung"><textarea name="body" defaultValue={t.body} rows={6} className={`${inputCls} py-2`} /></Field>
                <p className="text-xs text-[var(--ink-3)]">Biến cho phép: {t.allowed_vars.map((v) => `{{${v}}}`).join(", ")}</p>
              </ActionForm>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
