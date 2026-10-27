import { expect, test, type Browser } from "@playwright/test";
import pg from "pg";

const DB_URL = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:56422/postgres";

async function staff(browser: Browser, email: string, next: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`/dang-nhap?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("zsopo-local-1");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  return { ctx, page };
}

test("BP01 -> BM02 -> BM03: buồng phòng làm checklist, quản lý nghiệm thu, phòng sẵn sàng", async ({ browser }) => {
  const db = new pg.Client({ connectionString: DB_URL });
  await db.connect();
  const code = `H${Date.now().toString(36).slice(-5)}`.toUpperCase();
  const { rows } = await db.query(
    `with r as (insert into stay.rooms(entity_id, location_id, code, slug, name, room_type, capacity_adults, max_guests, status, cleanliness)
       values ('e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001',$1,lower($1),'Phòng HK','Đôi tiêu chuẩn',2,2,'published','dirty') returning id)
     insert into stay.housekeeping_tasks(entity_id, location_id, room_id, kind, template_version) select 'e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001', r.id, 'checkout', 1 from r returning id, room_id`, [code]);
  const { id: taskId, room_id: roomId } = rows[0];

  const hk = await staff(browser, "buong-phong@example.test", `/ops/buong-phong/${taskId}`);
  await expect(hk.page.getByRole("heading", { level: 1 })).toContainText(code);
  const pass = hk.page.getByRole("button", { name: "Đạt", exact: true });
  const n = await pass.count();
  for (let i = 0; i < n; i++) {
    await pass.nth(i).click();
    await expect(hk.page.getByRole("status").filter({ hasText: "Đã lưu" })).toHaveCount(i + 1);
  }
  // Straight on, no reload: the submit must carry the version left by the answers just synced.
  await hk.page.getByRole("button", { name: /Hoàn tất tự kiểm/ }).click();
  await expect(hk.page.getByText(/Việc không còn ở trạng thái làm được|Đã gửi nghiệm thu/).first()).toBeVisible();
  expect((await db.query(`select state from stay.housekeeping_tasks where id = $1`, [taskId])).rows[0].state).toBe("awaiting_inspection");
  await hk.ctx.close();

  const mgr = await staff(browser, "quan-ly@example.test", `/ops/nghiem-thu/${taskId}`);
  await mgr.page.getByRole("button", { name: "Đạt, phòng sẵn sàng" }).click();
  await expect(mgr.page.getByText(/Việc không ở trạng thái chờ nghiệm thu|Đã ký BM03/).first()).toBeVisible();
  await mgr.ctx.close();

  const { rows: after } = await db.query(`select cleanliness from stay.rooms where id = $1`, [roomId]);
  expect(after[0].cleanliness).toBe("ready");
  await db.end();
});
