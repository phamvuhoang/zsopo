"use server";

import type { ChecklistOp, SyncResult } from "@zsopo/core";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { int, rpcAction, str } from "@/lib/rpc-action";
import { createClient } from "@/lib/supabase/server";

/** Apply one queued checklist operation; sync outcomes come back as data, not errors. */
export async function applyChecklistOp(op: ChecklistOp & { device?: string }): Promise<SyncResult | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.schema("stay").rpc("apply_checklist_op", { p_op: op });
  if (error) return { error: error.details || error.message };
  return data as SyncResult;
}

const done = (r: ActionState) => {
  revalidatePath("/ops", "layout");
  return r;
};

export async function submitInspection(_: ActionState, f: FormData): Promise<ActionState> {
  return done(await rpcAction("stay", "submit_for_inspection", { p_task: str(f, "taskId"), p_expected_version: int(f, "version") }, "Đã gửi nghiệm thu (BM02 hoàn tất)."));
}
export async function approveInspection(_: ActionState, f: FormData): Promise<ActionState> {
  return done(await rpcAction("stay", "approve_inspection", {
    p_task: str(f, "taskId"), p_expected_version: int(f, "version"), p_approved: f.get("approved") === "true", p_notes: str(f, "notes") ?? "", p_safety_issue: f.get("safety") === "on",
  }, "Đã ký BM03."));
}
export async function refuseService(_: ActionState, f: FormData): Promise<ActionState> {
  const at = str(f, "rescheduleAt");
  return done(await rpcAction("stay", "refuse_service", { p_task: str(f, "taskId"), p_reason: str(f, "reason"), p_reschedule_at: at ? new Date(`${at}:00+07:00`).toISOString() : null }, "Đã ghi lịch hẹn, không vào phòng."));
}
export async function createCommonTask(_: ActionState, f: FormData): Promise<ActionState> {
  return done(await rpcAction("stay", "create_common_task", { p_location: str(f, "locationId"), p_area: str(f, "area"), p_due: new Date().toISOString() }, "Đã tạo việc khu chung."));
}
export async function supplyMovement(_: ActionState, f: FormData): Promise<ActionState> {
  return done(await rpcAction("stay", "record_supply_movement", { p_item: str(f, "itemId"), p_kind: str(f, "kind"), p_qty: int(f, "qty"), p_room: null, p_counterpart: str(f, "counterpart"), p_note: str(f, "note") ?? "" }, "Đã ghi, chờ bên nhận xác nhận."));
}
export async function confirmMovement(_: ActionState, f: FormData): Promise<ActionState> {
  return done(await rpcAction("stay", "confirm_supply_movement", { p_movement: str(f, "movementId") }, "Đã xác nhận."));
}
export async function recordLost(_: ActionState, f: FormData): Promise<ActionState> {
  return done(await rpcAction("stay", "record_lost_item", { p_location: str(f, "locationId"), p_room: str(f, "roomId"), p_description: str(f, "description"), p_storage: str(f, "storage"), p_seal: str(f, "seal") ?? "", p_witness: str(f, "witness") }, "Đã ghi nhận đồ thất lạc."));
}
export async function moveLost(_: ActionState, f: FormData): Promise<ActionState> {
  return done(await rpcAction("stay", "transition_lost_item", { p_item: str(f, "itemId"), p_to: str(f, "to"), p_note: str(f, "note") ?? "", p_receipt: str(f, "receipt") ?? "" }, "Đã cập nhật."));
}
export async function clearSafety(_: ActionState, f: FormData): Promise<ActionState> {
  return done(await rpcAction("stay", "clear_safety_block", { p_room: str(f, "roomId"), p_reason: str(f, "reason") }, "Đã mở khóa an toàn."));
}
