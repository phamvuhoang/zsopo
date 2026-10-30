"use client";

import type { ChecklistOp } from "@zsopo/core";
import { useState, useTransition } from "react";
import { applyChecklistOp } from "./actions";

export type ChecklistItem = { code: string; group: string; label: string; safety?: boolean; naAllowed?: boolean };
type Saved = Record<string, { result: "pass" | "fail" | "na"; note: string }>;

/** BP01 checklist grouped in 7 sections; each answer is one idempotent operation (T12 queues them offline). */
export function ChecklistForm({ taskId, version, items, saved, send = applyChecklistOp }: {
  taskId: string; version: number; items: ChecklistItem[]; saved: Saved;
  send?: (op: ChecklistOp, files?: File[]) => Promise<{ state: string; version: number } | { error: string }>;
}) {
  const [state, setState] = useState<Saved>(saved);
  const [base, setBase] = useState(version);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, File[]>>({}); // picked per item, sent with that item's next answer
  const [, start] = useTransition();
  const groups = [...new Set(items.map((i) => i.group))];

  const answer = (item: ChecklistItem, result: "pass" | "fail" | "na", note: string) =>
    start(async () => {
      if (result !== "pass" && !note.trim()) return setMsg((m) => ({ ...m, [item.code]: "Ghi chú bắt buộc khi không đạt hoặc không áp dụng" }));
      setState((s) => ({ ...s, [item.code]: { result, note } }));
      const files = photos[item.code] ?? [];
      const r = await send({ operationId: crypto.randomUUID(), taskId, baseVersion: base, itemCode: item.code, result, note: note || undefined, mediaIds: [] }, files);
      if ("error" in r) return setMsg((m) => ({ ...m, [item.code]: r.error }));
      setPhotos((p) => ({ ...p, [item.code]: (p[item.code] ?? []).filter((f) => !files.includes(f)) }));
      if (r.state === "applied" || r.state === "duplicate") setBase(r.version);
      setMsg((m) => ({ ...m, [item.code]: { applied: "Đã lưu", duplicate: "Đã lưu", conflict: "Xung đột: người khác vừa sửa mục này", forbidden: "Không có quyền hoặc việc đã đổi phân công", queued: "Chờ đồng bộ" }[r.state] ?? r.state }));
    });

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <fieldset key={g} className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3">
          <legend className="px-1 font-semibold">{g}</legend>
          <ul className="flex flex-col gap-4">
            {items.filter((i) => i.group === g).map((i) => {
              const cur = state[i.code];
              return (
                <li key={i.code}>
                  <p className="text-sm">{i.label} {i.safety && <span className="text-xs text-[var(--danger)]">(an toàn)</span>}</p>
                  <ItemControls item={i} current={cur} onAnswer={answer} photos={photos[i.code]?.length ?? 0}
                    onPhotos={(files) => setPhotos((p) => ({ ...p, [i.code]: [...(p[i.code] ?? []), ...files] }))} />
                  {msg[i.code] && <p role="status" className="mt-1 text-xs text-[var(--ink-2)]">{msg[i.code]}</p>}
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}

function ItemControls({ item, current, onAnswer, photos, onPhotos }: {
  item: ChecklistItem; current?: { result: string; note: string }; onAnswer: (i: ChecklistItem, r: "pass" | "fail" | "na", note: string) => void;
  photos: number; onPhotos: (files: File[]) => void;
}) {
  const [note, setNote] = useState(current?.note ?? "");
  const btn = (r: "pass" | "fail" | "na", label: string) => (
    <button type="button" onClick={() => onAnswer(item, r, note)} aria-pressed={current?.result === r}
      className={`min-h-11 rounded-md border px-3 text-sm ${current?.result === r ? "border-[var(--accent)] bg-[var(--accent-soft)] font-semibold" : "border-[var(--line)]"}`}>
      {label}
    </button>
  );
  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      {btn("pass", "Đạt")}
      {btn("fail", "Không đạt")}
      {(item.naAllowed ?? true) && btn("na", "Không áp dụng")}
      <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-[var(--line)] px-3 text-sm focus-within:outline focus-within:outline-2 focus-within:outline-[var(--accent)]">
        {photos ? `Chụp thêm ảnh (${photos})` : "Chụp ảnh"}
        <input type="file" accept="image/*" capture="environment" aria-label={`Ảnh: ${item.label}`} className="sr-only"
          onChange={(e) => { onPhotos(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
      </label>
      <input aria-label={`Ghi chú ${item.label}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú"
        className="min-h-11 flex-1 rounded-md border border-[var(--line)] bg-[var(--bg)] px-2 text-sm" />
    </div>
  );
}
