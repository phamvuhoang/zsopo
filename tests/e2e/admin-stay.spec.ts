import { expect, test } from "@playwright/test";

test("quản lý điểm thêm giá cuối tuần và khóa lịch bảo trì", async ({ page }) => {
  await page.goto("/dang-nhap?next=/admin/diem/da-lat");
  await page.getByLabel("Email").fill("quan-ly@example.test");
  await page.getByLabel("Mật khẩu", { exact: true }).fill("zsopo-local-1");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Zen Homestay Đà Lạt");

  const room = page.getByRole("listitem").filter({ hasText: "Thạch Anh Tím" }).first();
  await room.getByText("Giá, mở bán và bảng năng lượng").click();
  const rateForm = room.locator("form").filter({ has: page.getByRole("button", { name: "Lưu giá" }) });
  await rateForm.getByRole("combobox", { name: /^Loại/ }).selectOption("weekday");
  await rateForm.getByRole("combobox", { name: /^Thứ/ }).selectOption("0");
  await rateForm.getByLabel("Giá/đêm (đ)").fill("1500000");
  await rateForm.getByRole("button", { name: "Lưu giá" }).click();
  await expect(rateForm.getByRole("status")).toContainText("Đã lưu giá");

  const block = page.locator("form").filter({ has: page.getByRole("button", { name: "Khóa lịch" }) });
  await block.getByRole("combobox", { name: /^Phòng/ }).selectOption({ label: "P02 Thạch Anh Tím" });
  // Random far-future dates keep reruns from colliding with earlier blocks.
  const start = new Date(Date.UTC(2028, 0, 1) + Math.floor(Math.random() * 3000) * 2 * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  await block.getByLabel("Từ ngày").fill(iso(start));
  await block.getByLabel("Đến ngày (không gồm)").fill(iso(new Date(start.getTime() + 86_400_000)));
  await block.getByLabel("Lý do").fill("Sơn lại tường");
  await block.getByRole("button", { name: "Khóa lịch" }).click();
  await expect(block.getByRole("status")).toContainText("Đã khóa lịch");
});
