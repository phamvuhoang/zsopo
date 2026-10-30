"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { reportTransferAction } from "../booking-actions";

/** Countdown on the server clock (offset from serverNow), not the device clock. */
export function HoldCountdown({ heldUntil, serverNow }: { heldUntil: string; serverNow: string }) {
  const [offset] = useState(() => Date.parse(serverNow) - Date.now());
  const [left, setLeft] = useState(() => Date.parse(heldUntil) - Date.parse(serverNow));
  useEffect(() => {
    const t = setInterval(() => setLeft(Date.parse(heldUntil) - (Date.now() + offset)), 1000);
    return () => clearInterval(t);
  }, [heldUntil, offset]);
  const at = new Date(heldUntil).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });
  if (left <= 0) return <p className="font-semibold text-[var(--danger)]">Giữ phòng đến {at}: đã hết thời gian.</p>;
  return (
    <p className="font-semibold" role="timer">
      Giữ phòng đến {at} (còn {Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, "0")})
    </p>
  );
}

/** Refresh the server-rendered status every 15s and on reconnect; never creates anything. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 15000);
    const online = () => router.refresh();
    window.addEventListener("online", online);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", online);
    };
  }, [router]);
  return null;
}

export function ReportTransferButton({ code }: { code: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setError((await reportTransferAction(code)).error))}
        className="min-h-11 rounded-md border border-[var(--line-2)] px-5 font-semibold disabled:opacity-60"
      >
        Tôi đã chuyển khoản
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
    </div>
  );
}
