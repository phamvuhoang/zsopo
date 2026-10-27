// Allowed state transitions (mirrors the SQL RPCs; used by UI to enable actions).
export type BookingState = "held" | "confirmed" | "checked_in" | "checked_out" | "expired" | "cancelled" | "no_show" | "needs_review";
export type PaymentState = "pending" | "received" | "allocated" | "needs_review" | "failed";

const BOOKING: Record<BookingState, BookingState[]> = {
  held: ["confirmed", "expired", "cancelled", "needs_review"],
  expired: ["confirmed", "needs_review"],
  needs_review: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["checked_out"],
  checked_out: [],
  cancelled: [],
  no_show: [],
};

const PAYMENT: Record<PaymentState, PaymentState[]> = {
  pending: ["received", "failed"],
  received: ["allocated", "needs_review"],
  needs_review: ["allocated"],
  allocated: [],
  failed: [],
};

export const canTransitionBooking = (from: BookingState, to: BookingState) => BOOKING[from].includes(to);
export const canTransitionPayment = (from: PaymentState, to: PaymentState) => PAYMENT[from].includes(to);
