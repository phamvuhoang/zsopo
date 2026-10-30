import { describe, expect, it } from "vitest";
import { depositFor, nightsBetween, priceNight, quoteStay, type RatePlan } from "./quote";

const room = { capacityAdults: 2, maxGuests: 3 };
const policy = { depositRateBp: 3000, childFreeUnderAge: 6 };
const rates: RatePlan[] = [
  { kind: "base", price: 1250000n, extraAdultFee: 250000n, extraChildFee: 150000n },
  { kind: "weekday", dow: 5, price: 1450000n }, // Friday
  { kind: "weekday", dow: 6, price: 1450000n }, // Saturday
  { kind: "season", from: "2026-12-20", to: "2027-01-05", price: 1600000n },
  { kind: "date", from: "2026-12-24", to: "2026-12-26", price: 2000000n },
];

describe("nightsBetween", () => {
  it("liệt kê các đêm [arrival, departure)", () => {
    expect(nightsBetween("2026-11-30", "2026-12-02")).toEqual(["2026-11-30", "2026-12-01"]);
  });
});

describe("priceNight precedence: ngày cụ thể > mùa > thứ > base", () => {
  it.each([
    ["2026-11-18", 1250000n, "base"], // Wednesday
    ["2026-11-20", 1450000n, "weekday"], // Friday
    ["2026-12-21", 1600000n, "season"], // Monday in season
    ["2026-12-26", 1600000n, "season"], // Saturday in season beats weekday; date range is [24,26)
    ["2026-12-25", 2000000n, "date"],
  ] as const)("%s", (night, price, kind) => {
    expect(priceNight(night, rates)).toEqual({ price, kind });
  });
});

describe("quoteStay", () => {
  it("2 đêm thường + cọc 30% làm tròn lên", () => {
    const r = quoteStay({ arrival: "2026-11-17", departure: "2026-11-19", adults: 2, childrenAges: [], room, rates, policy, services: [] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.total).toBe(2500000n);
    expect(r.data.depositDue).toBe(750000n);
    expect(r.data.lines.map((l) => l.amount)).toEqual([1250000n, 1250000n]);
  });

  it("đêm lễ dùng giá ngày cụ thể", () => {
    const r = quoteStay({ arrival: "2026-12-24", departure: "2026-12-26", adults: 2, childrenAges: [], room, rates, policy, services: [] });
    expect(r.ok && r.data.total).toBe(4000000n);
  });

  it("phụ thu người lớn thêm và trẻ từ 6 tuổi; trẻ dưới 6 miễn phí", () => {
    const r = quoteStay({ arrival: "2026-11-17", departure: "2026-11-18", adults: 3, childrenAges: [], room: { ...room, maxGuests: 4 }, rates, policy, services: [] });
    expect(r.ok && r.data.total).toBe(1500000n);
    const k = quoteStay({ arrival: "2026-11-17", departure: "2026-11-18", adults: 2, childrenAges: [4, 8], room: { ...room, maxGuests: 4 }, rates, policy, services: [] });
    expect(k.ok && k.data.total).toBe(1400000n);
  });

  it("cọc làm tròn lên nguyên đồng", () => {
    expect(depositFor(1000001n, 3000)).toBe(300001n);
    expect(depositFor(1000000n, 3333)).toBe(333300n);
    expect(depositFor(1n, 3000)).toBe(1n);
  });

  it("dịch vụ đặt trước được giảm, tách dòng giảm giá", () => {
    const r = quoteStay({
      arrival: "2026-11-17", departure: "2026-11-18", adults: 2, childrenAges: [], room, rates, policy,
      services: [{ title: "Bữa sáng thực dưỡng", unitPrice: 120000n, qty: 2, prebookDiscountBp: 1000 }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.subtotal).toBe(1490000n);
    expect(r.data.discount).toBe(24000n);
    expect(r.data.total).toBe(1466000n);
    expect(r.data.depositDue).toBe(439800n);
  });

  it("từ chối ngày không hợp lệ và vượt sức chứa", () => {
    const bad = quoteStay({ arrival: "2026-11-18", departure: "2026-11-18", adults: 2, childrenAges: [], room, rates, policy, services: [] });
    expect(!bad.ok && bad.error.code).toBe("VALIDATION");
    const full = quoteStay({ arrival: "2026-11-17", departure: "2026-11-18", adults: 3, childrenAges: [7], room, rates, policy, services: [] });
    expect(!full.ok && full.error.field).toBe("guests");
  });

  it("từ chối khi thiếu giá base", () => {
    const r = quoteStay({ arrival: "2026-11-17", departure: "2026-11-18", adults: 1, childrenAges: [], room, rates: [], policy, services: [] });
    expect(!r.ok && r.error.code).toBe("VALIDATION");
  });
});
