import { expect, it } from "vitest";
import { closeCash, deriveRoomStatus, shiftVariance } from "./cash-shift";

it("BM01: tiền đầu + thu tiền mặt - chi - nộp quỹ = dự kiến", () => {
  expect(closeCash({ opening: 1000000n, receipts: 500000n, expenses: 100000n, remitted: 200000n })).toBe(1200000n);
});

it("chênh lệch giữ nguyên dấu, không ép về 0", () => {
  expect(shiftVariance(1200000n, 1150000n)).toBe(-50000n);
  expect(shiftVariance(1200000n, 1200000n)).toBe(0n);
});

it("suy ra 6 trạng thái PRD từ 3 chiều độc lập", () => {
  expect(deriveRoomStatus({ cleanliness: "ready", occupancy: "vacant", sale: "available", safetyBlock: false })).toBe("Trống sạch");
  expect(deriveRoomStatus({ cleanliness: "dirty", occupancy: "vacant", sale: "available", safetyBlock: false })).toBe("Trống bẩn");
  expect(deriveRoomStatus({ cleanliness: "awaiting_inspection", occupancy: "vacant", sale: "booked", safetyBlock: false })).toBe("Chờ nghiệm thu");
  expect(deriveRoomStatus({ cleanliness: "ready", occupancy: "occupied", sale: "booked", safetyBlock: false })).toBe("Đang có khách");
  expect(deriveRoomStatus({ cleanliness: "ready", occupancy: "vacant", sale: "held", safetyBlock: false })).toBe("Đã đặt");
  expect(deriveRoomStatus({ cleanliness: "ready", occupancy: "vacant", sale: "maintenance", safetyBlock: false })).toBe("Bảo trì");
  expect(deriveRoomStatus({ cleanliness: "ready", occupancy: "vacant", sale: "available", safetyBlock: true })).toBe("Bảo trì");
});
