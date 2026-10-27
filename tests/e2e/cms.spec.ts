import { expect, test } from "@playwright/test";

test("biên tập viên soạn, đăng bài; bài hiện ở Blog và tìm được không dấu", async ({ page, request }) => {
  const tag = `tramhuong${Date.now().toString(36)}`;
  await page.goto("/dang-nhap?next=/admin/noi-dung");
  await page.getByLabel("Email").fill("bien-tap@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("zsopo-local-1");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.getByLabel("Tiêu đề", { exact: true }).first().fill(`Nghi thức trầm hương ${tag}`);
  await page.getByLabel(/^Nội dung \(Markdown/).fill(`## Chuẩn bị\n\nĐốt trầm hương và thở chậm.\n\n<script>alert(1)</script>`);
  await page.getByRole("button", { name: "Lưu nháp" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu bản nháp" })).toBeVisible();
  await page.getByRole("link", { name: new RegExp(tag) }).first().click();
  await page.getByRole("button", { name: "Duyệt và đăng / hẹn giờ" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã đăng" })).toBeVisible();

  await page.goto("/tim-kiem?q=tram%20huong%20" + tag);
  await page.getByRole("link", { name: new RegExp(tag) }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(tag);
  const html = await (await request.get(page.url())).text();
  expect(html).not.toContain("<script>alert(1)</script>");
});

test("form liên hệ gửi được khi đã có chính sách", async ({ page }) => {
  await page.goto("/lien-he");
  await page.getByLabel("Họ tên").fill("Khách Liên Hệ");
  await page.getByLabel("Email").fill("lien-he@example.test");
  await page.getByLabel("Nội dung").fill("Cho tôi hỏi về gói đoàn cuối năm.");
  await page.getByLabel(/Tôi đồng ý để ZSOPO/).check();
  await page.getByRole("button", { name: "Gửi liên hệ" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Cảm ơn bạn" })).toBeVisible();
});
