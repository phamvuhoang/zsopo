import { expect, it } from "vitest";
import { toCsv } from "./csv";

it("CSV thoát dấu phẩy/ngoặc kép và chặn formula injection", () => {
  const csv = toCsv([["Tên", "Ghi chú"], ["Nguyễn, An", 'Nói "xin chào"'], ["=HYPERLINK(\"x\")", "+84900"], ["@cmd", "-1"]]);
  expect(csv.split("\r\n")).toEqual([
    "Tên,Ghi chú",
    '"Nguyễn, An","Nói ""xin chào"""',
    `"'=HYPERLINK(""x"")",'+84900`,
    "'@cmd,'-1",
  ]);
  expect(csv.startsWith("﻿")).toBe(false);
});
