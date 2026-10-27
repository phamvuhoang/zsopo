import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { E1, L1, USERS, clientFor, db, seedRoom, sql } from "./helpers";

afterAll(() => db.end());

describe("job bảo trì và trang trạng thái", () => {
  it("các job định kỳ chạy lặp lại an toàn (idempotent)", async () => {
    for (const fn of ["stay.expire_all_holds()", "content.publish_due()", "shop.expire_unpaid_orders()", "stay.escalate_overdue_tickets()"]) {
      await sql(`select ${fn}`);
      const [r] = await sql<{ n: number }>(`select ${fn} as n`);
      expect(r!.n, fn).toBe(0);
    }
  });

  it("tóm tắt sức khỏe phản ánh outbox chết, feed lỗi, sự cố mở; không lộ secret", async () => {
    await sql(`insert into core.outbox(entity_id, dedupe_key, kind, status, attempts, last_error) values ($1, $2, 'booking.confirmed', 'dead', 5, 'smtp down')`, [E1, `dead:${randomUUID()}`]);
    const room = (await seedRoom()).id;
    await sql(`insert into stay.calendar_feeds(entity_id, location_id, room_id, provider, import_url, consecutive_failures, last_error) values ($1, $2, $3, 'airbnb', 'https://www.airbnb.com/calendar/ical/secret-token.ics', 3, 'timeout')`, [E1, L1, room]);
    const mgr = await clientFor(USERS.manager);
    const { data: incident } = await mgr.schema("ops_config").rpc("open_incident", { p_location: L1, p_title: "Mất mạng tầng 2", p_severity: "high" });
    expect(incident).toBeTruthy();
    const fin = await clientFor(USERS.finance);
    const { data, error } = await fin.schema("ops_config").rpc("health_summary", { p_entity: E1 });
    expect(error).toBeNull();
    const h = data as { outboxDead: number; feedsFailing: number; incidentsOpen: number };
    expect(h.outboxDead).toBeGreaterThan(0);
    expect(h.feedsFailing).toBeGreaterThan(0);
    expect(h.incidentsOpen).toBeGreaterThan(0);
    expect(JSON.stringify(data)).not.toContain("secret-token");
  });

  it("người ngoài pháp nhân không xem được trạng thái", async () => {
    const other = await clientFor(USERS.frontDeskB);
    expect((await other.schema("ops_config").rpc("health_summary", { p_entity: E1 })).error?.message).toBe("FORBIDDEN");
  });
});
