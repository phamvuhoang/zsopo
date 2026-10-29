import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import { staffLogin, totp } from "./staff-login";

const DB_URL = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:56422/postgres";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:56424";

async function login(page: Page, email: string, password = "zsopo-local-1", next?: string) {
  await page.goto(next ? `/dang-nhap?next=${encodeURIComponent(next)}` : "/dang-nhap");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

test("vào /admin khi chưa đăng nhập thì chuyển về trang đăng nhập giữ next", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dang-nhap\?next=%2Fadmin/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Đăng nhập");
});

test("đăng nhập email đúng thì vào Ops đúng phạm vi", async ({ page }) => {
  await login(page, "le-tan@example.test", undefined, "/ops");
  await expect(page).toHaveURL(/\/ops$/);
  await expect(page.getByText("Zen Homestay Đà Lạt")).toBeVisible();
  await expect(page.getByText("Lễ tân", { exact: true })).toBeVisible();
});

test("sai mật khẩu báo lỗi, không lộ email có tồn tại hay không", async ({ page }) => {
  await login(page, "le-tan@example.test", "sai-mat-khau");
  await expect(page.getByRole("alert").filter({ hasText: "Email hoặc mật khẩu không đúng" })).toBeVisible();
});

test("callback từ chối redirect ra ngoài", async ({ page }) => {
  await page.goto("/auth/callback?next=https://evil.example/steal");
  expect(new URL(page.url()).host).toBe("localhost:3100");
  await expect(page).toHaveURL(/\/dang-nhap\?loi=/);
  await page.goto("/auth/callback?next=//evil.example");
  expect(new URL(page.url()).host).toBe("localhost:3100");
});

test("lễ tân không vào được trang nhân sự", async ({ page }) => {
  await login(page, "le-tan@example.test", undefined, "/admin/nhan-su");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Không có quyền truy cập");
});

test("quản lý điểm chưa MFA bị chuyển sang xác thực hai lớp khi vào nhân sự", async ({ page }) => {
  await login(page, "quan-ly@example.test", undefined, "/admin/nhan-su");
  await expect(page).toHaveURL(/\/auth\/mfa/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Xác thực hai lớp");
});

test("totp đúng vector RFC 6238", () => {
  expect(totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59_000)).toBe("287082");
});

test("lễ tân qua MFA mở được trang xác nhận chuyển khoản", async ({ page }) => {
  await staffLogin(page, "le-tan@example.test", { mfa: true, next: "/admin/thanh-toan" });
  await expect(page).toHaveURL(/\/admin\/thanh-toan$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Thanh toán và đối soát");
});

test("Google chưa cấu hình hiển thị trạng thái tắt, không có nút thành công giả", async ({ page }) => {
  await page.goto("/dang-nhap");
  await expect(page.getByRole("button", { name: /Google/ })).toBeDisabled();
  await expect(page.getByText("Đăng nhập Google chưa được bật")).toBeVisible();
});

test("quên mật khẩu: nhận email, đặt lại, đăng nhập bằng mật khẩu mới", async ({ page, request }) => {
  const email = "buong-phong-2@example.test";
  await request.delete(`${MAILPIT}/api/v1/messages`);
  await page.goto("/quen-mat-khau");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Gửi liên kết đặt lại" }).click();
  await expect(page.getByRole("status")).toContainText("Nếu email có tài khoản");

  let link = "";
  await expect(async () => {
    const list = await (await request.get(`${MAILPIT}/api/v1/search?query=to:${email}`)).json();
    expect(list.messages.length).toBeGreaterThan(0);
    const msg = await (await request.get(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json();
    link = (msg.Text as string).match(/https?:\/\/\S+/)![0];
  }).toPass({ timeout: 15_000 });

  await page.goto(link);
  await expect(page).toHaveURL(/\/dat-lai-mat-khau/);
  await page.getByLabel("Mật khẩu mới").fill("mat-khau-moi-123");
  await page.getByRole("button", { name: "Lưu mật khẩu" }).click();
  await expect(page.getByRole("status")).toContainText("Đã đổi mật khẩu");

  const db = new pg.Client({ connectionString: DB_URL });
  await db.connect();
  try {
    await page.context().clearCookies();
    await login(page, email, "mat-khau-moi-123", "/ops");
    await expect(page).toHaveURL(/\/ops$/);
  } finally {
    await db.query(`update auth.users set encrypted_password = extensions.crypt('zsopo-local-1', extensions.gen_salt('bf')) where email = $1`, [email]);
    await db.end();
  }
});
