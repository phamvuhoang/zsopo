import { expect, test } from "@playwright/test";
import pg from "pg";

const DB_URL = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:56422/postgres";

test("khách quét QR kỳ ở -> gửi yêu cầu -> lễ tân nhận, phục vụ, hoàn tất -> khách thấy hoàn tất", async ({ page, browser }) => {
  const db = new pg.Client({ connectionString: DB_URL });
  await db.connect();
  // A checked-in stay in a fresh room with a handed-over stay token (front desk check-in issues it in T10).
  const code = `E${Date.now().toString(36).slice(-5)}`.toUpperCase();
  const { rows } = await db.query(`
    with r as (insert into stay.rooms(entity_id, location_id, code, slug, name, room_type, capacity_adults, max_guests, status)
      values ('e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001', $1, lower($1), 'Phòng E2E', 'Đôi tiêu chuẩn', 2, 2, 'draft') returning id),
    o as (insert into commerce.orders(entity_id, location_id, kind, status) values ('e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','stay','confirmed') returning id),
    b as (insert into stay.bookings(entity_id, location_id, order_id, room_id, arrival, departure, state, adults)
      select 'e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001', o.id, r.id, current_date, current_date + 1, 'checked_in', 2 from o, r returning id)
    select stay.issue_stay_token(b.id) as token from b`, [code]);
  await db.end();

  await page.goto(`/api/stay?k=${encodeURIComponent(rows[0].token)}`);
  await expect(page).toHaveURL(/\/dich-vu\/da-lat$/);
  const tea = page.getByRole("listitem").filter({ hasText: "Trà thảo mộc tại phòng" });
  const at = new Date(Date.now() + 7 * 3600_000 + 60 * 60_000).toISOString().slice(0, 16); // VN local time + 1h
  await tea.getByLabel("Thời gian").fill(at);
  await tea.getByRole("button", { name: "Gửi yêu cầu" }).click();
  await expect(tea.getByRole("status")).toContainText("Đã gửi yêu cầu");

  const staff = await browser.newContext();
  const ops = await staff.newPage();
  await ops.goto("/dang-nhap?next=/ops/dich-vu");
  await ops.getByLabel("Email").fill("le-tan@example.test");
  await ops.getByLabel("Mật khẩu", { exact: true }).fill("zsopo-local-1");
  await ops.getByRole("button", { name: "Đăng nhập" }).click();
  const card = ops.getByRole("listitem").filter({ hasText: "Trà thảo mộc tại phòng" }).filter({ hasText: code });
  // Wait for the server-confirmed next state (the button label flips to "Đang lưu..." while pending).
  await card.getByRole("button", { name: "Nhận yêu cầu" }).click();
  await expect(card.getByRole("button", { name: "Bắt đầu phục vụ" })).toBeVisible();
  await card.getByRole("button", { name: "Bắt đầu phục vụ" }).click();
  await expect(card.getByRole("button", { name: "Hoàn tất" })).toBeVisible();
  await card.getByRole("button", { name: "Hoàn tất" }).click();
  await expect(card).toHaveCount(0); // completed requests leave the open list
  await staff.close();

  await page.reload();
  await expect(page.getByRole("listitem").filter({ hasText: "Trà thảo mộc tại phòng x1" }).getByText("Hoàn tất")).toBeVisible();
});

test("khách không có token chỉ xem thực đơn, không có nút gửi", async ({ page }) => {
  await page.goto("/dich-vu/da-lat");
  await expect(page.getByRole("heading", { level: 2, name: "Ẩm thực" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Gửi yêu cầu" })).toHaveCount(0);
});
