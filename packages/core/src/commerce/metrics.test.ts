import { expect, it } from "vitest";
import { adr, occupancyPct } from "./metrics";

it("công suất = đêm có khách / đêm bán được (đã trừ đêm bảo trì)", () => {
  expect(occupancyPct(9, 30 - 3)).toBe(33.3);
  expect(occupancyPct(0, 0)).toBeNull();
});

it("ADR = doanh thu phòng / đêm đã phục vụ, làm tròn nguyên đồng", () => {
  expect(adr(3750000n, 3)).toBe(1250000n);
  expect(adr(1000000n, 3)).toBe(333333n);
  expect(adr(0n, 0)).toBeNull();
});
