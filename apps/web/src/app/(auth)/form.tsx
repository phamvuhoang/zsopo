"use client";

import { useActionState } from "react";
import type { FormState } from "./actions";

type Field = { name: string; label: string; type?: string; autoComplete?: string };

/** Small accessible form shell for auth actions: labelled fields, alert/status regions, pending state. */
export function AuthForm(props: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  fields: Field[];
  submit: string;
  hidden?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(props.action, {});
  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      {Object.entries(props.hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {props.fields.map((f) => (
        <label key={f.name} className="flex flex-col gap-1 text-sm font-medium">
          {f.label}
          <input
            name={f.name}
            type={f.type ?? "text"}
            autoComplete={f.autoComplete}
            required
            className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-base"
          />
        </label>
      ))}
      {state.error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {state.error}
        </p>
      )}
      {state.status && (
        <p role="status" className="text-sm text-[var(--success)]">
          {state.status}
        </p>
      )}
      <button disabled={pending} className="min-h-11 rounded-md bg-[var(--accent)] px-4 font-semibold text-[var(--on-accent)] disabled:opacity-60">
        {pending ? "Đang xử lý..." : props.submit}
      </button>
    </form>
  );
}
