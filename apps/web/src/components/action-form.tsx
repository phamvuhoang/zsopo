"use client";

import { useActionState } from "react";

export type ActionState = { error?: string; status?: string };
export type FormAction = (state: ActionState, form: FormData) => Promise<ActionState>;

/** Generic admin/ops form: server action + inline status/alert, disables while pending. */
export function ActionForm({
  action, children, submit, className, danger,
}: { action: FormAction; children?: React.ReactNode; submit: string; className?: string; danger?: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={className ?? "flex flex-wrap items-end gap-2"}>
      {children}
      <button
        disabled={pending}
        className={`min-h-11 rounded-md px-4 text-sm font-semibold disabled:opacity-60 ${danger ? "border border-[var(--danger)] text-[var(--danger)]" : "bg-[var(--accent)] text-[var(--on-accent)]"}`}
      >
        {pending ? "Đang lưu..." : submit}
      </button>
      {state.error && <p role="alert" className="basis-full text-sm text-[var(--danger)]">{state.error}</p>}
      {state.status && <p role="status" className="basis-full text-sm text-[var(--success)]">{state.status}</p>}
    </form>
  );
}

export const inputCls = "min-h-11 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-[var(--ink-2)]">
      {label}
      {children}
    </label>
  );
}
