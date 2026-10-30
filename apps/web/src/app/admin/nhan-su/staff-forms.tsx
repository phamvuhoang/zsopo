"use client";

import { useActionState } from "react";
import { ROLE_LABEL } from "@/lib/labels";
import { disableStaff, inviteStaff, revokeRole, type StaffState } from "./actions";

const input = "min-h-11 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3";

function Feedback({ state }: { state: StaffState }) {
  if (state.error) return <p role="alert" className="text-sm text-[var(--danger)]">{state.error}</p>;
  if (state.status) return <p role="status" className="text-sm text-[var(--success)]">{state.status}</p>;
  return null;
}

export function InviteForm({ entityId, locationId }: { entityId: string; locationId: string }) {
  const [state, action, pending] = useActionState(inviteStaff, {});
  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-3">
      <input type="hidden" name="entityId" value={entityId} />
      <input type="hidden" name="locationId" value={locationId} />
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input name="email" type="email" required className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Vai trò
        <select name="role" className={input} defaultValue="front_desk">
          {Object.entries(ROLE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <button disabled={pending} className="min-h-11 rounded-md bg-[var(--accent)] px-4 font-semibold text-[var(--on-accent)]">
        Gửi lời mời
      </button>
      <div className="basis-full">
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function StaffRowActions({ userId, roles }: { userId: string; roles: { id: string; role: string }[] }) {
  const [dState, dAction] = useActionState(disableStaff, {});
  const [rState, rAction] = useActionState(revokeRole, {});
  return (
    <div className="flex flex-col gap-2 py-2">
      {roles.map((r) => (
        <form key={r.id} action={rAction}>
          <input type="hidden" name="roleId" value={r.id} />
          <button className="text-sm underline">Thu hồi {ROLE_LABEL[r.role] ?? r.role}</button>
        </form>
      ))}
      <form action={dAction} className="flex gap-2">
        <input type="hidden" name="userId" value={userId} />
        <input name="reason" required placeholder="Lý do" aria-label="Lý do vô hiệu hóa" className={`${input} w-32`} />
        <button className="text-sm text-[var(--danger)] underline">Vô hiệu hóa</button>
      </form>
      <Feedback state={dState} />
      <Feedback state={rState} />
    </div>
  );
}
