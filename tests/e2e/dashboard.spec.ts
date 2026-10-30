import { expect, test } from "@playwright/test";

test("tài chính xem tổng quan 5 nguồn, doanh thu tách tiền thu và tiền cọc", async ({ page }) => {
  await page.goto("/dang-nhap?next=/admin");
  await page.getByLabel("Email").fill("tai-chinh@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("zsopo-local-1");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Tổng quan vận hành" })).toBeVisible();
  for (const label of ["Doanh thu ghi nhận", "Tiền đã thu", "Tiền cọc / nghĩa vụ với khách", "Công suất phòng"]) await expect(page.getByText(label)).toBeVisible();
  for (const src of ["Phòng", "Đồ uống", "Dịch vụ tự vận hành", "Sản phẩm", "Dịch vụ đồng tổ chức"]) await expect(page.getByRole("img", { name: new RegExp(`^${src} `) })).toBeVisible();
  await page.goto("/admin/so-cai");
  await expect(page.getByRole("heading", { level: 1, name: "Sổ cái vận hành" })).toBeVisible();
});
