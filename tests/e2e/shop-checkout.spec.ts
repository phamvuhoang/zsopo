import { expect, test, type Page } from "@playwright/test";

async function addAndCheckout(page: Page, method: "COD" | "bank") {
  await page.goto("/shop/vong-tay-thach-anh-hong-8-ly");
  const variant = page.getByRole("complementary").getByRole("listitem").filter({ hasText: "Size S" }).first();
  await variant.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await page.goto("/gio-hang");
  await expect(page.getByText("Tiền hàng")).toBeVisible();
  await page.getByRole("link", { name: "Thanh toán" }).last().click();
  await page.getByLabel("Họ tên người nhận").fill("Khách Mua Hàng");
  await page.getByLabel("Số điện thoại").fill("0900000555");
  await page.getByLabel(/Địa chỉ/).fill("12 Đường Hoa, Phường 4");
  if (method === "bank") await page.getByLabel(/Chuyển khoản \(VietQR/).check();
  await page.getByLabel(/Tôi đồng ý điều khoản/).check();
  await page.getByRole("button", { name: "Đặt hàng" }).click();
  await expect(page).toHaveURL(/\/don-hang\/[A-Z0-9]+$/);
}

test("F2 COD: thêm giỏ, thanh toán, theo dõi đơn riêng tư", async ({ page }) => {
  await addAndCheckout(page, "COD");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Đơn hàng");
  await expect(page.getByText("Chưa thanh toán")).toBeVisible();
  await expect(page.getByText("COD", { exact: true })).toBeVisible();
});

test("F2 chuyển khoản: hiển thị VietQR với số tiền đơn", async ({ page }) => {
  await addAndCheckout(page, "bank");
  await expect(page.getByRole("img", { name: "Mã VietQR chuyển khoản đơn hàng" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tôi đã chuyển khoản" })).toBeVisible();
});

test("thiếu đồng ý điều khoản thì không đặt hàng", async ({ page }) => {
  await page.goto("/shop/vong-tay-thach-anh-hong-8-ly");
  await page.getByRole("complementary").getByRole("listitem").filter({ hasText: "Size S" }).first().getByRole("button", { name: "Thêm vào giỏ" }).click();
  await page.goto("/thanh-toan");
  await page.getByLabel("Họ tên người nhận").fill("Khách");
  await page.getByLabel("Số điện thoại").fill("0900000556");
  await page.getByLabel(/Địa chỉ/).fill("12 Đường Hoa");
  await page.getByRole("button", { name: "Đặt hàng" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "điều khoản" })).toBeVisible();
});
