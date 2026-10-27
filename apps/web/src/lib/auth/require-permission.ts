import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type Actor = { userId: string; email: string | null; aal: string };

/** Verified actor or redirect to login. */
export async function requireUser(next = "/"): Promise<Actor> {
  await connection(); // request-time only: JWT expiry checks read the clock
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (!c) redirect(`/dang-nhap?next=${encodeURIComponent(next)}`);
  return { userId: c.sub, email: (c.email as string | undefined) ?? null, aal: (c.aal as string | undefined) ?? "aal1" };
}

/**
 * Server-side permission gate: action + entity + optional location, checked against current DB roles.
 * Redirects to MFA when the action needs aal2 and the user could pass after verifying.
 */
export async function requirePermission(action: string, entityId: string, locationId?: string | null, next = "/admin"): Promise<Actor> {
  const actor = await requireUser(next);
  const supabase = await createClient();
  const args = { p_action: action, p_entity: entityId, p_location: locationId ?? undefined };
  const { data: allowed } = await supabase.schema("core").rpc("has_permission", args);
  if (allowed) return actor;
  const { data: needsMfa } = await supabase.schema("core").rpc("permission_needs_mfa", args);
  if (needsMfa) redirect(`/auth/mfa?next=${encodeURIComponent(next)}`);
  redirect("/khong-co-quyen");
}
