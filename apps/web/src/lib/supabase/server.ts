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

/** Cookie-less anon client for public, cacheable reads ('use cache' scopes). */
export function createPublicClient() {
  return createServerClient<Database>(env.supabaseUrl, env.supabaseKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
