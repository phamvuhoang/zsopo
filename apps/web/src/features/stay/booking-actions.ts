"use server";

import { createStayHold, quoteStay, reportTransfer } from "@zsopo/api";
import type { DomainResult, Quote } from "@zsopo/core";
import { revalidatePath } from "next/cache";
import { getGuestToken, setGuestToken } from "@/lib/guest";
import { createPublicClient, visitorIp } from "@/lib/supabase/server";

export type QuoteView = Quote & { subtotal: string; discount: string; depositRateBp: number; policySummary: string; nights: number };

export async function quoteAction(input: {
  roomId: string; arrival: string; departure: string; adults: number; childrenAges: number[];
  services: { serviceId: string; qty: number; scheduledAt: string }[];
}): Promise<DomainResult<QuoteView>> {
  return (await quoteStay(createPublicClient(await visitorIp()), input)) as DomainResult<QuoteView>;
}

export async function holdAction(input: {
  quoteId: string; policyVersion: string; idempotencyKey: string;
  guest: { name: string; phone: string; email: string }; arrivalTime?: string; notes?: string;
  terms: boolean; marketing: boolean; website?: string;
}): Promise<DomainResult<{ path: string }>> {
  if (input.website) return { ok: false, error: { code: "VALIDATION", message: "Không gửi được biểu mẫu.", retryable: false } }; // honeypot
  if (!input.terms) return { ok: false, error: { code: "VALIDATION", message: "Vui lòng đồng ý điều khoản và chính sách bảo mật.", field: "terms", retryable: false } };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.guest.email)) {
    return { ok: false, error: { code: "VALIDATION", message: "Email dùng để gửi xác nhận đặt phòng, vui lòng nhập đúng.", field: "email", retryable: false } };
  }
  const r = await createStayHold(createPublicClient(await visitorIp()), {
    quoteId: input.quoteId, policyVersion: input.policyVersion, idempotencyKey: input.idempotencyKey,
    guest: input.guest, consents: { terms: input.terms, marketing: input.marketing },
    arrivalTime: input.arrivalTime, notes: input.notes,
  });
  if (!r.ok) return r;
  if (r.data.guestToken) await setGuestToken(r.data.orderCode, r.data.guestToken);
  return { ok: true, data: { path: r.data.receiptPath } };
}

export async function reportTransferAction(code: string): Promise<{ error?: string }> {
  const token = await getGuestToken(code);
  if (!token) return { error: "Phiên xem đơn đã hết hạn." };
  const r = await reportTransfer(createPublicClient(await visitorIp()), token);
  revalidatePath(`/dat-phong/${code}/thanh-toan`);
  return r.ok ? {} : { error: r.error.message };
}
