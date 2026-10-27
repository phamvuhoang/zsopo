import { expect, test, type Browser } from "@playwright/test";

async function staff(browser: Browser, email: string, next: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`/dang-nhap?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("zsopo-local-1");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  return { ctx, page };
}

test("LT01-LT05: mở ca, đặt thủ công, thu tiền mặt, nhận phòng, trả phòng, bàn giao ca", async ({ browser }) => {
  const { ctx, page } = await staff(browser, "le-tan@example.test", "/ops/ca");
  await expect(page.getByRole("heading", { level: 1, name: "Ca làm việc" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mở ca" }).or(page.getByText("Dự kiến trong két"))).toBeVisible();
  if (await page.getByRole("button", { name: "Mở ca" }).isVisible()) {
    await page.getByLabel("Tiền mặt đầu ca (đ)").fill("1000000");
    await page.getByRole("button", { name: "Mở ca" }).click();
    await expect(page.getByText("Dự kiến trong két")).toBeVisible();
  }

  // LT01 walk-in today on a room that is free: pick the first sellable room the form offers until one succeeds.
  await page.goto("/ops/dat-phong/moi");
  await expect(page.getByRole("heading", { name: /Đặt phòng thủ công/ })).toBeVisible();
  const options = await page.getByRole("combobox", { name: /^Phòng/ }).locator("option").allTextContents();
  let booked = false;
  for (const opt of options) {
    await page.getByRole("combobox", { name: /^Phòng/ }).selectOption({ label: opt });
    await page.getByLabel("Họ tên khách").fill("Khách Quầy");
    await page.getByLabel("Số điện thoại").fill("0900000777");
    await page.getByRole("button", { name: "Tạo đặt phòng" }).click();
    try {
      await page.waitForURL(/\/ops\/dat-phong\/[0-9a-f-]{36}$/, { timeout: 4000 });
      booked = true;
      break;
    } catch {
      await page.goto("/ops/dat-phong/moi");
      await expect(page.getByRole("heading", { name: /Đặt phòng thủ công/ })).toBeVisible();
    }
  }
  expect(booked).toBe(true);

  // Pay the full amount in cash, check in, check out.
  await expect(page.getByRole("heading", { name: "Bảng kê" })).toBeVisible();
  const total = await page.locator("dl >> text=Tổng").locator("xpath=..").locator("dd").innerText();
  await page.getByLabel("Số tiền").fill(total.replace(/\D/g, ""));
  await page.getByRole("button", { name: "Ghi nhận" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã ghi nhận tiền" })).toBeVisible();
  await page.reload();
  await page.getByRole("link", { name: "Nhận phòng (LT02)" }).click();
  await expect(page.getByRole("heading", { name: "Nhận phòng (LT02)" })).toBeVisible();
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await page.getByRole("button", { name: "Xác nhận giao phòng" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã nhận phòng" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Mã QR mở menu dịch vụ của phòng" })).toBeVisible();

  const bookingUrl = page.url().replace("/nhan-phong", "");
  await page.goto(`${bookingUrl}/tra-phong`);
  await expect(page.getByRole("heading", { name: "Trả phòng (LT04)" })).toBeVisible();
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Xác nhận trả phòng" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã trả phòng" })).toBeVisible();

  // LT05 handover to the manager, who acknowledges.
  await page.goto("/ops/ca");
  await expect(page.getByText("Dự kiến trong két")).toBeVisible();
  const expected = await page.locator("dt:has-text('Dự kiến trong két') + dd").innerText();
  await page.getByLabel("Thực đếm (đ)").fill(expected.replace(/\D/g, ""));
  await page.getByRole("combobox", { name: /Người nhận ca/ }).selectOption({ label: "Quản lý điểm Đà Lạt" });
  await page.getByRole("button", { name: "Bàn giao" }).click();
  await expect(page.getByText(/chờ người nhận xác nhận/).first()).toBeVisible();
  await ctx.close();

  const mgr = await staff(browser, "quan-ly@example.test", "/ops/ca");
  const ack = mgr.page.getByRole("button", { name: "Xác nhận đã nhận ca" });
  await expect(ack.first()).toBeVisible();
  const pending = await ack.count();
  await ack.first().click();
  // The acknowledged shift leaves the "waiting for you" list once BM01 is locked.
  await expect(ack).toHaveCount(pending - 1);
  await mgr.ctx.close();
});

test("sơ đồ phòng hiển thị trạng thái suy ra và timeline 7 đêm", async ({ browser }) => {
  const { ctx, page } = await staff(browser, "le-tan@example.test", "/ops/phong");
  await expect(page.getByRole("heading", { level: 1, name: "Sơ đồ phòng hôm nay" })).toBeVisible();
  await expect(page.getByText("P01 Thạch Anh Hồng").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "7 đêm tới" })).toBeVisible();
  await ctx.close();
});
