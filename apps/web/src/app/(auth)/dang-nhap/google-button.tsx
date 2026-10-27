"use client";

import { createClient } from "@/lib/supabase/browser";

const enabled = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "on";

export function GoogleButton({ next }: { next: string }) {
  return (
    <div className="mt-4">
      <button
        type="button"
        disabled={!enabled}
        onClick={() =>
          createClient().auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
          })
        }
        className="min-h-11 w-full rounded-md border border-[var(--line)] px-4 disabled:opacity-60"
      >
        Tiếp tục với Google
      </button>
      {!enabled && <p className="mt-2 text-xs text-[var(--ink-3)]">Đăng nhập Google chưa được bật. Vui lòng dùng email.</p>}
    </div>
  );
}
