import { expect, it } from "vitest";
import { canTransitionBooking, canTransitionPayment } from "./state-machine";

it("booking: held -> confirmed -> checked_in -> checked_out; không nhảy cóc", () => {
  expect(canTransitionBooking("held", "confirmed")).toBe(true);
  expect(canTransitionBooking("held", "expired")).toBe(true);
  expect(canTransitionBooking("confirmed", "checked_in")).toBe(true);
  expect(canTransitionBooking("confirmed", "no_show")).toBe(true);
  expect(canTransitionBooking("checked_in", "checked_out")).toBe(true);
  expect(canTransitionBooking("held", "checked_in")).toBe(false);
  expect(canTransitionBooking("checked_out", "cancelled")).toBe(false);
  expect(canTransitionBooking("expired", "confirmed")).toBe(true); // late payment re-allocated
});

it("payment: pending -> received -> allocated | needs_review; failed là kết thúc", () => {
  expect(canTransitionPayment("pending", "received")).toBe(true);
  expect(canTransitionPayment("received", "allocated")).toBe(true);
  expect(canTransitionPayment("received", "needs_review")).toBe(true);
  expect(canTransitionPayment("needs_review", "allocated")).toBe(true);
  expect(canTransitionPayment("allocated", "pending")).toBe(false);
  expect(canTransitionPayment("failed", "allocated")).toBe(false);
});
