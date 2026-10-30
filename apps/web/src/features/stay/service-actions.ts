"use server";

import { cancelMyService, requestService, transitionServiceRequest, type ServiceState } from "@zsopo/api";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { str } from "@/lib/rpc-action";
import { createClient, createPublicClient, visitorIp } from "@/lib/supabase/server";

export async function requestServiceAction(_: ActionState, f: FormData): Promise<ActionState> {
  const token = (await cookies()).get("zs_stay")?.value;
  if (!token) return { error: "Vui lòng quét mã QR lễ tân bàn giao khi nhận phòng để gửi yêu cầu." };
  const at = str(f, "scheduledAt");
  const r = await requestService(createPublicClient(await visitorIp()), {
    token, serviceId: str(f, "serviceId")!, qty: Number(str(f, "qty") ?? 1),
    scheduledAt: at ? new Date(`${at}:00+07:00`).toISOString() : new Date().toISOString(),
    idempotencyKey: str(f, "idempotencyKey")!, notes: str(f, "notes") ?? undefined,
  });
  revalidatePath("/dich-vu/da-lat");
  return r.ok ? { status: "Đã gửi yêu cầu. Lễ tân sẽ xác nhận sớm." } : { error: r.error.message };
}

export async function cancelServiceAction(_: ActionState, f: FormData): Promise<ActionState> {
  const token = (await cookies()).get("zs_stay")?.value;
  if (!token) return { error: "Phiên dịch vụ đã hết hạn." };
  const r = await cancelMyService(createPublicClient(await visitorIp()), token, str(f, "requestId")!);
  revalidatePath("/dich-vu/da-lat");
  return r.ok ? { status: "Đã hủy yêu cầu." } : { error: r.error.message };
}

export async function transitionServiceAction(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await transitionServiceRequest(await createClient(), {
    requestId: str(f, "requestId")!, to: str(f, "to") as ServiceState, expectedVersion: Number(str(f, "version")), note: str(f, "note") ?? undefined,
  });
  revalidatePath("/ops/dich-vu");
  return r.ok ? { status: "Đã cập nhật." } : { error: r.error.message };
}
