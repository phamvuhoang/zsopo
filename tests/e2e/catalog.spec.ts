import { expect, test } from "@playwright/test";

test("shop có 9 danh mục, lọc theo luân xa, trang sản phẩm có bảng năng lượng và báo hết hàng", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Shop năng lượng");
  await expect(page.getByRole("main").getByRole("list").first().getByRole("link")).toHaveCount(9);
  await page.goto("/shop/danh-muc/da-va-vat-pham?luan-xa=heart");
  await expect(page.getByRole("heading", { level: 3, name: "Vòng tay thạch anh hồng 8 ly" })).toBeVisible();
  await page.getByRole("heading", { level: 3, name: "Vòng tay thạch anh hồng 8 ly" }).click();
  await expect(page.getByLabel("Bảng năng lượng")).toContainText("Thạch anh hồng Madagascar");
  const oos = page.getByRole("listitem").filter({ hasText: "Size L (18cm)" });
  await expect(oos.getByText("Hết hàng")).toBeVisible();
  await oos.getByLabel("Email").fill("bao-hang@example.test");
  await oos.getByLabel(/Đồng ý nhận email/).check();
  await oos.getByRole("button", { name: "Báo tôi khi có hàng" }).click();
  await expect(oos.getByRole("status")).toContainText("Đã đăng ký");
});

test("QR nghi lễ mở hướng dẫn công khai, có bước, không cần tài khoản", async ({ page }) => {
  await page.goto("/la/nghi-le-vong-tay-thach-anh-hong-8-ly");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nghi lễ");
  await expect(page.getByRole("heading", { level: 2, name: /Bước 1/ })).toBeVisible();
});

test("trang sản phẩm đọc được khi tắt JavaScript", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/shop/vong-tay-thach-anh-hong-8-ly");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vòng tay thạch anh hồng 8 ly");
  await expect(page.getByText("380.000 đ").first()).toBeVisible();
  await ctx.close();
});
