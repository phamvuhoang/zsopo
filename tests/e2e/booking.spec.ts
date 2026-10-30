import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import { staffLogin } from "./staff-login";

const DB_URL = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:56422/postgres";
const iso = (d: Date) => d.toISOString().slice(0, 10);
/** Random far-future Mon-Wed stay (weekday price, 2 x 1.250.000 đ) so reruns never collide. */
function stay() {
  const monday0 = Date.UTC(2029, 0, 1); // 2029-01-01 is a Monday
  const start = new Date(monday0 + Math.floor(Math.random() * 400) * 7 * 86_400_000);
  return { arrival: iso(start), departure: iso(new Date(start.getTime() + 2 * 86_400_000)) };
}

async function book(page: Page, room = "thach-anh-hong", phone = `0900${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`) {
  const d = stay();
  await page.goto(`/dat-phong?phong=${room}&nhan=${d.arrival}&tra=${d.departure}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Đặt phòng");
  await page.getByRole("button", { name: "Xem giá" }).click();
  await expect(page.getByText("Tiền cọc (30%)")).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByLabel("Họ và tên").fill("Nguyễn Thử Nghiệm");
  await page.getByLabel("Số điện thoại").fill(phone);
  await page.getByLabel("Email").fill("dat-phong@example.test");
  await page.getByLabel(/Tôi đồng ý với điều khoản/).check();
  await page.getByRole("button", { name: "Giữ phòng và thanh toán cọc" }).click();
  await expect(page).toHaveURL(/\/dat-phong\/[A-Z0-9]+\/thanh-toan$/);
  return page.url().match(/dat-phong\/([A-Z0-9]+)\//)![1]!;
}

async function staffPays(page: Page, code: string, amount: string) {
  const staff = await page.context().browser()!.newContext();
  const p = await staff.newPage();
  await staffLogin(p, "le-tan@example.test", { mfa: true, next: "/admin/thanh-toan" });
  await p.getByLabel("Mã đơn").fill(code);
  await p.getByLabel("Số tiền (đ)").fill(amount);
  await p.getByLabel("Mã giao dịch / số biên nhận").fill(`VCB-${Date.now()}`);
  await p.getByLabel("Chứng cứ đối soát").fill("Sao kê VCB dòng 12");
  await p.getByRole("button", { name: "Ghi nhận", exact: true }).click();
  await expect(p.getByRole("status").filter({ hasText: "Đã ghi nhận" })).toBeVisible();
  await staff.close();
}

test("F1: chọn ngày, giữ phòng, VietQR, báo chuyển khoản, nhân viên xác nhận, biên nhận", async ({ page }) => {
  const code = await book(page);
  await expect(page.getByRole("img", { name: "Mã VietQR chuyển khoản tiền cọc" })).toBeVisible();
  await expect(page.getByText(`ZS${code}`)).toBeVisible();
  await expect(page.getByText(/Giữ phòng đến/)).toBeVisible();

  await page.reload();
  expect(page.url()).toContain(`/dat-phong/${code}/thanh-toan`);

  await page.getByRole("button", { name: "Tôi đã chuyển khoản" }).click();
  await expect(page.getByText(/Đã báo chuyển khoản/)).toBeVisible();
  await expect(page.getByText("Chờ xác nhận tiền cọc")).toBeVisible();

  await staffPays(page, code, "750000");
  await page.goto(`/dat-phong/${code}/xac-nhan`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Đặt phòng đã được xác nhận");
  await expect(page.getByText("Phòng Thạch Anh Hồng")).toBeVisible();
});

test("thiếu cọc: khách thấy đang đối soát, không xác nhận", async ({ page }) => {
  const code = await book(page);
  await staffPays(page, code, "100000");
  await page.reload();
  await expect(page.getByText(/đang đối soát/)).toBeVisible();
});

test("hết thời gian giữ chỗ hiển thị rõ, không tạo đơn mới khi tải lại", async ({ page }) => {
  const phone = "0911" + String(Date.now()).slice(-6);
  const code = await book(page, "thach-anh-hong", phone);
  const db = new pg.Client({ connectionString: DB_URL });
  await db.connect();
  await db.query(`update stay.bookings set held_until = now() - interval '1 minute' where order_id = (select id from commerce.orders where code = $1)`, [code]);
  await db.query(`select stay.expire_all_holds()`);
  await page.reload();
  await expect(page.getByText("Hết thời gian giữ phòng")).toBeVisible();
  const { rows } = await db.query(`select count(*)::int n from commerce.orders where contact_snapshot->>'phone' = $1`, [phone]);
  expect(rows[0].n).toBe(1);
  await db.end();
});

test("không có phiên khách thì không xem được đơn dù biết mã", async ({ page, browser }) => {
  const code = await book(page);
  const other = await browser.newContext();
  const p = await other.newPage();
  await p.goto(`/dat-phong/${code}/thanh-toan`);
  await expect(p.getByRole("heading", { level: 1 })).toHaveText("Không mở được đơn");
  await expect(p.getByText(`ZS${code}`)).toHaveCount(0);
  await other.close();
});

test("thiếu đồng ý điều khoản thì không giữ phòng", async ({ page }) => {
  const d = stay();
  await page.goto(`/dat-phong?phong=thach-anh-hong&nhan=${d.arrival}&tra=${d.departure}`);
  await page.getByRole("button", { name: "Xem giá" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await page.getByLabel("Họ và tên").fill("Nguyễn Thử");
  await page.getByLabel("Số điện thoại").fill("0900000124");
  await page.getByLabel("Email").fill("x@example.test");
  await page.getByRole("button", { name: "Giữ phòng và thanh toán cọc" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "điều khoản" })).toBeVisible();
  await expect(page).toHaveURL(/\/dat-phong\?/);
});
