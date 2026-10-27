"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { rpcAction, str } from "@/lib/rpc-action";

export async function saveSetting(_: ActionState, f: FormData): Promise<ActionState> {
  let value: unknown;
  try {
    value = JSON.parse(str(f, "value") ?? "null");
  } catch {
    return { error: "Giá trị phải là JSON hợp lệ." };
  }
  const r = await rpcAction("ops_config", "set_setting", { p_key: str(f, "key"), p_value: value, p_public: f.get("public") === "on" }, "Đã lưu cấu hình.");
  updateTag("settings");
  revalidatePath("/admin/cau-hinh");
  return r;
}
