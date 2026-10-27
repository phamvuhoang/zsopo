"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { rpcAction, str } from "@/lib/rpc-action";
import { createClient } from "@/lib/supabase/server";

export async function retryOutbox(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await rpcAction("core", "retry_outbox", { p_id: str(f, "id") }, "Đã đưa tin vào hàng đợi gửi lại.");
  revalidatePath("/admin/thong-bao");
  return r;
}

export async function saveTemplate(_: ActionState, f: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.schema("ops_config").from("notification_templates")
    .update({ subject: str(f, "subject") ?? "", body: str(f, "body") ?? "" }).eq("id", str(f, "id")!);
  if (error) return { error: "Không lưu được mẫu (cần quyền quản lý thông báo)." };
  revalidatePath("/admin/thong-bao");
  return { status: "Đã lưu mẫu. Chỉ các biến trong danh sách cho phép được thay thế." };
}
