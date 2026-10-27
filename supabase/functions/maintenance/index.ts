// Maintenance entry point for schedulers that cannot run SQL directly. pg_cron already runs
// stay.expire_all_holds every minute; this endpoint lets an operator trigger it on demand.
import { json, serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const db = serviceClient();
  const { data, error } = await db.schema("stay").rpc("expire_all_holds");
  return error ? json({ error: error.message }, 500) : json({ expiredHolds: data });
});
