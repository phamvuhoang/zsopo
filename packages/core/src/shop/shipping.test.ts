import { expect, it } from "vitest";
import { canTransitionFulfillment, readyToShipAt } from "./fulfillment";
import { shippingFee } from "./shipping";

it("phí ship cố định, miễn phí từ ngưỡng (tính trên tiền hàng sau giảm)", () => {
  expect(shippingFee(499999n, { fee: 30000n, freeThreshold: 500000n })).toBe(30000n);
  expect(shippingFee(500000n, { fee: 30000n, freeThreshold: 500000n })).toBe(0n);
  expect(shippingFee(0n, { fee: 30000n, freeThreshold: null })).toBe(30000n);
});

it("vòng đời giao hàng: không nhảy cóc, hủy trước khi gửi, trả hàng sau khi gửi", () => {
  expect(canTransitionFulfillment("new", "confirmed")).toBe(true);
  expect(canTransitionFulfillment("packing", "ritual_hold")).toBe(true);
  expect(canTransitionFulfillment("ritual_hold", "ready_to_ship")).toBe(true);
  expect(canTransitionFulfillment("new", "shipped")).toBe(false);
  expect(canTransitionFulfillment("shipped", "cancelled")).toBe(false);
  expect(canTransitionFulfillment("shipped", "returned")).toBe(true);
});

it("nghi lễ 24h: chỉ sẵn sàng gửi sau ritual_started_at + 24h", () => {
  expect(readyToShipAt("2026-12-01T10:00:00Z", 24).toISOString()).toBe("2026-12-02T10:00:00.000Z");
});
