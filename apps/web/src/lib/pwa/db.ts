import Dexie, { type EntityTable } from "dexie";
import type { ChecklistOp } from "@zsopo/core";
import { DB_PREFIX } from "./cache-policy";

export type QueuedOp = {
  operationId: string;
  taskId: string;
  op: ChecklistOp;
  mediaDraftIds: string[];
  status: "queued" | "syncing" | "applied" | "conflict" | "forbidden" | "rejected";
  attempts: number;
  createdAt: number;
  lastError?: string;
};
export type MediaDraft = { id: string; taskId: string; blob: Blob; mime: string; size: number; createdAt: number };

type OpsDb = Dexie & {
  operations: EntityTable<QueuedOp, "operationId">;
  mediaDrafts: EntityTable<MediaDraft, "id">;
};

const dbs = new Map<string, OpsDb>();

/** One database per signed-in account: data of different users never mixes on a shared device. */
export function opsDb(userId: string): OpsDb {
  let db = dbs.get(userId);
  if (!db) {
    db = new Dexie(`${DB_PREFIX}${userId}`) as OpsDb;
    db.version(1).stores({ operations: "&operationId, taskId, status, createdAt", mediaDrafts: "&id, taskId, createdAt" });
    dbs.set(userId, db);
  }
  return db;
}
