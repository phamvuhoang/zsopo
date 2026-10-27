import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";

const url = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Client acting as the caller (RLS + SQL permission checks apply). */
export const callerClient = (req: Request): SupabaseClient =>
  createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });

/** Elevated client: only after the caller has been authorized. Never returned to a browser. */
export const serviceClient = (): SupabaseClient => createClient(url, serviceKey, { auth: { persistSession: false } });

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
