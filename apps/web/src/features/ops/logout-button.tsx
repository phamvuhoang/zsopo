"use client";

import { useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import { clearOfflineData } from "@/lib/pwa/cache-policy";
import { counts } from "@/lib/pwa/queue";

/**
 * Logout wipes device-side offline data (IndexedDB queue, page caches), but only after the session really ended,
 * and only after the user agreed to drop work that has not reached the server.
 */
export function LogoutButton({ userId }: { userId: string }) {
  const [unsynced, setUnsynced] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const logout = async (discard: boolean) => {
    setError("");
    if (!discard) {
      const c = await counts(userId).catch(() => null);
      const n = c ? c.queued + c.conflict.length + c.forbidden.length : 0;
      if (n > 0) return setUnsynced(n);
    }
    setBusy(true);
    try {
      const r = await signOut();
      if (r.error) throw new Error(r.error);
    } catch {
      setBusy(false);
      return setError("Không đăng xuất được (mất mạng?). Dữ liệu trên máy vẫn được giữ.");
    }
    await clearOfflineData();
    navigator.serviceWorker?.controller?.postMessage("purge");
    window.location.assign("/dang-nhap");
  };

  return (
    <div className="flex flex-col items-end gap-2 text-sm">
      <button type="button" onClick={() => logout(false)} disabled={busy} className="min-h-11 rounded-md border border-[var(--line)] px-3">Đăng xuất</button>
      {unsynced > 0 && (
        <div className="max-w-xs rounded-md bg-[var(--warning-soft)] p-2">
          <p>Còn {unsynced} thao tác chưa đồng bộ lên máy chủ. Hãy bấm &quot;Đồng bộ ngay&quot; và xử lý xung đột trước. Đăng xuất bây giờ sẽ xóa chúng khỏi máy.</p>
          <button type="button" onClick={() => logout(true)} disabled={busy} className="mt-2 min-h-11 rounded-md border border-[var(--danger)] px-3 text-[var(--danger)]">Bỏ dữ liệu và đăng xuất</button>
        </div>
      )}
      {error && <p role="alert" className="text-[var(--danger)]">{error}</p>}
    </div>
  );
}
