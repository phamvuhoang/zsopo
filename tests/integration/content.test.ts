import { afterAll, describe, expect, it } from "vitest";
import { E1, USERS, anonClient, clientFor, db, sql } from "./helpers";

afterAll(() => db.end());
const uniq = () => Math.random().toString(36).slice(2, 8);

async function draft(title: string, body = "Nội dung bài viết về thiền buổi sáng ở Đà Lạt.") {
  const ed = await clientFor(USERS.editor);
  const { data, error } = await ed.schema("content").rpc("save_post", { p: { entityId: E1, slug: `bai-${uniq()}`, title, excerpt: "Tóm tắt", bodyMd: body, authorName: "Ban biên tập" } });
  if (error) throw new Error(error.message);
  return { ed, id: data as string };
}
const version = async (id: string) => (await sql<{ version: number }>(`select version from content.posts where id = $1`, [id]))[0]!.version;

describe("CMS workflow, revision, lịch đăng", () => {
  it("bài hẹn giờ chưa tới không công khai và không vào tìm kiếm; tới giờ thì publish", async () => {
    const word = `tramhuong${uniq()}`;
    const { ed, id } = await draft(`Trầm hương ${word}`);
    const r = await ed.schema("content").rpc("publish_content", { p_post: id, p_expected_version: await version(id), p_scheduled_at: new Date(Date.now() + 3600_000).toISOString() });
    expect(r.error).toBeNull();
    expect((await anonClient().schema("content").from("posts").select("id").eq("id", id)).data).toEqual([]);
    expect(((await anonClient().schema("content").rpc("search_public", { p_query: word })).data as unknown[]).length).toBe(0);
    await sql(`update content.posts set scheduled_at = now() - interval '1 minute' where id = $1`, [id]);
    await sql(`select content.publish_due()`);
    expect((await anonClient().schema("content").from("posts").select("id").eq("id", id)).data).toHaveLength(1);
  });

  it("khôi phục v1 sau v3 tạo phiên bản mới v4, không sửa lịch sử", async () => {
    const { ed, id } = await draft("Bản một");
    for (const t of ["Bản hai", "Bản ba"]) await ed.schema("content").rpc("save_post", { p: { id, entityId: E1, title: t, bodyMd: t, expectedVersion: await version(id) } });
    const [v1] = await sql<{ id: string }>(`select id from content.post_revisions where post_id = $1 and version = 1`, [id]);
    expect((await ed.schema("content").rpc("restore_revision", { p_post: id, p_revision: v1!.id })).error).toBeNull();
    const [p] = await sql<{ title: string; version: number }>(`select title, version from content.posts where id = $1`, [id]);
    expect(p).toEqual({ title: "Bản một", version: 4 });
    expect((await sql(`select 1 from content.post_revisions where post_id = $1`, [id])).length).toBe(4);
    await expect(sql(`update content.post_revisions set snapshot = '{}' where post_id = $1`, [id])).rejects.toThrow(/append-only/);
  });

  it("tìm tiếng Việt có dấu và không dấu đều ra bài", async () => {
    const tag = uniq();
    const { ed, id } = await draft(`Thiền trà sáng sớm ${tag}`, "Hướng dẫn thở và uống trà thảo mộc bên đồi thông.");
    await ed.schema("content").rpc("publish_content", { p_post: id, p_expected_version: await version(id), p_scheduled_at: null });
    for (const q of [`thiền trà ${tag}`, `thien tra ${tag}`, `THIEN TRA ${tag}`]) {
      const { data } = await anonClient().schema("content").rpc("search_public", { p_query: q });
      expect((data as { url: string }[]).some((r) => r.url.includes("/blog/")), q).toBe(true);
    }
  });

  it("đổi slug bài đã đăng tạo redirect 301", async () => {
    const { ed, id } = await draft("Bài đổi slug");
    await ed.schema("content").rpc("publish_content", { p_post: id, p_expected_version: await version(id), p_scheduled_at: null });
    const [old] = await sql<{ slug: string }>(`select slug from content.posts where id = $1`, [id]);
    await ed.schema("content").rpc("save_post", { p: { id, entityId: E1, slug: `${old!.slug}-moi`, title: "Bài đổi slug", bodyMd: "x", expectedVersion: await version(id) } });
    expect(await sql(`select 1 from content.redirects where from_path = $1 and to_path = $2`, [`/blog/${old!.slug}`, `/blog/${old!.slug}-moi`])).toHaveLength(1);
  });

  it("biên tập viên không xem đơn hàng/khách hàng", async () => {
    const ed = await clientFor(USERS.editor);
    expect((await ed.schema("commerce").from("orders").select("id").limit(1)).data).toEqual([]);
    expect((await ed.schema("core").from("customers").select("id").limit(1)).data).toEqual([]);
  });
});

describe("liên hệ và bản tin", () => {
  it("bản tin cần đồng ý; hủy đăng ký bằng token", async () => {
    const email = `nl-${uniq()}@example.test`;
    expect((await anonClient().schema("content").rpc("subscribe_newsletter", { p_email: email, p_consent: false })).error?.message).toBe("VALIDATION");
    const { data: token } = await anonClient().schema("content").rpc("subscribe_newsletter", { p_email: email, p_consent: true });
    expect((await anonClient().schema("content").rpc("unsubscribe_newsletter", { p_token: token })).error).toBeNull();
    const [s] = await sql<{ status: string }>(`select status from content.newsletter_subscriptions where email = $1`, [email]);
    expect(s!.status).toBe("unsubscribed");
  });

  it("form liên hệ lưu lead và báo vận hành", async () => {
    const { data: id, error } = await anonClient().schema("content").rpc("submit_contact", { p_name: "Khách", p_email: "lien-he-test@example.test", p_phone: "0900000011", p_message: "Cho tôi hỏi gói đoàn", p_consent: true });
    expect(error).toBeNull();
    expect(await sql(`select 1 from core.outbox where kind = 'contact.received' and aggregate_id = $1`, [id])).toHaveLength(1);
  });
});
