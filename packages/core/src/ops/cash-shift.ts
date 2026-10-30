// BM01 cash handover and room status derivation (pure; the DB RPCs are authoritative).

export function closeCash(s: { opening: bigint; receipts: bigint; expenses: bigint; remitted: bigint }): bigint {
  return s.opening + s.receipts - s.expenses - s.remitted;
}

/** counted - expected; negative = short. Never forced to zero: differences need a written explanation. */
export const shiftVariance = (expected: bigint, counted: bigint): bigint => counted - expected;

export type Cleanliness = "dirty" | "cleaning" | "awaiting_inspection" | "ready";
export type Occupancy = "vacant" | "occupied";
export type Sale = "available" | "held" | "booked" | "ota" | "maintenance";
export type PrdRoomStatus = "Trống sạch" | "Trống bẩn" | "Đang dọn" | "Chờ nghiệm thu" | "Đang có khách" | "Đã đặt" | "Bảo trì";

/** UI label from three independent dimensions; decisions (sell, check in) always read the dimensions, not the label. */
export function deriveRoomStatus(r: { cleanliness: Cleanliness; occupancy: Occupancy; sale: Sale; safetyBlock: boolean }): PrdRoomStatus {
  if (r.safetyBlock || r.sale === "maintenance") return "Bảo trì";
  if (r.occupancy === "occupied") return "Đang có khách";
  if (r.cleanliness === "awaiting_inspection") return "Chờ nghiệm thu";
  if (r.cleanliness === "cleaning") return "Đang dọn";
  if (r.cleanliness === "dirty") return "Trống bẩn";
  if (r.sale === "held" || r.sale === "booked" || r.sale === "ota") return "Đã đặt";
  return "Trống sạch";
}
