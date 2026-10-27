"use client";

import type { ChecklistOp } from "@zsopo/core";
import { useEffect, useState } from "react";
import { enqueue, opsForTask } from "@/lib/pwa/queue";
import { syncNow } from "@/lib/pwa/sync";
import { applyChecklistOp } from "./actions";
import { ChecklistForm, type ChecklistItem } from "./checklist-form";

type Saved = Record<string, { result: "pass" | "fail" | "na"; note: string }>;

/** Checklist bound to the device queue: every answer is stored locally first, then synced when online. */
export function OfflineChecklist(props: { userId: string; locationId: string; entityId: string; taskId: string; version: number; items: ChecklistItem[]; saved: Saved }) {
  const [saved, setSaved] = useState<Saved | null>(null);
  useEffect(() => {
    opsForTask(props.userId, props.taskId)
      .then((ops) => {
        const merged = { ...props.saved };
        for (const o of ops) if (o.status !== "applied") merged[o.op.itemCode] = { result: o.op.result, note: o.op.note ?? "" };
        setSaved(merged);
      })
      .catch(() => setSaved(props.saved));
  }, [props.userId, props.taskId, props.saved]);

  const send = async (op: ChecklistOp) => {
    try {
      await enqueue(props.userId, op);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Không lưu được" };
    }
    if (navigator.onLine) await syncNow(props.userId, { locationId: props.locationId, entityId: props.entityId }, applyChecklistOp);
    const mine = (await opsForTask(props.userId, props.taskId)).find((o) => o.operationId === op.operationId);
    const state = mine?.status === "applied" ? "applied" : mine?.status === "conflict" ? "conflict" : mine?.status === "forbidden" ? "forbidden" : "queued";
    return { state, version: props.version };
  };

  if (!saved) return <p>Đang tải checklist...</p>;
  return <ChecklistForm taskId={props.taskId} version={props.version} items={props.items} saved={saved} send={send} />;
}
