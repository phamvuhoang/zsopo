import { expect, test } from "@playwright/test";

test("trang chủ tải được, có tiêu đề ZSOPO và không lỗi hydration", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  expect(await page.title()).toContain("ZSOPO");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([]);
});

test("route không tồn tại trả 404 tiếng Việt", async ({ page }) => {
  const res = await page.goto("/khong-ton-tai-xyz");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Không tìm thấy");
});
