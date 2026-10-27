import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";

const url = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Client acting as the caller (RLS + SQL permission checks apply). Forwards the caller's apikey and bearer as sent. */
export const callerClient = (req: Request): SupabaseClient => {
  const apikey = req.headers.get("apikey") ?? anonKey;
  const auth = req.headers.get("Authorization") ?? "";
  // Opaque sb_* keys are not JWTs: send them only as apikey and let the gateway mint the role JWT.
  const headers: Record<string, string> = /^Bearer sb_/.test(auth) ? {} : { Authorization: auth };
  return createClient(url, apikey, { global: { headers }, auth: { persistSession: false } });
};

/** Elevated client: only after the caller has been authorized. Never returned to a browser. */
export const serviceClient = (): SupabaseClient => createClient(url, serviceKey, { auth: { persistSession: false } });

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
