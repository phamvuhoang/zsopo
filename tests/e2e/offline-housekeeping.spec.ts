import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

// Service workers only run against the production server (`next start`): run with CI=1 after `pnpm build`.
test.skip(!process.env.CI, "offline PWA test needs the production server (CI=1)");

const DB_URL = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:56422/postgres";

async function taskInFreshRoom() {
  const db = new pg.Client({ connectionString: DB_URL });
  await db.connect();
  const code = `O${Date.now().toString(36).slice(-5)}`.toUpperCase();
  const { rows } = await db.query(
    `with r as (insert into stay.rooms(entity_id, location_id, code, slug, name, room_type, capacity_adults, max_guests, status, cleanliness)
       values ('e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001',$1,lower($1),'Phòng Offline','Đôi tiêu chuẩn',2,2,'published','dirty') returning id)
     insert into stay.housekeeping_tasks(entity_id, location_id, room_id, kind, template_version) select 'e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001', r.id, 'checkout', 1 from r returning id`, [code]);
  return { db, taskId: rows[0].id as string };
}

async function login(page: Page, next: string, email = "buong-phong@example.test") {
  await page.goto(`/dang-nhap?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("zsopo-local-1");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL(`**${next}`);
}

/** Make sure the Ops service worker controls the page before going offline. */
async function controlled(page: Page) {
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).some((r) => r.active?.state === "activated")), { timeout: 15_000 }).toBe(true);
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

test("ghi chú offline sống sót qua reload, đồng bộ đúng một lần khi có mạng", async ({ page, context }) => {
  const { db, taskId } = await taskInFreshRoom();
  await login(page, `/ops/buong-phong/${taskId}`);
  await controlled(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await context.setOffline(true);
  const note = page.getByLabel(/^Ghi chú Kiểm tra đồ khách để quên/);
  await note.fill("Đã kiểm tra đồ quên");
  await page.getByRole("button", { name: "Đạt", exact: true }).nth(2).click();
  await expect(page.getByText("Chờ đồng bộ").first()).toBeVisible();

  await page.reload();
  await expect(page.getByText(/Chờ đồng bộ \(1\)/)).toBeVisible();
  await expect(page.getByLabel(/^Ghi chú Kiểm tra đồ khách để quên/)).toHaveValue("Đã kiểm tra đồ quên");

  await context.setOffline(false);
  await page.getByRole("button", { name: "Đồng bộ ngay" }).click();
  await expect(page.getByText("Đã đồng bộ")).toBeVisible();
  await page.getByRole("button", { name: "Đồng bộ ngay" }).click(); // retry must not duplicate
  const { rows } = await db.query(`select count(*)::int n, max(note) note from stay.checklist_results where task_id = $1 and item_code = 'G2-1'`, [taskId]);
  expect(rows[0]).toEqual({ n: 1, note: "Đã kiểm tra đồ quên" });
  await db.end();
});

test("server đã đổi mục đó => xung đột hiển thị, giữ bản nháp", async ({ page, context }) => {
  const { db, taskId } = await taskInFreshRoom();
  await login(page, `/ops/buong-phong/${taskId}`);
  await controlled(page);
  await context.setOffline(true);
  await page.getByLabel(/^Ghi chú Gõ cửa/).fill("Bản nháp của tôi");
  await page.getByRole("button", { name: "Không đạt", exact: true }).first().click();
  // Meanwhile a colleague records the same item online.
  await db.query(
    `insert into stay.checklist_results(task_id, item_code, result, note, operation_id, task_version, actor)
     values ($1, 'G1-1', 'pass', 'Đồng nghiệp đã kiểm', gen_random_uuid(), 99, 'a0000000-0000-4000-8000-000000000009')`, [taskId]);
  await context.setOffline(false);
  await page.getByRole("button", { name: "Đồng bộ ngay" }).click();
  await expect(page.getByText(/Xung đột \(1\)/)).toBeVisible();
  await expect(page.getByText("Bản nháp của tôi")).toBeVisible();
  await db.end();
});

test("đăng xuất xóa dữ liệu offline trên thiết bị", async ({ page }) => {
  const { db, taskId } = await taskInFreshRoom();
  await login(page, `/ops/buong-phong/${taskId}`);
  await controlled(page);
  await page.goto("/ops");
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await page.waitForURL("**/dang-nhap");
  const left = await page.evaluate(async () => ({ dbs: (await indexedDB.databases()).filter((d) => d.name?.startsWith("zsopo-ops")).length, caches: (await caches.keys()).filter((k) => k.startsWith("ops-pages")).length }));
  expect(left).toEqual({ dbs: 0, caches: 0 });
  await db.end();
});
