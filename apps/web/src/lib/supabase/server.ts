import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@zsopo/db";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/** Per-request client carrying the user's JWT from cookies (publishable key only). */
export async function createClient() {
  const store = await cookies();
  return createServerClient<Database>(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component: proxy.ts refreshes the session cookie instead.
        }
      },
    },
  });
}

/**
 * Cookie-less anon client for public reads ('use cache' scopes) and guest RPCs.
 * Pass the visitor IP for guest writes so the DB rate limiter keys on the visitor, not on this server.
 */
export function createPublicClient(forwardedFor?: string | null) {
  return createServerClient<Database>(env.supabaseUrl, env.supabaseKey, {
    cookies: { getAll: () => [], setAll: () => {} },
    ...(forwardedFor ? { global: { headers: { "x-forwarded-for": forwardedFor } } } : {}),
  });
}

/** Visitor IP from the request (first X-Forwarded-For hop set by the hosting edge). */
export async function visitorIp(): Promise<string | null> {
  const { headers } = await import("next/headers");
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}
