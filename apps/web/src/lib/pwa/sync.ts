import { drainQueue, type ChecklistOp, type SyncResult } from "@zsopo/core";
import { createClient } from "@/lib/supabase/browser";
import { opsDb } from "./db";
import { SYNC_EVENT } from "./queue";

type Apply = (op: ChecklistOp) => Promise<SyncResult | { error: string }>;

/** An HTTP 4xx fails the same way on every retry, so it rejects the op instead of blocking the queue. Network (no status), 5xx, auth, timeout and rate limit are retried. */
const refused = (status?: number) => !!status && status >= 400 && status < 500 && ![401, 408, 429].includes(status);

/**
 * Upload offline photos (private evidence bucket, staff-scoped path) and register media rows.
 * Drafts stay on the device until the op is final, so a retry after a failed apply uploads again
 * (upsert + same media id: no second row) instead of sending the op without its photo.
 */
async function uploadDrafts(userId: string, locationId: string, entityId: string, ids: string[]): Promise<string[] | { error: string }> {
  const db = opsDb(userId);
  const supabase = createClient();
  const out: string[] = [];
  for (const id of ids) {
    const d = await db.mediaDrafts.get(id);
    if (!d) return { error: "Ảnh chờ gửi không còn trên thiết bị (quá 7 ngày hoặc đã bị xóa)" }; // never apply the answer without its photo
    const path = `${locationId}/${d.taskId}/${id}.jpg`;
    const up = await supabase.storage.from("evidence").upload(path, d.blob, { contentType: d.mime, upsert: true });
    if (up.error) {
      if (refused(up.error.status)) return { error: `Kho ảnh không nhận ảnh chờ gửi: ${up.error.message}` };
      throw new Error(up.error.message);
    }
    const { data, error, status } = await supabase.schema("core").from("media")
      .insert({ id, entity_id: entityId, location_id: locationId, bucket: "evidence", path, classification: "evidence", alt: "Ảnh checklist buồng phòng", mime: d.mime, bytes: d.size, owner_id: userId })
      .select("id").maybeSingle();
    if (error && !/duplicate/.test(error.message)) {
      if (refused(status)) return { error: `Không ghi được ảnh chờ gửi: ${error.message}` };
      throw new Error(error.message);
    }
    out.push(data?.id ?? id);
  }
  return out;
}

/**
 * Foreground sync (app open, online event, "Đồng bộ ngay"). Sequential, idempotent by operationId,
 * serialised across tabs with Web Locks when available. Conflicts/forbidden are kept for the user to resolve.
 */
export async function syncNow(userId: string, ctx: { locationId: string; entityId: string }, apply: Apply): Promise<void> {
  const run = async () => {
    const db = opsDb(userId);
    const pending = await db.operations.where("status").anyOf("queued", "syncing").sortBy("createdAt");
    // A rejected op ({error}) is parked as "rejected" for the user; only network failures stop the drain.
    await drainQueue(
      pending.filter(() => navigator.onLine),
      async (q) => {
        const mediaIds = q.mediaDraftIds.length ? await uploadDrafts(userId, ctx.locationId, ctx.entityId, q.mediaDraftIds) : q.op.mediaIds;
        return "error" in mediaIds ? mediaIds : apply({ ...q.op, mediaIds });
      },
      async (q, patch) => {
        const final = patch.status !== "queued" && patch.status !== "syncing"; // applied, conflict, forbidden, rejected: never re-sent
        if (final && q.mediaDraftIds.length) await db.mediaDrafts.bulkDelete(q.mediaDraftIds);
        await db.operations.update(q.operationId, { ...patch, ...(patch.status === "queued" ? { attempts: q.attempts + 1 } : {}), ...(final ? { mediaDraftIds: [] } : {}) });
      },
    );
    window.dispatchEvent(new Event(SYNC_EVENT));
  };
  if ("locks" in navigator) await navigator.locks.request(`zsopo-sync-${userId}`, run);
  else await run();
}
