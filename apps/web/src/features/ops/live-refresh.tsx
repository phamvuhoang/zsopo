"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

/**
 * Subscribe to row changes (RLS-filtered for the signed-in staff) and refresh the server-rendered snapshot.
 * On reconnect we re-fetch the full snapshot instead of trusting missed deltas.
 */
export function LiveRefresh({ schema, table, filter }: { schema: string; table: string; filter?: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`${schema}:${table}:${filter ?? "all"}`)
      .on("postgres_changes", { event: "*", schema, table, ...(filter ? { filter } : {}) }, () => router.refresh())
      .subscribe((s) => {
        if (s === "SUBSCRIBED") {
          setStatus("live");
          router.refresh();
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setStatus("offline");
      });
    const online = () => router.refresh();
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("online", online);
      supabase.removeChannel(channel);
    };
  }, [schema, table, filter, router]);
  const label = { connecting: "Đang kết nối", live: "Cập nhật trực tiếp", offline: "Mất kết nối, dữ liệu có thể cũ" }[status];
  return (
    <span role="status" className={`text-xs ${status === "offline" ? "text-[var(--danger)]" : "text-[var(--ink-3)]"}`}>
      ● {label}
    </span>
  );
}
