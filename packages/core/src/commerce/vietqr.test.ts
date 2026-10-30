import { expect, it } from "vitest";
import { crc16ccitt, vietQrPayload } from "./vietqr";

it("CRC16-CCITT-FALSE đúng giá trị kiểm chuẩn", () => {
  expect(crc16ccitt("123456789")).toBe("29B1");
});

it("payload VietQR động có BIN, tài khoản, số tiền, nội dung và CRC hợp lệ", () => {
  const p = vietQrPayload({ bankBin: "970436", accountNo: "0011001932418", amount: "600000", reference: "ZS4B3F1FF776" });
  expect(p.startsWith("000201010212")).toBe(true);
  expect(p).toContain("0010A000000727");
  expect(p).toContain("0006970436");
  expect(p).toContain("01130011001932418");
  expect(p).toContain("0208QRIBFTTA");
  expect(p).toContain("5303704");
  expect(p).toContain("5406600000");
  expect(p).toContain("5802VN");
  expect(p).toContain("62160812ZS4B3F1FF776");
  expect(p.slice(-4)).toBe(crc16ccitt(p.slice(0, -4)));
});

it("từ chối nội dung chuyển khoản có dấu hoặc quá dài", () => {
  expect(() => vietQrPayload({ bankBin: "970436", accountNo: "1", amount: "1", reference: "Đặt phòng" })).toThrow();
});
