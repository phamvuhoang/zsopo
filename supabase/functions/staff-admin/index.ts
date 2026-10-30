// Staff invite: the only staff operation that needs the Auth admin API.
// Authorization reuses core.grant_role executed AS THE CALLER, so the SQL rules (scope, no escalation, aal2) apply.
import { callerClient, json, serviceClient } from "../_shared/supabase.ts";

const ROLES = new Set(["front_desk", "housekeeping", "location_manager", "editor", "ops_finance", "super_admin"]);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const caller = callerClient(req);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
  const { data: claims } = await caller.auth.getClaims(token);
  if (!claims?.claims) return json({ code: "UNAUTHENTICATED" }, 401);

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (body?.action !== "invite" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !ROLES.has(body.role)) {
    return json({ code: "VALIDATION" }, 400);
  }

  // Pre-check before touching Auth admin: caller must be allowed to manage staff in this scope.
  const { data: allowed } = await caller.schema("core").rpc("has_permission", {
    p_action: "staff.manage",
    p_entity: body.entityId,
    p_location: body.locationId ?? null,
  });
  if (!allowed) return json({ code: "FORBIDDEN" }, 403);

  const admin = serviceClient();
  const redirectTo = `${Deno.env.get("SITE_URL") ?? "http://localhost:3000"}/auth/callback?next=/dat-lai-mat-khau`;
  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  let userId = invited?.user?.id;
  if (error) {
    // Existing account: look it up instead of failing (re-invite to a new role).
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (!userId) return json({ code: "UPSTREAM_UNAVAILABLE" }, 503);
  }

  const { error: grantError } = await caller.schema("core").rpc("grant_role", {
    p_user: userId,
    p_role: body.role,
    p_entity: body.entityId,
    p_location: body.locationId ?? null,
  });
  if (grantError) {
    if (invited?.user) await admin.auth.admin.deleteUser(invited.user.id);
    return json({ code: "FORBIDDEN", message: grantError.message }, 403);
  }
  return json({ ok: true, userId });
});
