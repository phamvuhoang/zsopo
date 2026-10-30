import { expect, test } from "@playwright/test";

test("tài chính lọc phân khúc theo đồng ý marketing và mở hồ sơ 360", async ({ page }) => {
  await page.goto("/dang-nhap?next=/admin/khach-hang");
  await page.getByLabel("Email").fill("tai-chinh@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("zsopo-local-1");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Khách hàng" })).toBeVisible();
  await page.getByRole("combobox", { name: /Đồng ý marketing/ }).selectOption("1");
  await page.getByRole("button", { name: "Lọc" }).click();
  await expect(page).toHaveURL(/consent=1/);
  await expect(page.getByText(/khách phù hợp/)).toBeVisible();
  const first = page.getByRole("table").getByRole("link").first();
  if (await first.count()) {
    await first.click();
    await expect(page.getByRole("heading", { name: "Dòng thời gian (lưu trú, shop, dịch vụ)" })).toBeVisible();
  }
});

test("lễ tân không vào được CRM", async ({ page }) => {
  await page.goto("/dang-nhap?next=/admin/khach-hang");
  await page.getByLabel("Email").fill("le-tan@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("zsopo-local-1");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Không có quyền truy cập");
});
