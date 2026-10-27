import { z } from "zod";

// Canonical cross-module contracts (specs/02-architecture.md §6).
export const UUIDSchema = z.uuid();
export const MoneySchema = z.string().regex(/^\d+$/, "Money phải là chuỗi số nguyên VND");
export const LocalDateSchema = z.iso.date();
export const InstantSchema = z.iso.datetime({ offset: true });
export type UUID = string;

export const GuestInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^(\+?84|0)\d{9,10}$/, "Số điện thoại không hợp lệ"),
  email: z.email().optional(),
  notes: z.string().max(1000).optional(),
});
export type GuestInput = z.infer<typeof GuestInputSchema>;

export const StaySelectionSchema = z
  .object({
    roomId: UUIDSchema,
    arrival: LocalDateSchema,
    departure: LocalDateSchema,
    adults: z.number().int().min(1).max(10),
    childrenAges: z.array(z.number().int().min(0).max(17)).max(6),
    services: z.array(z.object({ serviceId: UUIDSchema, qty: z.number().int().min(1).max(50), scheduledAt: InstantSchema })).max(20),
  })
  .refine((s) => s.departure > s.arrival, { message: "Ngày trả phòng phải sau ngày nhận phòng", path: ["departure"] });
export type StaySelection = z.infer<typeof StaySelectionSchema>;

export type Quote = {
  id: UUID;
  version: number;
  total: string;
  depositDue: string;
  expiresAt: string;
  lines: { title: string; amount: string }[];
  policyVersion: UUID;
};
export type Hold = { bookingId: UUID; orderId: UUID; heldUntil: string; receiptPath: string };
export type PaymentInput = { orderId: UUID; provider: string; providerRef: string; amount: string; receivedAt: string; evidenceId?: UUID };
export type PaymentResult = { paymentId: UUID; orderId: UUID; state: "allocated" | "needs_review"; bookingState?: string };
export type ChecklistOp = {
  operationId: UUID;
  taskId: UUID;
  baseVersion: number;
  itemCode: string;
  result: "pass" | "fail" | "na";
  note?: string;
  mediaIds: UUID[];
};
export type SyncResult = { operationId: UUID; state: "applied" | "duplicate" | "conflict" | "forbidden"; version: number };
export type ShopSelection = {
  lines: { variantId: UUID; qty: number }[];
  shippingAddress: { name: string; phone: string; line1: string; regionCode: string };
  method: "cod" | "bank";
  email?: string;
};

export const ERROR_CODES = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SOLD_OUT: 409,
  QUOTE_EXPIRED: 409,
  PRICE_CHANGED: 409,
  HOLD_EXPIRED: 409,
  PAYMENT_REVIEW: 409,
  INVALID_TRANSITION: 409,
  VERSION_CONFLICT: 409,
  RATE_LIMITED: 429,
  UPSTREAM_UNAVAILABLE: 503,
} as const;
export type ErrorCode = keyof typeof ERROR_CODES;

export type DomainError = { code: ErrorCode; message: string; field?: string; retryable: boolean };
export type DomainResult<T> = { ok: true; data: T } | { ok: false; error: DomainError };

export const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });
export const err = (code: ErrorCode, message: string, field?: string): { ok: false; error: DomainError } => ({
  ok: false,
  error: { code, message, ...(field ? { field } : {}), retryable: code === "RATE_LIMITED" || code === "UPSTREAM_UNAVAILABLE" },
});
export const httpStatus = (code: ErrorCode): number => ERROR_CODES[code];
