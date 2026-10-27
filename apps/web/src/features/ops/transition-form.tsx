"use client";

import QRCode from "qrcode";
import { useActionState, useEffect, useState } from "react";
import { bookingTransition } from "./actions";

/** Booking transition form; after check-in shows the one-time in-stay service QR for the guest to scan. */
export function TransitionForm({ children, submit, danger }: { children: React.ReactNode; submit: string; danger?: boolean }) {
  const [state, action, pending] = useActionState(bookingTransition, {});
  const [qr, setQr] = useState<string>();
  const link = state.stayToken ? `${location.origin}/api/stay?k=${encodeURIComponent(state.stayToken)}` : null;
  useEffect(() => {
    if (link) QRCode.toDataURL(link, { width: 220, margin: 1 }).then(setQr);
  }, [link]);
  return (
    <form action={action} className="flex flex-col gap-3">
      {children}
      <button disabled={pending} className={`min-h-11 rounded-md px-4 font-semibold disabled:opacity-60 ${danger ? "border border-[var(--danger)] text-[var(--danger)]" : "bg-[var(--accent)] text-[var(--on-accent)]"}`}>
        {pending ? "Đang xử lý..." : submit}
      </button>
      {state.error && <p role="alert" className="text-sm text-[var(--danger)]">{state.error}</p>}
      {state.status && <p role="status" className="text-sm text-[var(--success)]">{state.status}</p>}
      {qr && (
        <div className="rounded-md border border-[var(--line)] p-3">
          <p className="text-sm font-semibold">Mã QR dịch vụ trong kỳ ở (chỉ hiện một lần, đưa khách quét)</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Mã QR mở menu dịch vụ của phòng" width={220} height={220} className="mt-2 bg-white" />
        </div>
      )}
    </form>
  );
}
