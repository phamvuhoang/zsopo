"use client";

import { signOut } from "@/app/(auth)/actions";
import { clearOfflineData } from "@/lib/pwa/cache-policy";

/** Clears device-side offline data (IndexedDB queue, page caches) before ending the session. */
export function LogoutButton() {
  return (
    <form action={async () => { await clearOfflineData(); navigator.serviceWorker?.controller?.postMessage("purge"); await signOut(); }}>
      <button className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm">Đăng xuất</button>
    </form>
  );
}
