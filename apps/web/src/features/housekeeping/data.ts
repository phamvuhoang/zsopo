import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistItem } from "./checklist-form";

export async function loadTask(id: string) {
  const db = await createClient();
  const { data: task } = await db.schema("stay").from("housekeeping_tasks").select("*").eq("id", id).maybeSingle();
  if (!task) notFound();
  const kind = task.kind === "stayover" ? "room_stayover" : task.kind === "common" ? "common_area" : "room_checkout";
  const [{ data: tpl }, { data: results }, { data: room }] = await Promise.all([
    db.schema("stay").from("checklist_templates").select("version, title, items").eq("kind", kind).eq("active", true).maybeSingle(),
    db.schema("stay").rpc("latest_results", { p_task: id }),
    task.room_id ? db.schema("stay").from("rooms").select("code, name").eq("id", task.room_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const saved = Object.fromEntries(((results ?? []) as { item_code: string; result: "pass" | "fail" | "na"; note: string | null }[]).map((r) => [r.item_code, { result: r.result, note: r.note ?? "" }]));
  return { task, tpl, items: (tpl?.items ?? []) as ChecklistItem[], saved, room };
}
