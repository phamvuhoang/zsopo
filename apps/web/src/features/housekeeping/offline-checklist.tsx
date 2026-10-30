"use client";

import type { ChecklistOp } from "@zsopo/core";
import { useEffect, useState } from "react";
import { ActionForm } from "@/components/action-form";
import { SYNC_EVENT, enqueue, opsForTask } from "@/lib/pwa/queue";
import { syncNow } from "@/lib/pwa/sync";
import { applyChecklistOp, submitInspection } from "./actions";
import { ChecklistForm, type ChecklistItem } from "./checklist-form";

type Saved = Record<string, { result: "pass" | "fail" | "na"; note: string }>;

/** Checklist bound to the device queue: every answer is stored locally first, then synced when online. */
export function OfflineChecklist(props: { userId: string; locationId: string; entityId: string; taskId: string; version: number; items: ChecklistItem[]; saved: Saved }) {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [version, setVersion] = useState(props.version);
  useEffect(() => {
    opsForTask(props.userId, props.taskId)
      .then((ops) => {
        const merged = { ...props.saved };
        for (const o of ops) if (o.status !== "applied") merged[o.op.itemCode] = { result: o.op.result, note: o.op.note ?? "" };
        setSaved(merged);
      })
      .catch(() => setSaved(props.saved));
  }, [props.userId, props.taskId, props.saved]);

  // Any sync (an answer, "Đồng bộ ngay", reconnect) may move the task version: BM02 must carry the newest one.
  useEffect(() => {
    const onSync = () =>
      opsForTask(props.userId, props.taskId)
        .then((ops) => {
          const v = Math.max(0, ...ops.map((o) => o.serverVersion ?? 0));
          if (v) setVersion((cur) => Math.max(cur, v));
        })
        .catch(() => {});
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, [props.userId, props.taskId]);

  const send = async (op: ChecklistOp, files: File[] = []) => {
    try {
      await enqueue(props.userId, op, files); // syncNow uploads the drafts and fills op.mediaIds
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Không lưu được" };
    }
    if (navigator.onLine) await syncNow(props.userId, { locationId: props.locationId, entityId: props.entityId }, applyChecklistOp);
    const mine = (await opsForTask(props.userId, props.taskId)).find((o) => o.operationId === op.operationId);
    const state = mine?.status === "applied" ? "applied" : mine?.status === "conflict" ? "conflict" : mine?.status === "forbidden" ? "forbidden" : "queued";
    return { state, version: mine?.serverVersion ?? version };
  };

  if (!saved) return <p>Đang tải checklist...</p>;
  return (
    <>
      <ChecklistForm taskId={props.taskId} version={props.version} items={props.items} saved={saved} send={send} />
      <ActionForm action={submitInspection} submit="Hoàn tất tự kiểm (BM02), gửi nghiệm thu" className="mt-6">
        <input type="hidden" name="taskId" value={props.taskId} />
        <input type="hidden" name="version" value={version} />
      </ActionForm>
    </>
  );
}
