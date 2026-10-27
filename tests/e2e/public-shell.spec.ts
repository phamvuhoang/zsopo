import { expect, test } from "@playwright/test";

const PUBLIC = ["/", "/gioi-thieu", "/lien-he", "/chinh-sach/noi-quy", "/chinh-sach/bao-mat"];
const DEFERRED = /\/(khoa-hoc|chuyen-gia|su-kien|quyen-gop|ho-so-nang-luong|cong-dong|thanh-vien|give\/)/;

test("mọi link nội bộ trên các trang công khai đều mở được, không dẫn tới module chưa phát hành", async ({ page, request }) => {
  const hrefs = new Set<string>();
  for (const path of PUBLIC) {
    await page.goto(path);
    for (const h of await page.locator("a[href^='/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!))) hrefs.add(h.split("#")[0]!);
  }
  for (const h of hrefs) {
    expect(h, `deferred module link ${h}`).not.toMatch(DEFERRED);
    const res = await request.get(h, { maxRedirects: 0 });
    expect(res.status(), `link ${h}`).toBeLessThan(400);
  }
});

test("mỗi trang có đúng một h1 và ảnh đều có alt", async ({ page }) => {
  for (const path of PUBLIC) {
    await page.goto(path);
    await expect(page.locator("h1"), path).toHaveCount(1);
    expect(await page.locator("img:not([alt])").count(), path).toBe(0);
  }
});

test("bàn phím: skip link tới nội dung chính", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Bỏ qua tới nội dung chính" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#noi-dung")).toBeFocused();
});

test("menu di động mở bằng bàn phím, Escape đóng và trả focus @mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const open = page.getByRole("button", { name: "Mở menu" });
  await open.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Menu" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Giới thiệu" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
});

test("chế độ tối được lưu qua lần tải lại", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Chuyển giao diện tối" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Chuyển giao diện sáng" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("chính sách lấy từ CMS đã publish; slug không tồn tại trả 404", async ({ page, request }) => {
  await page.goto("/chinh-sach/noi-quy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nội quy lưu trú");
  await expect(page.getByText("14:00")).toBeVisible();
  expect((await request.get("/chinh-sach/khong-ton-tai")).status()).toBe(404);
});

test("giới thiệu có ba trụ cột Space, Connect, Give", async ({ page }) => {
  await page.goto("/gioi-thieu");
  for (const name of ["Space", "Connect", "Give"]) await expect(page.getByRole("main").getByRole("heading", { level: 2, name })).toBeVisible();
});

test("trang công khai đọc được khi tắt JavaScript", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/chinh-sach/noi-quy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nội quy lưu trú");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await ctx.close();
});
