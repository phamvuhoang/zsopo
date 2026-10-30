import { expect, test, type Page } from "@playwright/test";
import pg from "pg";

// Service workers only run against the production server (`next start`): run with CI=1 after `pnpm build`.
test.skip(!process.env.CI, "offline PWA test needs the production server (CI=1)");

const DB_URL = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:56422/postgres";
// A valid 1x1 JPEG: the evidence bucket only takes image/jpeg, png and webp.
const JPEG_1PX_BASE64 =
  "/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAAaADAAQAAAABAAAAAQAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAAQABAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAgICAgICAwICAwUDAwMFBgUFBQUGCAYGBgYGCAoICAgICAgKCgoKCgoKCgwMDAwMDA4ODg4ODw8PDw8PDw8PD//bAEMBAgICBAQEBwQEBxALCQsQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEP/dAAQAAf/aAAwDAQACEQMRAD8A/fyiiigD/9k=";

async function taskInFreshRoom() {
  const db = new pg.Client({ connectionString: DB_URL });
  await db.connect();
  const code = `O${Date.now().toString(36).slice(-5)}`.toUpperCase();
  const { rows } = await db.query(
    `with r as (insert into stay.rooms(entity_id, location_id, code, slug, name, room_type, capacity_adults, max_guests, status, cleanliness)
       values ('e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001',$1,lower($1),'Phòng Offline','Đôi tiêu chuẩn',2,2,'published','dirty') returning id)
     insert into stay.housekeeping_tasks(entity_id, location_id, room_id, kind, template_version) select 'e0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001', r.id, 'checkout', 1 from r returning id`, [code]);
  return { db, taskId: rows[0].id as string, code };
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

test("mở việc từ danh sách (điều hướng trong app), mất mạng, tải lại vẫn dùng được", async ({ page, context }) => {
  const { db, taskId, code } = await taskInFreshRoom();
  await login(page, "/ops/buong-phong");
  await controlled(page);
  await page.getByRole("link", { name: new RegExp(code) }).click();
  await page.waitForURL(`**/ops/buong-phong/${taskId}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(code);
  // The service worker caches the full page in the background after the in-app navigation.
  await expect.poll(() => page.evaluate(async (p) => !!(await (await caches.open("ops-pages-v1")).match(p)), `/ops/buong-phong/${taskId}`)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(code);
  await context.setOffline(false);
  await db.end();
});

test("mục cuối điền khi mất mạng (trang mở lại từ cache), có mạng lại đồng bộ, gửi BM02 không cần tải lại", async ({ page, context }) => {
  const { db, taskId } = await taskInFreshRoom();
  await login(page, `/ops/buong-phong/${taskId}`);
  await controlled(page);
  const pass = page.getByRole("button", { name: "Đạt", exact: true });
  await expect(pass.first()).toBeVisible(); // checklist renders after the device queue loads
  const n = await pass.count();
  expect(n).toBeGreaterThan(1);
  for (let i = 0; i < n - 1; i++) {
    await pass.nth(i).click();
    await expect(page.getByRole("status").filter({ hasText: "Đã lưu" })).toHaveCount(i + 1);
  }
  await context.setOffline(true);
  await pass.nth(n - 1).click();
  await expect(page.getByText(/Chờ đồng bộ \(1\)/)).toBeVisible();
  // Phone locked / tab reopened while offline: the page comes from the cache with an older task version.
  await page.reload();
  await expect(page.getByText(/Chờ đồng bộ \(1\)/)).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("button", { name: "Đồng bộ ngay" }).click();
  await expect(page.getByText("Đã đồng bộ", { exact: true })).toBeVisible();
  // From here on, no reload: BM02 must carry the version left by that sync.
  await page.getByRole("button", { name: /Hoàn tất tự kiểm/ }).click();
  await expect(page.getByText(/VERSION_CONFLICT|xung đột|thay đổi/i)).toHaveCount(0);
  await expect.poll(async () => (await db.query(`select state from stay.housekeeping_tasks where id = $1`, [taskId])).rows[0].state).toBe("awaiting_inspection");
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

test("đăng xuất: còn bản nháp chưa đồng bộ thì hỏi trước; mất mạng thì không xóa gì; xác nhận mới xóa", async ({ page, context }) => {
  const { db, taskId } = await taskInFreshRoom();
  await login(page, `/ops/buong-phong/${taskId}`);
  await controlled(page);
  await context.setOffline(true);
  await page.getByLabel(/^Ghi chú Gõ cửa/).fill("Bản nháp chưa gửi");
  await page.getByRole("button", { name: "Không đạt", exact: true }).first().click();
  await expect(page.getByText("Chờ đồng bộ").first()).toBeVisible();
  // A colleague's change makes it a conflict that stays on the device after sync.
  await db.query(`insert into stay.checklist_results(task_id, item_code, result, note, operation_id, task_version, actor)
     values ($1, 'G1-1', 'pass', 'Đồng nghiệp', gen_random_uuid(), 99, 'a0000000-0000-4000-8000-000000000009')`, [taskId]);
  await context.setOffline(false);
  await page.goto("/ops");
  await expect(page.getByText(/Xung đột \(1\)/)).toBeVisible();
  const opsDbs = () => page.evaluate(async () => (await indexedDB.databases()).filter((d) => d.name?.startsWith("zsopo-ops")).length);

  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page.getByText(/1 thao tác chưa đồng bộ/)).toBeVisible();
  expect(await opsDbs()).toBe(1);

  await context.setOffline(true);
  await page.getByRole("button", { name: "Bỏ dữ liệu và đăng xuất" }).click();
  await expect(page.getByText(/Không đăng xuất được/)).toBeVisible();
  expect(await opsDbs()).toBe(1);

  await context.setOffline(false);
  await page.getByRole("button", { name: "Bỏ dữ liệu và đăng xuất" }).click();
  await page.waitForURL("**/dang-nhap");
  await expect.poll(() => page.evaluate(async () => ({ dbs: (await indexedDB.databases()).filter((d) => d.name?.startsWith("zsopo-ops")).length, caches: (await caches.keys()).filter((k) => k.startsWith("ops-pages")).length }))).toEqual({ dbs: 0, caches: 0 });
  await db.end();
});

test("BP01: chụp ảnh cho một mục, đồng bộ xong có đúng một ảnh trên server", async ({ page }) => {
  const { db, taskId } = await taskInFreshRoom();
  await login(page, `/ops/buong-phong/${taskId}`);
  await controlled(page);
  await page.getByLabel(/^Ảnh: Kiểm tra đồ khách để quên/).setInputFiles({ name: "do-quen.jpg", mimeType: "image/jpeg", buffer: Buffer.from(JPEG_1PX_BASE64, "base64") });
  await page.getByRole("button", { name: "Đạt", exact: true }).nth(2).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu" })).toHaveCount(1);
  const { rows } = await db.query(`select cardinality(media_ids)::int n from stay.checklist_results where task_id = $1 and item_code = 'G2-1'`, [taskId]);
  expect(rows).toEqual([{ n: 1 }]);
  await db.end();
});

test("BP01: ảnh sai loại hoặc quá 10MB bị chặn ngay khi chọn, không vào hàng đợi", async ({ page }) => {
  const { db, taskId } = await taskInFreshRoom();
  await login(page, `/ops/buong-phong/${taskId}`);
  await controlled(page);
  const photo = page.getByLabel(/^Ảnh: Kiểm tra đồ khách để quên/);
  const err = page.getByRole("status").filter({ hasText: /JPEG, PNG hoặc WebP/ });
  await photo.setInputFiles({ name: "anh.gif", mimeType: "image/gif", buffer: Buffer.from("R0lGODlhAQABAAAAACw=", "base64") });
  await expect(err).toHaveCount(1);
  await photo.setInputFiles({ name: "to.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
  await expect(err).toHaveCount(1);
  // No MIME type at all (HEIC on desktop Chrome, some Android pickers): storage would send it as application/octet-stream and the bucket refuses it.
  // Built in the page because setInputFiles fills an empty mimeType from the file name.
  await photo.evaluate((el: HTMLInputElement, b64) => {
    const dt = new DataTransfer();
    dt.items.add(new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], "khong-loai.jpg"));
    el.files = dt.files;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, JPEG_1PX_BASE64);
  await expect(err.filter({ hasText: '"khong-loai.jpg"' })).toHaveCount(1);
  // The rejected files are not kept: the answer goes through with no photo, and nothing waits on the device.
  await page.getByRole("button", { name: "Đạt", exact: true }).nth(2).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu" })).toHaveCount(1);
  const { rows } = await db.query(`select cardinality(media_ids)::int n from stay.checklist_results where task_id = $1 and item_code = 'G2-1'`, [taskId]);
  expect(rows).toEqual([{ n: 0 }]);
  expect((await db.query(`select count(*)::int n from core.media where path like $1`, [`%/${taskId}/%`])).rows[0].n).toBe(0);
  await db.end();
});

test("BP01: mạng rớt sau khi ảnh đã tải lên nhưng trước khi lưu mục, đồng bộ lại vẫn đính đúng một ảnh", async ({ page }) => {
  const { db, taskId } = await taskInFreshRoom();
  await login(page, `/ops/buong-phong/${taskId}`);
  await controlled(page);
  let dropped = 0;
  await page.route("**/ops/buong-phong/**", (route) => {
    const r = route.request();
    if (r.method() === "POST" && r.headers()["next-action"] && dropped++ === 0) return route.abort("connectionfailed"); // the server action only
    return route.continue();
  });
  await page.getByLabel(/^Ảnh: Kiểm tra đồ khách để quên/).setInputFiles({ name: "do-quen.jpg", mimeType: "image/jpeg", buffer: Buffer.from(JPEG_1PX_BASE64, "base64") });
  await page.getByRole("button", { name: "Đạt", exact: true }).nth(2).click();
  await expect.poll(() => dropped).toBe(1); // upload + media row come first, then the answer is sent (and dropped)
  await expect(page.getByRole("status").filter({ hasText: "Chờ đồng bộ" }).first()).toBeVisible();
  const media = () => db.query(`select count(*)::int n from core.media where path like $1`, [`%/${taskId}/%`]).then((r) => r.rows[0].n);
  expect(await media()).toBe(1); // uploaded and registered, but the answer never reached the server
  expect((await db.query(`select 1 from stay.checklist_results where task_id = $1`, [taskId])).rows).toHaveLength(0);
  await page.getByRole("button", { name: "Đồng bộ ngay" }).click();
  await expect(page.getByText("Đã đồng bộ", { exact: true })).toBeVisible();
  const { rows } = await db.query(`select cardinality(media_ids)::int n, media_ids[1] id from stay.checklist_results where task_id = $1 and item_code = 'G2-1'`, [taskId]);
  expect(rows[0].n).toBe(1);
  expect(await media()).toBe(1); // re-uploaded on retry without a second media row
  expect((await db.query(`select id from core.media where path like $1`, [`%/${taskId}/%`])).rows[0].id).toBe(rows[0].id);
  await db.end();
});

test("BP01: ảnh chờ gửi đã mất khỏi thiết bị thì việc bị từ chối kèm lý do, không lưu lặng lẽ thiếu ảnh", async ({ page, context }) => {
  const { db, taskId } = await taskInFreshRoom();
  await login(page, `/ops/buong-phong/${taskId}`);
  await controlled(page);
  await context.setOffline(true);
  await page.getByLabel(/^Ảnh: Kiểm tra đồ khách để quên/).setInputFiles({ name: "do-quen.jpg", mimeType: "image/jpeg", buffer: Buffer.from(JPEG_1PX_BASE64, "base64") });
  await page.getByRole("button", { name: "Đạt", exact: true }).nth(2).click();
  await expect(page.getByText(/Chờ đồng bộ \(1\)/)).toBeVisible();
  await page.evaluate(async () => { // the 7-day TTL prune (or a storage clean-up) removed the draft
    const name = (await indexedDB.databases()).find((d) => d.name?.startsWith("zsopo-ops"))!.name!;
    const idb: IDBDatabase = await new Promise((ok) => { const q = indexedDB.open(name); q.onsuccess = () => ok(q.result); });
    await new Promise((ok) => { const t = idb.transaction("mediaDrafts", "readwrite"); t.objectStore("mediaDrafts").clear(); t.oncomplete = () => ok(null); });
    idb.close();
  });
  await context.setOffline(false);
  await page.getByRole("button", { name: "Đồng bộ ngay" }).click();
  await expect(page.getByText(/Ảnh chờ gửi không còn trên thiết bị/)).toBeVisible();
  expect((await db.query(`select 1 from stay.checklist_results where task_id = $1`, [taskId])).rows).toHaveLength(0);
  await db.end();
});

test("BP01: kho ảnh từ chối ảnh chờ gửi thì việc đó bị từ chối kèm lý do, việc xếp sau vẫn đồng bộ", async ({ page, context }) => {
  const { db, taskId } = await taskInFreshRoom();
  await login(page, `/ops/buong-phong/${taskId}`);
  await controlled(page);
  await context.setOffline(true);
  const pass = page.getByRole("button", { name: "Đạt", exact: true });
  await page.getByLabel(/^Ảnh: Kiểm tra đồ khách để quên/).setInputFiles({ name: "do-quen.jpg", mimeType: "image/jpeg", buffer: Buffer.from(JPEG_1PX_BASE64, "base64") });
  await pass.nth(2).click(); // G2-1 with the photo, queued first
  await pass.first().click(); // G1-1, queued after it
  await expect(page.getByText(/Chờ đồng bộ \(2\)/)).toBeVisible();
  await page.evaluate(async () => { // a draft saved with no MIME type (before the pick-time check): the bucket answers 400 "mime type application/octet-stream is not supported"
    const name = (await indexedDB.databases()).find((d) => d.name?.startsWith("zsopo-ops"))!.name!;
    const idb: IDBDatabase = await new Promise((ok) => { const q = indexedDB.open(name); q.onsuccess = () => ok(q.result); });
    await new Promise((ok) => {
      const t = idb.transaction("mediaDrafts", "readwrite");
      t.objectStore("mediaDrafts").openCursor().onsuccess = (e) => {
        const c = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (c) { c.update({ ...c.value, blob: new Blob([c.value.blob]) }); c.continue(); }
      };
      t.oncomplete = () => ok(null);
    });
    idb.close();
  });
  await context.setOffline(false);
  await page.getByRole("button", { name: "Đồng bộ ngay" }).click();
  await expect(page.getByText(/Máy chủ từ chối \(Kho ảnh không nhận ảnh chờ gửi/)).toBeVisible();
  await expect(page.getByText("Đã đồng bộ", { exact: true })).toBeVisible();
  expect((await db.query(`select item_code from stay.checklist_results where task_id = $1`, [taskId])).rows).toEqual([{ item_code: "G1-1" }]);
  await db.end();
});
