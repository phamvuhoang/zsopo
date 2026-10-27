// Maintenance entry point for schedulers that cannot run SQL directly. pg_cron already runs
// stay.expire_all_holds every minute; this endpoint lets an operator trigger it on demand.
import { callerClient, json } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  // Service-role only: expire_all_holds is not granted to authenticated users.
  const { data, error } = await callerClient(req).schema("stay").rpc("expire_all_holds");
  return error ? json({ code: "FORBIDDEN" }, 403) : json({ expiredHolds: data });
});
