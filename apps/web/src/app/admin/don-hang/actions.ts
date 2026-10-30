"use server";

import { transitionFulfillment } from "@zsopo/api";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { int, str } from "@/lib/rpc-action";
import { createClient } from "@/lib/supabase/server";

export async function moveFulfillment(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await transitionFulfillment(await createClient(), { orderId: str(f, "orderId")!, to: str(f, "to")!, expectedVersion: int(f, "version") ?? 0, tracking: str(f, "tracking") ?? undefined });
  revalidatePath("/admin/don-hang");
  return r.ok ? { status: "Đã cập nhật." } : { error: r.error.message };
}
