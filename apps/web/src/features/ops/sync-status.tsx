"use client";

import { useCallback, useEffect, useState } from "react";
import { applyChecklistOp } from "@/features/housekeeping/actions";
import { clearOfflineData } from "@/lib/pwa/cache-policy";
import type { QueuedOp } from "@/lib/pwa/db";
import { SYNC_EVENT, counts, dismiss, prune } from "@/lib/pwa/queue";
import { syncNow } from "@/lib/pwa/sync";

type Counts = Awaited<ReturnType<typeof counts>>;

/** Registers the Ops service worker, guards account switches, shows queue state and runs foreground sync. */
export function SyncStatus({ userId, locationId, entityId }: { userId: string; locationId: string; entityId: string }) {
  const [c, setC] = useState<Counts | null>(null);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => counts(userId).then(setC).catch(() => setC(null)), [userId]);
  const sync = useCallback(async () => {
    setBusy(true);
    try {
      await syncNow(userId, { locationId, entityId }, applyChecklistOp);
    } finally {
      setBusy(false);
      refresh();
    }
  }, [userId, locationId, entityId, refresh]);

  useEffect(() => {
    (async () => {
      // Another account used this device before: wipe its offline data first.
      let prev: string | null = null;
      try {
        prev = localStorage.getItem("zs-ops-account");
      } catch {}
      if (prev && prev !== userId) await clearOfflineData();
      try {
        localStorage.setItem("zs-ops-account", userId);
      } catch {}
      if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") await navigator.serviceWorker.register("/ops-sw.js", { scope: "/ops/" });
      await prune(userId);
      setOnline(navigator.onLine);
      await refresh();
      if (navigator.onLine) await sync();
    })();
    const on = () => { setOnline(true); sync(); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener(SYNC_EVENT, refresh);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener(SYNC_EVENT, refresh);
    };
  }, [userId, refresh, sync]);

  if (!c) return null;
  const problems: QueuedOp[] = [...c.conflict, ...c.forbidden];
  return (
    <div className="border-b border-[var(--line)] bg-[var(--surface-2)] px-4 py-2 text-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
        {!online && <span className="font-semibold text-[var(--warning)]">Đang ngoại tuyến: chỉ ghi checklist/ảnh/ghi chú; thanh toán, nhận/trả phòng, nghiệm thu cần mạng.</span>}
        <span role="status">{c.queued > 0 ? `Chờ đồng bộ (${c.queued})` : "Đã đồng bộ"}</span>
        {c.conflict.length > 0 && <span className="text-[var(--danger)]">Xung đột ({c.conflict.length})</span>}
        {c.forbidden.length > 0 && <span className="text-[var(--danger)]">Cần xử lý ({c.forbidden.length})</span>}
        <button type="button" onClick={sync} disabled={busy || !online} className="min-h-11 rounded-md border border-[var(--line-2)] px-3 disabled:opacity-50">
          {busy ? "Đang đồng bộ..." : "Đồng bộ ngay"}
        </button>
      </div>
      {problems.length > 0 && (
        <ul className="mx-auto mt-2 flex max-w-5xl flex-col gap-1">
          {problems.map((p) => (
            <li key={p.operationId} className="flex flex-wrap items-center gap-2 rounded-md bg-[var(--surface)] p-2">
              <span>{p.status === "conflict" ? "Người khác đã cập nhật mục này trên máy chủ. Bản nháp của bạn:" : p.status === "rejected" ? `Máy chủ từ chối (${p.lastError ?? "dữ liệu không hợp lệ"}). Bản nháp:` : "Việc đã đổi phân công hoặc quyền. Bản nháp:"}</span>
              <span className="font-mono text-xs">{p.op.itemCode} = {p.op.result}</span>
              {p.op.note && <span>{p.op.note}</span>}
              <a href={`/ops/buong-phong/${p.taskId}`} className="underline">Xem bản máy chủ</a>
              <button type="button" onClick={() => dismiss(userId, p.operationId)} className="underline">Bỏ bản nháp</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
