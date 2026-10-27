import type { DomainResult, PaymentInput, PaymentResult } from "@zsopo/core";
import { call, type Db } from "./rpc";

export type RecordPaymentInput = PaymentInput & { idempotencyKey: string; evidenceNote?: string; shiftId?: string };

export const recordPayment = (client: Db, i: RecordPaymentInput): Promise<DomainResult<PaymentResult>> =>
  call(client, "commerce", "record_payment_atomic", {
    p_order: i.orderId, p_provider: i.provider, p_provider_ref: i.providerRef, p_amount: i.amount, p_received_at: i.receivedAt,
    p_evidence_note: i.evidenceNote ?? null, p_evidence_id: i.evidenceId ?? null, p_shift: i.shiftId ?? null, p_idempotency: i.idempotencyKey,
  });

export type GuestReceipt = {
  orderId: string;
  orderCode: string;
  kind: "stay" | "shop" | "service" | "manual";
  status: string;
  paymentStatus: string;
  total: string;
  depositDue: string;
  paid: string;
  due: string;
  dueAt: string | null;
  guestName: string;
  lines: { title: string; amount: string }[];
  booking: null | { id: string; state: string; roomName: string; arrival: string; departure: string; adults: number; children: number; heldUntil: string | null; checkIn: string; checkOut: string };
  transferReportedAt: string | null;
  vietqr: null | { bankBin: string; bankName: string; accountNo: string; accountName: string; amount: string; reference: string };
  policySummary: string;
  serverNow: string;
  notifications: { channel: string; status: string; at: string }[];
  confirmationQueued: boolean;
  shop: null | { fulfillment: string; method: string; shippingFee: string; ritualRequired: boolean; ritualReadyAt: string | null; tracking: string | null; shippedAt: string | null; events: { to: string; at: string }[]; rituals: string[] };
};

export const getGuestReceipt = (client: Db, token: string): Promise<DomainResult<GuestReceipt>> =>
  call(client, "commerce", "get_guest_receipt_v3", { p_token: token });

export const reportTransfer = (client: Db, token: string): Promise<DomainResult<{ reportedAt: string }>> =>
  call(client, "commerce", "report_transfer", { p_token: token });
