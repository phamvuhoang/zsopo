// Payment provider webhook adapter. DISABLED until a provider contract, credentials and a signature test exist.
// GĐ0 confirms money manually (staff record + reconciliation evidence) via commerce.record_payment_atomic.
import { json } from "../_shared/supabase.ts";

Deno.serve((req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  return json({ code: "UPSTREAM_UNAVAILABLE", reason: "provider_disabled" }, 503);
});
