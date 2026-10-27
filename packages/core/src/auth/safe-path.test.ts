import { expect, it } from "vitest";
import { safeRedirectPath } from "./safe-path";

it("chỉ cho phép đường dẫn nội bộ tương đối", () => {
  expect(safeRedirectPath("/ops")).toBe("/ops");
  expect(safeRedirectPath("/admin/nhan-su?tab=1")).toBe("/admin/nhan-su?tab=1");
  expect(safeRedirectPath("https://evil.example")).toBe("/");
  expect(safeRedirectPath("//evil.example")).toBe("/");
  expect(safeRedirectPath("/\\evil.example")).toBe("/");
  expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
  expect(safeRedirectPath(null, "/ops")).toBe("/ops");
});
