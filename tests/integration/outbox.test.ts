import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { E1, db, sql } from "./helpers";

afterAll(() => db.end());

// Worker contract (service role in the notify Edge Function): core.claim_outbox -> send -> core.complete_outbox.
const claim = (limit = 50, worker = "test") =>
  sql<{ id: string; kind: string; attempts: number }>(`select id, kind, attempts from core.claim_outbox($1, interval '2 minutes', $2)`, [limit, worker]);
const enqueue = async (kind = "test.ping", runAt = "now()") => {
  const key = `${kind}:${randomUUID()}`;
  const [r] = await sql<{ id: string }>(`select core.enqueue($1, $2, $3, null, '{}'::jsonb, ${runAt}) as id`, [E1, kind, key]);
  return { id: r!.id, key };
};

describe("outbox worker", () => {
  it("cùng dedupe key chỉ có một job", async () => {
    const { key } = await enqueue();
    await sql(`select core.enqueue($1, 'test.ping', $2, null, '{}'::jsonb)`, [E1, key]);
    expect(await sql(`select 1 from core.outbox where dedupe_key = $1`, [key])).toHaveLength(1);
  });

  it("hai worker claim song song không lấy trùng job", async () => {
    const ids = await Promise.all(Array.from({ length: 5 }, () => enqueue("test.parallel")));
    const [a, b] = await Promise.all([claim(50, "w1"), claim(50, "w2")]);
    const mine = new Set(ids.map((i) => i.id));
    const claimedA = a.filter((r) => mine.has(r.id)).map((r) => r.id);
    const claimedB = b.filter((r) => mine.has(r.id)).map((r) => r.id);
    expect(claimedA.filter((id) => claimedB.includes(id))).toEqual([]);
    expect(claimedA.length + claimedB.length).toBe(5);
  });

  it("lỗi tạm thời: retry theo lịch 1/5/15/60 phút rồi dead-letter sau 5 lần", async () => {
    const { id } = await enqueue("test.retry");
    const delays: number[] = [];
    for (let i = 0; i < 5; i++) {
      await sql(`update core.outbox set next_run_at = now() - interval '1 second', locked_until = null where id = $1`, [id]);
      const got = (await claim()).find((r) => r.id === id);
      expect(got).toBeTruthy();
      await sql(`select core.complete_outbox($1, 'failed', null, 'smtp timeout')`, [id]);
      const [row] = await sql<{ status: string; delay: number }>(`select status, extract(epoch from next_run_at - now())::int as delay from core.outbox where id = $1`, [id]);
      if (row!.status === "dead") break;
      delays.push(Math.round(row!.delay / 60));
    }
    expect(delays).toEqual([1, 5, 15, 60]);
    const [row] = await sql<{ status: string; attempts: number }>(`select status, attempts from core.outbox where id = $1`, [id]);
    expect(row).toEqual({ status: "dead", attempts: 5 });
  });

  it("lease hết hạn thì job được claim lại", async () => {
    const { id } = await enqueue("test.lease");
    expect((await claim()).some((r) => r.id === id)).toBe(true);
    expect((await claim()).some((r) => r.id === id)).toBe(false);
    await sql(`update core.outbox set locked_until = now() - interval '1 second' where id = $1`, [id]);
    expect((await claim()).some((r) => r.id === id)).toBe(true);
  });

  it("job tương lai chưa tới hạn không bị claim", async () => {
    const { id } = await enqueue("test.future", "now() + interval '1 hour'");
    expect((await claim()).some((r) => r.id === id)).toBe(false);
  });

  it("render job handbook của booking đã hủy trả skip, job được hủy", async () => {
    const [b] = await sql<{ id: string }>(
      `with o as (insert into commerce.orders(entity_id, location_id, kind, contact_snapshot) values ($1, 'c0000000-0000-4000-8000-000000000001', 'stay', '{"name":"Khách","email":"k@example.test"}') returning id)
       insert into stay.bookings(entity_id, location_id, order_id, room_id, arrival, departure, state, adults)
       select $1, 'c0000000-0000-4000-8000-000000000001', o.id, 'b0000000-0000-4000-8000-000000000001', '2030-01-01', '2030-01-02', 'cancelled', 2 from o returning id`,
      [E1],
    );
    const [job] = await sql<{ id: string }>(`select core.enqueue($1, 'handbook.due', $2, $3, '{}'::jsonb) as id`, [E1, `handbook.due:${b!.id}`, b!.id]);
    const [r] = await sql<{ msg: { skip?: string } }>(`select core.render_outbox($1) as msg`, [job!.id]);
    expect(r!.msg.skip).toBeTruthy();
  });

  it("đặt phòng sát giờ đến: handbook đến hạn ngay", async () => {
    const [b] = await sql<{ id: string }>(
      `with o as (insert into commerce.orders(entity_id, location_id, kind) values ($1, 'c0000000-0000-4000-8000-000000000001', 'stay') returning id)
       insert into stay.bookings(entity_id, location_id, order_id, room_id, arrival, departure, state, adults, policy_snapshot)
       select $1, 'c0000000-0000-4000-8000-000000000001', o.id, 'b0000000-0000-4000-8000-000000000001', (now() at time zone 'Asia/Ho_Chi_Minh')::date, (now() at time zone 'Asia/Ho_Chi_Minh')::date + 1, 'confirmed', 2, '{"params":{"handbook_hours_before":24}}' from o returning id`,
      [E1],
    );
    await sql(`select stay.schedule_journey($1)`, [b!.id]);
    const [job] = await sql<{ due: boolean }>(`select next_run_at <= now() + interval '1 second' as due from core.outbox where aggregate_id = $1 and kind = 'handbook.due'`, [b!.id]);
    expect(job!.due).toBe(true);
  });
});
