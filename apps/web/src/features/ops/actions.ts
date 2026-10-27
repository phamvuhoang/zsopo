"use server";

import { createManualBooking, recordPayment, transitionBooking } from "@zsopo/api";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/action-form";
import { int, rpcAction, str } from "@/lib/rpc-action";
import { createClient } from "@/lib/supabase/server";

const refresh = () => {
  revalidatePath("/ops", "layout");
};

export async function openShift(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await rpcAction("stay", "open_shift", { p_location: str(f, "locationId"), p_cash_open: int(f, "cashOpen") ?? 0 }, "Đã mở ca.");
  refresh();
  return r;
}

export async function addCashMovement(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await rpcAction("stay", "add_cash_movement", { p_shift: str(f, "shiftId"), p_kind: str(f, "kind"), p_amount: int(f, "amount"), p_note: str(f, "note") }, "Đã ghi.");
  refresh();
  return r;
}

export async function handoverShift(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await rpcAction("stay", "handover_shift", {
    p_shift: str(f, "shiftId"), p_expected_version: int(f, "version"), p_counted_cash: int(f, "counted"), p_receiver: str(f, "receiver"), p_notes: str(f, "notes") ?? "",
  }, "Đã bàn giao, chờ người nhận xác nhận.");
  refresh();
  return r;
}

export async function ackHandover(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await rpcAction("stay", "ack_handover", { p_shift: str(f, "shiftId"), p_expected_version: int(f, "version") }, "Đã xác nhận nhận ca. BM01 đã khóa.");
  refresh();
  return r;
}

export async function manualBooking(_: ActionState, f: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const r = await createManualBooking(supabase, {
    roomId: str(f, "roomId")!, arrival: str(f, "arrival")!, departure: str(f, "departure")!, adults: int(f, "adults") ?? 1, childrenAges: [],
    guest: { name: str(f, "name") ?? "", phone: str(f, "phone") ?? "", email: str(f, "email") ?? undefined },
    source: (str(f, "source") ?? "walk_in") as "walk_in", collectedBy: (str(f, "collectedBy") ?? "zsopo") as "zsopo",
    notes: str(f, "notes") ?? undefined, idempotencyKey: str(f, "idempotencyKey") ?? randomUUID(),
  });
  if (!r.ok) return { error: r.error.message };
  redirect(`/ops/dat-phong/${r.data.bookingId}`);
}

export async function staffPayment(_: ActionState, f: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const r = await recordPayment(supabase, {
    orderId: str(f, "orderId")!, provider: str(f, "provider") ?? "cash", providerRef: str(f, "providerRef") ?? `QUAY-${Date.now()}`,
    amount: String(int(f, "amount") ?? 0), receivedAt: new Date().toISOString(), evidenceNote: str(f, "evidence") ?? undefined,
    shiftId: str(f, "shiftId") ?? undefined, idempotencyKey: str(f, "idempotencyKey") ?? randomUUID(),
  });
  refresh();
  return r.ok ? { status: "Đã ghi nhận tiền." } : { error: r.error.message };
}

export async function bookingTransition(_: ActionState, f: FormData): Promise<ActionState & { stayToken?: string }> {
  const supabase = await createClient();
  const action = str(f, "action") as "check_in" | "check_out" | "cancel" | "no_show";
  const late = str(f, "lateUntil");
  const r = await transitionBooking(supabase, {
    bookingId: str(f, "bookingId")!, expectedVersion: int(f, "version") ?? 0, action, reason: str(f, "reason") ?? undefined,
    idempotencyKey: str(f, "idempotencyKey") ?? randomUUID(), identityVerified: f.get("identityVerified") === "on",
    keyHandover: str(f, "key") ?? undefined, lateCheckoutUntil: late ? new Date(`${late}:00+07:00`).toISOString() : undefined,
  });
  refresh();
  if (!r.ok) return { error: r.error.message };
  const label = { check_in: "Đã nhận phòng.", check_out: "Đã trả phòng. Phòng chuyển trạng thái bẩn, đã tạo việc dọn.", cancel: "Đã hủy đặt phòng.", no_show: "Đã đánh dấu không đến." }[action];
  return { status: label, stayToken: r.data.stayToken };
}

export async function createTicket(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await rpcAction("stay", "create_ticket", {
    p_location: str(f, "locationId"), p_room: str(f, "roomId"), p_booking: null, p_kind: str(f, "kind"), p_priority: str(f, "priority"),
    p_title: str(f, "title"), p_description: str(f, "description") ?? "",
  }, "Đã tạo sự cố. Hạn xử lý 15 phút.");
  refresh();
  return r;
}

export async function moveTicket(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await rpcAction("stay", "transition_ticket", { p_ticket: str(f, "ticketId"), p_to: str(f, "to"), p_expected_version: int(f, "version"), p_note: str(f, "note") }, "Đã cập nhật sự cố.");
  refresh();
  return r;
}
