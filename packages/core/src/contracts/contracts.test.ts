import { describe, expect, it } from "vitest";
import { MoneySchema, StaySelectionSchema, err, ok, httpStatus } from "./index";

describe("contracts", () => {
  it("Money là chuỗi số nguyên không âm", () => {
    expect(MoneySchema.safeParse("1250000").success).toBe(true);
    expect(MoneySchema.safeParse(1250000).success).toBe(false);
    expect(MoneySchema.safeParse("12.5").success).toBe(false);
  });
  it("StaySelection yêu cầu departure sau arrival", () => {
    const base = { roomId: "b0000000-0000-4000-8000-000000000001", adults: 2, childrenAges: [], services: [] };
    expect(StaySelectionSchema.safeParse({ ...base, arrival: "2026-11-20", departure: "2026-11-22" }).success).toBe(true);
    expect(StaySelectionSchema.safeParse({ ...base, arrival: "2026-11-22", departure: "2026-11-22" }).success).toBe(false);
  });
  it("DomainResult và map HTTP", () => {
    expect(ok(1)).toEqual({ ok: true, data: 1 });
    expect(err("SOLD_OUT", "Hết phòng").error.retryable).toBe(false);
    expect(httpStatus("SOLD_OUT")).toBe(409);
    expect(httpStatus("RATE_LIMITED")).toBe(429);
  });
});
