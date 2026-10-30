import { expect, test } from "@playwright/test";
import fixtures from "../../packages/db/fixtures/rooms.json" with { type: "json" };

test("danh sách 13 phòng, phòng chưa mở bán có nhãn và không có giá", async ({ page }) => {
  await page.goto("/stay/da-lat/phong");
  // Integration tests may add extra rooms to the local DB; assert every fixture room is listed.
  for (const r of fixtures.rooms) await expect(page.getByRole("heading", { level: 3, name: `Phòng ${r.name}`, exact: true })).toBeVisible();
  const closed = page.getByRole("listitem").filter({ hasText: "Phòng Ngọc Bích" });
  await expect(closed.getByText("Chưa mở bán")).toBeVisible();
  await expect(closed.getByText(/Từ/)).toHaveCount(0);
});

test("lọc theo ngày hiển thị trạng thái còn phòng", async ({ page }) => {
  await page.goto("/stay/da-lat/phong?nhan=2027-01-11&tra=2027-01-13&khach=2");
  await expect(page.getByText("Còn phòng").first()).toBeVisible();
});

test("trang phòng có bảng năng lượng, lịch trống và đọc được khi tắt JS", async ({ page, browser }) => {
  await page.goto("/stay/da-lat/phong/thach-anh-hong");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Phòng Thạch Anh Hồng");
  await expect(page.getByLabel("Bảng năng lượng")).toContainText("không thay thế tư vấn y khoa");
  await expect(page.getByRole("button", { name: /còn phòng/ }).first()).toBeVisible();

  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const nojs = await ctx.newPage();
  await nojs.goto("/stay/da-lat/phong/thach-anh-hong");
  await expect(nojs.getByText("1.250.000 đ")).toBeVisible();
  await expect(nojs.getByText("Thạch anh hồng Madagascar").first()).toBeVisible();
  await ctx.close();
});

test("phòng chưa mở bán không có lịch đặt", async ({ page }) => {
  await page.goto("/stay/da-lat/phong/ngoc-bich");
  await expect(page.getByText("Phòng chưa mở bán")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Lịch trống/ })).toHaveCount(0);
});

test("phòng không tồn tại trả 404", async ({ request }) => {
  expect((await request.get("/stay/da-lat/phong/khong-co")).status()).toBe(404);
});

test("phòng công khai mới không cần build lại, phòng nháp vẫn trả 404", async ({ page, request }) => {
  const { default: pg } = await import("pg");
  const db = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:56422/postgres" });
  await db.connect();
  const slug = `public-route-${Date.now()}`;
  let roomId: string | undefined;
  try {
    const path = `/stay/da-lat/phong/${slug}`;
    expect((await request.get(path)).status()).toBe(404);
    const { rows } = await db.query(`insert into stay.rooms(entity_id, location_id, code, slug, name, room_type, capacity_adults, max_guests, status)
      values ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', $1, $1, 'Mới công khai', 'Đôi', 2, 2, 'published') returning id`, [slug]);
    roomId = rows[0].id;
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Phòng Mới công khai");
    await db.query(`update stay.rooms set status = 'draft' where id = $1`, [roomId]);
    expect((await page.goto(path))?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Không tìm thấy trang");
  } finally {
    if (roomId) await db.query(`delete from stay.rooms where id = $1`, [roomId]);
    await db.end();
  }
});
