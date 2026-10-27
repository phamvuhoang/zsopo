"use server";

import { updateTag } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { rpcAction, str } from "@/lib/rpc-action";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export async function addFeed(_: ActionState, f: FormData): Promise<ActionState> {
  return rpcAction("stay", "add_calendar_feed", { p_room: str(f, "roomId"), p_provider: str(f, "provider"), p_import_url: str(f, "importUrl") }, "Đã thêm kết nối lịch. Lần đồng bộ kế tiếp trong tối đa 15 phút.", ["rooms"]);
}

export async function rotateExport(_: ActionState, f: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.schema("stay").rpc("rotate_export_token", { p_feed: str(f, "feedId")! });
  if (error) return { error: "Không xoay được token (cần quyền quản lý lịch)." };
  updateTag("rooms");
  // Shown once: copy into the OTA extranet now. The old URL stops working immediately.
  return { status: `Liên kết xuất mới (chỉ hiện một lần): ${env.supabaseUrl}/functions/v1/ical-export?token=${data}` };
}

export async function resolveConflict(_: ActionState, f: FormData): Promise<ActionState> {
  return rpcAction("stay", "resolve_conflict", { p_conflict: str(f, "conflictId"), p_resolution: str(f, "resolution") }, "Đã ghi nhận cách xử lý xung đột.");
}
