"use server";

import { recordPayment } from "@zsopo/api";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { int, rpcAction, str } from "@/lib/rpc-action";
import { createClient } from "@/lib/supabase/server";

export async function recordPaymentAction(_: ActionState, f: FormData): Promise<ActionState> {
  const code = str(f, "orderCode")?.toUpperCase();
  const amount = int(f, "amount");
  if (!code || !amount) return { error: "Nhập mã đơn và số tiền thực nhận." };
  const supabase = await createClient();
  const { data: order } = await supabase.schema("commerce").from("orders").select("id").eq("code", code).maybeSingle();
  if (!order) return { error: "Không tìm thấy đơn trong phạm vi quyền của bạn." };
  const r = await recordPayment(supabase, {
    orderId: order.id, provider: str(f, "provider") ?? "bank_transfer", providerRef: str(f, "providerRef") ?? "",
    amount: String(amount), receivedAt: new Date(str(f, "receivedAt") ?? Date.now()).toISOString(),
    evidenceNote: str(f, "evidence") ?? undefined, idempotencyKey: str(f, "idempotencyKey") ?? randomUUID(),
  });
  if (!r.ok) return { error: r.error.message };
  revalidatePath("/admin/thanh-toan");
  return { status: r.data.state === "allocated" ? `Đã ghi nhận. Trạng thái đặt phòng: ${r.data.bookingState ?? "không áp dụng"}.` : "Đã ghi nhận tiền, đơn cần đối soát (thiếu, muộn hoặc xung đột)." };
}

export async function requestRefundAction(_: ActionState, f: FormData): Promise<ActionState> {
  return rpcAction("commerce", "request_refund", { p_order: str(f, "orderId"), p_amount: int(f, "amount"), p_reason: str(f, "reason") }, "Đã tạo yêu cầu hoàn tiền, chờ tài chính duyệt.");
}

export async function approveRefundAction(_: ActionState, f: FormData): Promise<ActionState> {
  return rpcAction("commerce", "approve_refund", { p_refund: str(f, "refundId"), p_provider_ref: str(f, "providerRef"), p_evidence_note: str(f, "evidence"), p_method: str(f, "method") ?? "bank" }, "Đã duyệt và ghi nhận hoàn tiền.");
}

export async function confirmExceptionAction(_: ActionState, f: FormData): Promise<ActionState> {
  return rpcAction("stay", "confirm_with_exception", { p_booking: str(f, "bookingId"), p_reason: str(f, "reason"), p_due: int(f, "due") }, "Đã xác nhận ngoại lệ, ghi nhận số còn phải thu.");
}
