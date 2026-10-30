import { describe, expect, it } from "vitest";
import { deskReceiptRef, vnLocalToIso } from "./payment-input";

describe("payment input", () => {
  it("datetime-local là giờ Việt Nam, không phụ thuộc TZ của server", () => {
    expect(vnLocalToIso("2026-11-27T20:00")).toBe("2026-11-27T13:00:00.000Z");
    expect(vnLocalToIso("2026-11-27T23:30")).toBe("2026-11-27T16:30:00.000Z"); // Review Focus 2
    expect(() => vnLocalToIso("27/11/2026 20:00")).toThrow();
  });
  it("mã biên nhận quầy giữ nguyên qua các lần gửi lại cùng form", () => {
    expect(deskReceiptRef(undefined, "k1")).toBe("QUAY-k1");
    expect(deskReceiptRef("  ", "k1")).toBe("QUAY-k1");
    expect(deskReceiptRef("BN-9", "k1")).toBe("BN-9");
  });
});
