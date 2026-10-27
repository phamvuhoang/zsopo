import { StatusBadge } from "@zsopo/ui";
import { createClient } from "@/lib/supabase/server";

type Health = Record<string, number> & { checkedAt: string; incidents: { id: string; title: string; severity: string; openedAt: string; runbook: string | null }[]; jobs: { job: string; lastRun: string; lastStatus: string }[]; cron: { name: string; schedule: string; active: boolean }[] };

const ROWS: [string, string, string][] = [
  ["outboxDead", "Tin gửi thất bại hẳn (cần gửi lại)", "docs/runbooks/notifications.md"],
  ["outboxOverdue", "Tin chờ gửi quá 10 phút", "docs/runbooks/notifications.md"],
  ["feedsFailing", "Lịch OTA lỗi từ 2 lần", "docs/runbooks/ota-sync.md"],
  ["feedsStale", "Lịch OTA chưa đồng bộ trong 1 giờ", "docs/runbooks/ota-sync.md"],
  ["calendarConflicts", "Xung đột lịch OTA đang mở", "docs/runbooks/ota-sync.md"],
  ["paymentsInReview", "Khoản tiền cần đối soát", "docs/runbooks/payments.md"],
  ["transferReports", "Khách báo đã chuyển khoản, chờ kiểm", "docs/runbooks/payments.md"],
  ["ticketsEscalated", "Sự cố quá hạn/nguy hiểm chưa xử lý", "docs/runbooks/offline-conflicts.md"],
  ["identityPurgeOverdue", "Giấy tờ quá hạn chưa xóa", "docs/runbooks/keys.md"],
];

/** Filtered health projection (no secrets, no provider dashboards). */
export async function HealthPanel({ entityId }: { entityId: string }) {
  const { data, error } = await (await createClient()).schema("ops_config").rpc("health_summary", { p_entity: entityId });
  if (error || !data) return <p role="alert">Không tải được trạng thái hệ thống.</p>;
  const h = data as Health;
  return (
    <>
      <p className="text-sm text-[var(--ink-3)]">Cập nhật {new Date(h.checkedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {ROWS.map(([k, label, runbook]) => (
          <li key={k} className="flex items-center justify-between gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] p-3 text-sm">
            <span>{label}<span className="block text-xs text-[var(--ink-3)]">{runbook}</span></span>
            <StatusBadge tone={h[k] ? "danger" : "success"}>{h[k] ?? 0}</StatusBadge>
          </li>
        ))}
      </ul>
      <h2 className="mt-6 font-semibold">Sự cố vận hành đang mở ({h.incidentsOpen})</h2>
      <ul className="mt-2 text-sm">{h.incidents.map((i) => <li key={i.id}><StatusBadge tone={i.severity === "critical" || i.severity === "high" ? "danger" : "warning"}>{i.severity}</StatusBadge> {i.title} {i.runbook ? `· ${i.runbook}` : ""}</li>)}</ul>
      <h2 className="mt-6 font-semibold">Tác vụ định kỳ</h2>
      <ul className="mt-2 text-sm">{h.cron.map((c) => <li key={c.name}>{c.name} · {c.schedule} · {c.active ? "đang bật" : "tắt"}</li>)}</ul>
      <ul className="mt-2 text-sm">{h.jobs.map((j) => <li key={j.job}>{j.job}: lần chạy cuối {new Date(j.lastRun).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} ({j.lastStatus})</li>)}</ul>
    </>
  );
}
