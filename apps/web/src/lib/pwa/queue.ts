import type { ChecklistOp } from "@zsopo/core";
import { MEDIA_MAX_BYTES, MEDIA_TTL_MS, photoError } from "./cache-policy";
import { opsDb, type QueuedOp } from "./db";

export const SYNC_EVENT = "zs-ops-sync";
const notify = () => window.dispatchEvent(new Event(SYNC_EVENT));

/** Persist an operation before any network attempt; survives reload, restart and SW updates. */
export async function enqueue(userId: string, op: ChecklistOp, mediaDraftIds: string[] = []): Promise<void> {
  try {
    await opsDb(userId).operations.put({ operationId: op.operationId, taskId: op.taskId, op, mediaDraftIds, status: "queued", attempts: 0, createdAt: Date.now() });
  } catch (e) {
    throw new Error(e instanceof Error && e.name === "QuotaExceededError" ? "Bộ nhớ thiết bị đầy: thao tác chưa được lưu" : "Không lưu được trên thiết bị");
  }
  notify();
}

export async function saveMediaDraft(userId: string, taskId: string, file: File): Promise<string> {
  const bad = photoError(file);
  if (bad) throw new Error(bad);
  const db = opsDb(userId);
  const used = (await db.mediaDrafts.toArray()).reduce((a, m) => a + m.size, 0);
  if (used + file.size > MEDIA_MAX_BYTES) throw new Error("Ảnh chờ đồng bộ đã đầy (20MB). Hãy đồng bộ trước khi chụp thêm.");
  const id = crypto.randomUUID();
  await db.mediaDrafts.put({ id, taskId, blob: file, mime: file.type || "image/jpeg", size: file.size, createdAt: Date.now() });
  return id;
}

export async function opsForTask(userId: string, taskId: string): Promise<QueuedOp[]> {
  return opsDb(userId).operations.where("taskId").equals(taskId).sortBy("createdAt");
}

export async function counts(userId: string) {
  const all = await opsDb(userId).operations.toArray();
  return {
    queued: all.filter((o) => o.status === "queued" || o.status === "syncing").length,
    conflict: all.filter((o) => o.status === "conflict"),
    forbidden: all.filter((o) => o.status === "forbidden" || o.status === "rejected"),
    applied: all.filter((o) => o.status === "applied").length,
  };
}

/** Drop old applied ops and expired media drafts (TTL). */
export async function prune(userId: string) {
  const db = opsDb(userId);
  const old = Date.now() - 24 * 3600_000;
  await db.operations.where("status").equals("applied").and((o) => o.createdAt < old).delete();
  await db.mediaDrafts.where("createdAt").below(Date.now() - MEDIA_TTL_MS).delete();
}

export async function dismiss(userId: string, operationId: string) {
  await opsDb(userId).operations.delete(operationId);
  notify();
}
