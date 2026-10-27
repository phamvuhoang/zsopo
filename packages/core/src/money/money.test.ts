import { describe, expect, it } from "vitest";
import { formatVnd, fromMoney, toMoney } from "./index";

describe("money", () => {
  it("định dạng VND kiểu 1.250.000 đ", () => {
    expect(formatVnd(1250000n)).toBe("1.250.000 đ");
    expect(formatVnd("0")).toBe("0 đ");
    expect(formatVnd(-30000n)).toBe("-30.000 đ");
  });
  it("chuỗi decimal nguyên <-> bigint, không qua number", () => {
    expect(fromMoney("9007199254740993")).toBe(9007199254740993n);
    expect(toMoney(9007199254740993n)).toBe("9007199254740993");
  });
  it("từ chối chuỗi không phải số nguyên", () => {
    expect(() => fromMoney("1.5")).toThrow();
    expect(() => fromMoney("1e6")).toThrow();
  });
});
