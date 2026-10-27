import { drainQueue, type ChecklistOp, type SyncResult } from "@zsopo/core";
import { createClient } from "@/lib/supabase/browser";
import { opsDb } from "./db";
import { SYNC_EVENT } from "./queue";

type Apply = (op: ChecklistOp) => Promise<SyncResult | { error: string }>;

/** Upload offline photos (private evidence bucket, staff-scoped path) and register media rows. */
async function uploadDrafts(userId: string, locationId: string, entityId: string, ids: string[]): Promise<string[]> {
  const db = opsDb(userId);
  const supabase = createClient();
  const out: string[] = [];
  for (const id of ids) {
    const d = await db.mediaDrafts.get(id);
    if (!d) continue;
    const path = `${locationId}/${d.taskId}/${id}.jpg`;
    const up = await supabase.storage.from("evidence").upload(path, d.blob, { contentType: d.mime, upsert: true });
    if (up.error) throw new Error(up.error.message);
    const { data, error } = await supabase.schema("core").from("media")
      .insert({ id, entity_id: entityId, location_id: locationId, bucket: "evidence", path, classification: "evidence", alt: "Ảnh checklist buồng phòng", mime: d.mime, bytes: d.size, owner_id: userId })
      .select("id").maybeSingle();
    if (error && !/duplicate/.test(error.message)) throw new Error(error.message);
    out.push(data?.id ?? id);
    await db.mediaDrafts.delete(id);
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
        return apply({ ...q.op, mediaIds });
      },
      async (q, patch) => {
        await db.operations.update(q.operationId, { ...patch, ...(patch.status === "queued" ? { attempts: q.attempts + 1 } : {}), ...(patch.status === "applied" ? { mediaDraftIds: [] } : {}) });
      },
    );
    window.dispatchEvent(new Event(SYNC_EVENT));
  };
  if ("locks" in navigator) await navigator.locks.request(`zsopo-sync-${userId}`, run);
  else await run();
}
