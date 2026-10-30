import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, type Actor } from "./require-permission";

export type StaffLocation = { id: string; entity_id: string; name: string; slug: string; timezone: string };
export type StaffContext = {
  actor: Actor;
  displayName: string;
  roles: { role: string; entity_id: string | null; location_id: string | null }[];
  location: StaffLocation;
};

/** Staff identity + current location (GĐ0: the single active location the user may access). */
export async function getStaffContext(next: string): Promise<StaffContext> {
  const actor = await requireUser(next);
  const supabase = await createClient();
  const [{ data: roles }, { data: profile }] = await Promise.all([
    supabase.schema("core").rpc("my_roles"),
    supabase.schema("core").from("profiles").select("display_name").eq("user_id", actor.userId).maybeSingle(),
  ]);
  if (!roles?.length) redirect("/khong-co-quyen");
  const scoped = roles.find((r) => r.location_id)?.location_id;
  const query = supabase.schema("core").from("locations").select("id, entity_id, name, slug, timezone").order("created_at");
  const { data: locations } = scoped ? await query.eq("id", scoped) : await query.eq("status", "active");
  const location = locations?.[0];
  if (!location) redirect("/khong-co-quyen");
  return { actor, displayName: profile?.display_name ?? actor.email ?? "", roles, location };
}
