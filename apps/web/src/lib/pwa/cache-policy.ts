// What the Ops PWA may keep on a device. Sensitive data (identity documents, ledger, payments, CRM, guest contacts) is never cached.
export const DB_PREFIX = "zsopo-ops-";
export const PAGE_CACHE = "ops-pages-v1";
export const STATIC_CACHE = "ops-static-v1";
export const TASK_TTL_MS = 24 * 3600_000;
export const MEDIA_TTL_MS = 7 * 24 * 3600_000;
export const MEDIA_MAX_BYTES = 20 * 1024 * 1024;
/** Mirrors OFFLINE_PAGES in public/ops-sw.js. */
export const OFFLINE_PAGES = [/^\/ops\/?$/, /^\/ops\/buong-phong(\/[0-9a-f-]{36})?\/?$/, /^\/ops\/huong-dan\/?$/];

/** Remove every offline trace for this browser (logout, account switch). */
export async function clearOfflineData(): Promise<void> {
  const dbs = (await indexedDB.databases?.()) ?? [];
  await Promise.all(dbs.filter((d) => d.name?.startsWith(DB_PREFIX)).map((d) => new Promise((ok) => {
    const req = indexedDB.deleteDatabase(d.name!);
    req.onsuccess = req.onerror = req.onblocked = () => ok(null);
  })));
  if ("caches" in window) await Promise.all((await caches.keys()).filter((k) => k.startsWith("ops-")).map((k) => caches.delete(k)));
  try {
    localStorage.removeItem("zs-ops-account");
  } catch {}
}
