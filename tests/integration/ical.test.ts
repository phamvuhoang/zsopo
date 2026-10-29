import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { parseIcs } from "../../supabase/functions/_shared/ical";
import { createStayHold, quoteStay } from "../../packages/api/src/stay";
import { API_URL, E1, L1, anonClient, db, seedRoom, sql, SERVICE_KEY } from "./helpers";

afterAll(() => db.end());
const fx = (name: string) => readFileSync(`tests/fixtures/ical/${name}.ics`, "utf8");
const opts = { now: new Date("2028-01-01T00:00:00Z"), horizonDays: 365, tz: "Asia/Ho_Chi_Minh" };

describe("parser iCal", () => {
  it("DATE với DTEND exclusive, bỏ UID do ZSOPO xuất, không giữ PII", () => {
    const { events } = parseIcs(fx("date"), opts);
    expect(events).toEqual([
      { uid: "airbnb-res-001@airbnb.com", start: "2028-03-10", end: "2028-03-13", cancelled: false },
      { uid: "airbnb-res-002@airbnb.com", start: "2028-03-20", end: "2028-03-21", cancelled: false },
    ]);
  });

  it("DATE-TIME có múi giờ quy về ngày địa phương Đà Lạt", () => {
    const { events } = parseIcs(fx("tz"), opts);
    expect(events.map((e) => [e.start, e.end])).toEqual([["2028-05-11", "2028-05-13"], ["2028-06-01", "2028-06-02"]]);
  });

  it("UID lặp: SEQUENCE mới nhất thắng; RRULE mở rộng có giới hạn horizon", () => {
    const { events } = parseIcs(fx("duplicate"), opts);
    expect(events.filter((e) => e.uid === "agoda-1@agoda.com")).toEqual([{ uid: "agoda-1@agoda.com", start: "2028-07-02", end: "2028-07-05", cancelled: false }]);
    const weekly = events.filter((e) => e.uid.startsWith("agoda-weekly@agoda.com"));
    expect(weekly.length).toBeGreaterThan(20);
    expect(weekly.length).toBeLessThan(30);
    expect(weekly.every((e) => e.start < "2029-01-01")).toBe(true);
  });

  it("STATUS:CANCELLED đánh dấu hủy; file hỏng thì báo lỗi", () => {
    expect(parseIcs(fx("cancelled"), opts).events[0]!.cancelled).toBe(true);
    expect(() => parseIcs(fx("malformed"), opts)).toThrow();
  });
});

async function feedFor(room: string) {
  const [f] = await sql<{ id: string }>(
    `insert into stay.calendar_feeds(entity_id, location_id, room_id, provider, import_url, horizon_days) values ($1, $2, $3, 'booking', 'https://admin.booking.com/ical/x.ics', 730) returning id`,
    [E1, L1, room],
  );
  return f!.id;
}
const reconcile = (feed: string, events: unknown[] | null, error?: string) =>
  sql(`select stay.reconcile_feed($1, $2::jsonb, $3)`, [feed, events ? JSON.stringify(events) : null, error ?? null]);
const otaNights = async (room: string) =>
  (await sql<{ n: number }>(`select count(*)::int n from stay.room_allocations where room_id = $1 and kind = 'ota' and active`, [room]))[0]!.n;

describe("đồng bộ lịch OTA", () => {
  it("lỗi tải giữ lịch cũ, lỗi 2 lần liên tiếp tạo cảnh báo", async () => {
    const room = (await seedRoom()).id;
    const feed = await feedFor(room);
    await reconcile(feed, [{ uid: "a@x", start: "2028-02-01", end: "2028-02-03", cancelled: false }]);
    expect(await otaNights(room)).toBe(1);
    await reconcile(feed, null, "timeout");
    await reconcile(feed, null, "timeout");
    expect(await otaNights(room)).toBe(1);
    const [f] = await sql<{ consecutive_failures: number }>(`select consecutive_failures from stay.calendar_feeds where id = $1`, [feed]);
    expect(f!.consecutive_failures).toBe(2);
    expect(await sql(`select 1 from core.outbox where kind = 'calendar.sync_failed' and aggregate_id = $1`, [feed])).toHaveLength(1);
  });

  it("sự kiện biến mất khỏi lần tải đầy đủ thì mở lại lịch, sự kiện hủy cũng vậy", async () => {
    const room = (await seedRoom()).id;
    const feed = await feedFor(room);
    await reconcile(feed, [
      { uid: "a@x", start: "2028-02-01", end: "2028-02-03", cancelled: false },
      { uid: "b@x", start: "2028-02-10", end: "2028-02-11", cancelled: false },
    ]);
    expect(await otaNights(room)).toBe(2);
    await reconcile(feed, [{ uid: "b@x", start: "2028-02-10", end: "2028-02-11", cancelled: true }]);
    expect(await otaNights(room)).toBe(0);
    const removed = await sql(`select 1 from stay.calendar_blocks where feed_id = $1 and status = 'removed'`, [feed]);
    expect(removed).toHaveLength(2);
  });

  it("OTA trùng đặt phòng trực tiếp: giữ booking, ghi conflict có bằng chứng, cảnh báo", async () => {
    const room = (await seedRoom()).id;
    await sql(`insert into stay.rate_plans(entity_id, location_id, room_id, kind, price) values ($1, $2, $3, 'base', 800000)`, [E1, L1, room]);
    const client = anonClient();
    const q = await quoteStay(client, { roomId: room, arrival: "2028-02-20", departure: "2028-02-22", adults: 2, childrenAges: [], services: [] });
    if (!q.ok) throw new Error(q.error.message);
    const h = await createStayHold(client, { quoteId: q.data.id, guest: { name: "Khách Web", phone: "0900000005" }, policyVersion: q.data.policyVersion, idempotencyKey: randomUUID(), consents: { terms: true, marketing: false } });
    expect(h.ok).toBe(true);
    const feed = await feedFor(room);
    await reconcile(feed, [{ uid: "c@x", start: "2028-02-21", end: "2028-02-24", cancelled: false }]);
    const [c] = await sql<{ status: string; booking_id: string }>(`select status, booking_id from stay.calendar_conflicts where feed_id = $1`, [feed]);
    expect(c).toEqual({ status: "open", booking_id: h.ok && h.data.bookingId });
    // Nights not covered by the direct booking (22, 23) are still closed for sale.
    expect(await otaNights(room)).toBe(1);
    expect(await sql(`select 1 from stay.room_allocations where source_id = $1 and active`, [h.ok && h.data.bookingId])).toHaveLength(1);
    expect(await sql(`select 1 from core.outbox where kind = 'calendar.conflict' and aggregate_id = $1`, [feed])).toHaveLength(1);
  });

  it("đồng bộ iCal và giữ phòng chạy song song không gây trùng", async () => {
    const room = (await seedRoom()).id;
    await sql(`insert into stay.rate_plans(entity_id, location_id, room_id, kind, price) values ($1, $2, $3, 'base', 800000)`, [E1, L1, room]);
    const feed = await feedFor(room);
    const client = anonClient();
    const q = await quoteStay(client, { roomId: room, arrival: "2028-03-05", departure: "2028-03-07", adults: 2, childrenAges: [], services: [] });
    if (!q.ok) throw new Error(q.error.message);
    const [hold] = await Promise.all([
      createStayHold(client, { quoteId: q.data.id, guest: { name: "Khách", phone: "0900000006" }, policyVersion: q.data.policyVersion, idempotencyKey: randomUUID(), consents: { terms: true, marketing: false } }),
      reconcile(feed, [{ uid: "d@x", start: "2028-03-05", end: "2028-03-07", cancelled: false }]),
    ]);
    const conflicts = await sql(`select 1 from stay.calendar_conflicts where feed_id = $1`, [feed]);
    // Either the hold won (and the OTA block became a conflict) or the OTA block won (and the hold was refused).
    expect(hold.ok ? conflicts.length === 1 : !hold.ok && hold.error.code === "SOLD_OUT").toBe(true);
    const [overlap] = await sql<{ n: number }>(
      `select count(*)::int n from stay.room_allocations a join stay.room_allocations b on a.room_id = b.room_id and a.id < b.id and a.active and b.active and a.occupied_range && b.occupied_range where a.room_id = $1`, [room]);
    expect(overlap!.n).toBe(0);
  });
});

describe("xuất iCal", () => {
  it("token đúng trả busy không có PII; token cũ sau khi xoay bị 401", async () => {
    const room = (await seedRoom()).id;
    const feed = await feedFor(room);
    await sql(`select stay.block_room($1, '2028-04-10', '2028-04-12', 'maintenance', 'Sơn', null)`, [room]);
    const [{ token }] = await sql<{ token: string }>(`select stay.rotate_export_token($1) as token`, [feed]);
    const res = await fetch(`${API_URL}/functions/v1/ical-export?token=${token}`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("DTSTART;VALUE=DATE:20280410");
    expect(body).toContain("DTEND;VALUE=DATE:20280412");
    expect(body).toMatch(/UID:zsopo-[0-9a-f-]+@zsopo/);
    expect(body).not.toMatch(/Sơn|0900/);
    await sql(`select stay.rotate_export_token($1)`, [feed]);
    expect((await fetch(`${API_URL}/functions/v1/ical-export?token=${token}`)).status).toBe(401);
  });
});

describe("chống SSRF khi tải feed", () => {
  it("host không nằm trong allowlist hoặc http bị chặn, ghi lỗi feed, không xóa lịch cũ", async () => {
    const room = (await seedRoom()).id;
    const [f] = await sql<{ id: string }>(
      `insert into stay.calendar_feeds(entity_id, location_id, room_id, provider, import_url) values ($1, $2, $3, 'other', 'https://localhost/evil.ics') returning id`, [E1, L1, room]);
    const key = SERVICE_KEY;
    const res = await fetch(`${API_URL}/functions/v1/ical-sync`, { method: "POST", headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" }, body: JSON.stringify({ feedId: f!.id, force: true }) });
    expect(res.status).toBe(200);
    const [row] = await sql<{ last_error: string; consecutive_failures: number }>(`select last_error, consecutive_failures from stay.calendar_feeds where id = $1`, [f!.id]);
    expect(row!.last_error).toMatch(/blocked/);
    expect(row!.consecutive_failures).toBe(1);
  });
});
