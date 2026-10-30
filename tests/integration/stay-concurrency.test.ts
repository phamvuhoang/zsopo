import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createStayHold, quoteStay } from "../../packages/api/src/stay";
import { quoteStay as quoteTs, type RatePlan } from "../../packages/core/src/pricing/quote";
import { E1, L1, anonClient, db, seedRoom, sql } from "./helpers";

afterAll(() => db.end());

const guest = { name: "Khách Thử", phone: "0900000001", email: "khach@example.test" };
const consents = { terms: true, marketing: false };
let day = 0;
/** Unique future dates per test so tests never collide on shared rooms. */
function dates(nights = 2, offset?: number) {
  const start = new Date(Date.UTC(2027, 2, 1) + (offset ?? (day += 5)) * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { arrival: iso(start), departure: iso(new Date(start.getTime() + nights * 86_400_000)) };
}

async function hold(roomId: string, d: { arrival: string; departure: string }, key = randomUUID()) {
  const client = anonClient();
  const q = await quoteStay(client, { roomId, ...d, adults: 2, childrenAges: [], services: [] });
  if (!q.ok) return q;
  return createStayHold(client, { quoteId: q.data.id, guest, policyVersion: q.data.policyVersion, idempotencyKey: key, consents });
}

async function withRates(roomId: string) {
  await sql(
    `insert into stay.rate_plans(entity_id, location_id, room_id, kind, price, extra_adult_fee, extra_child_fee) values ($1, $2, $3, 'base', 1250000, 250000, 150000)`,
    [E1, L1, roomId],
  );
  await sql(`insert into stay.rate_plans(entity_id, location_id, room_id, kind, dow, price) values ($1, $2, $3, 'weekday', 5, 1450000)`, [E1, L1, roomId]);
  return roomId;
}

describe("allocation chung chống trùng phòng", () => {
  it("hai khách tranh phòng cuối: chỉ một người giữ được", async () => {
    const room = await withRates((await seedRoom()).id);
    const d = dates();
    const results = await Promise.all([hold(room, d), hold(room, d)]);
    expect(results.filter((x) => x.ok)).toHaveLength(1);
    expect(results.filter((x) => !x.ok).map((x) => !x.ok && x.error.code)).toEqual(["SOLD_OUT"]);
  });

  it("lịch OTA hoặc bảo trì trùng ngày chặn đặt phòng", async () => {
    const room = await withRates((await seedRoom()).id);
    const d = dates();
    await sql(`select stay.block_room($1, $2::date, $3::date, 'maintenance', 'Sửa ống nước', null)`, [room, d.arrival, d.departure]);
    const r = await hold(room, d);
    expect(!r.ok && r.error.code).toBe("SOLD_OUT");

    const room2 = await withRates((await seedRoom()).id);
    await sql(`select stay.block_room($1, $2::date, $3::date, 'ota', 'Booking.com', null)`, [room2, d.arrival, d.departure]);
    expect(((await hold(room2, d)) as { ok: boolean }).ok).toBe(false);
  });

  it("hai kỳ ở liền kề (trả 12:00, nhận 14:00) đều được", async () => {
    const room = await withRates((await seedRoom()).id);
    const first = dates(2);
    const second = { arrival: first.departure, departure: dates(2, day + 2).departure };
    expect((await hold(room, first)).ok).toBe(true);
    expect((await hold(room, second)).ok).toBe(true);
  });

  it("phòng không mở bán không nhận giữ chỗ và không có allocation", async () => {
    const room = await withRates((await seedRoom({ sellable: false })).id);
    const r = await hold(room, dates());
    expect(!r.ok && r.error.code).toBe("SOLD_OUT");
    expect(await sql(`select 1 from stay.room_allocations where room_id = $1 and active`, [room])).toHaveLength(0);
  });

  it("giữ chỗ hết hạn được giải phóng ngay khi có yêu cầu mới", async () => {
    const room = await withRates((await seedRoom()).id);
    const d = dates();
    const first = await hold(room, d);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    await sql(`update stay.bookings set held_until = now() - interval '1 minute' where id = $1`, [first.data.bookingId]);
    expect((await hold(room, d)).ok).toBe(true);
    const [b] = await sql<{ state: string }>(`select state from stay.bookings where id = $1`, [first.data.bookingId]);
    expect(b!.state).toBe("expired");
  });

  it("cùng idempotency key trả cùng kết quả, không tạo đơn thứ hai", async () => {
    const room = await withRates((await seedRoom()).id);
    const d = dates();
    const client = anonClient();
    const q = await quoteStay(client, { roomId: room, ...d, adults: 2, childrenAges: [], services: [] });
    if (!q.ok) throw new Error(q.error.message);
    const key = randomUUID();
    const input = { quoteId: q.data.id, guest, policyVersion: q.data.policyVersion, idempotencyKey: key, consents };
    const [a, b] = [await createStayHold(client, input), await createStayHold(client, input)];
    expect(a.ok && b.ok && a.data.bookingId === b.data.bookingId).toBe(true);
    expect(await sql(`select 1 from stay.bookings where room_id = $1`, [room])).toHaveLength(1);
  });

  it("báo giá hết hạn hoặc giá đổi thì không giữ chỗ", async () => {
    const room = await withRates((await seedRoom()).id);
    const client = anonClient();
    const q = await quoteStay(client, { roomId: room, ...dates(), adults: 2, childrenAges: [], services: [] });
    if (!q.ok) throw new Error(q.error.message);
    await sql(`update stay.quotes set expires_at = now() - interval '1 second' where id = $1`, [q.data.id]);
    const expired = await createStayHold(client, { quoteId: q.data.id, guest, policyVersion: q.data.policyVersion, idempotencyKey: randomUUID(), consents });
    expect(!expired.ok && expired.error.code).toBe("QUOTE_EXPIRED");

    const q2 = await quoteStay(client, { roomId: room, ...dates(), adults: 2, childrenAges: [], services: [] });
    if (!q2.ok) throw new Error(q2.error.message);
    await sql(`update stay.rate_plans set price = price + 100000 where room_id = $1 and kind = 'base'`, [room]);
    const changed = await createStayHold(client, { quoteId: q2.data.id, guest, policyVersion: q2.data.policyVersion, idempotencyKey: randomUUID(), consents });
    expect(!changed.ok && changed.error.code).toBe("PRICE_CHANGED");
  });

  it("thiếu chấp thuận điều khoản thì không giữ chỗ", async () => {
    const room = await withRates((await seedRoom()).id);
    const client = anonClient();
    const q = await quoteStay(client, { roomId: room, ...dates(), adults: 2, childrenAges: [], services: [] });
    if (!q.ok) throw new Error(q.error.message);
    const r = await createStayHold(client, { quoteId: q.data.id, guest, policyVersion: q.data.policyVersion, idempotencyKey: randomUUID(), consents: { terms: false, marketing: false } });
    expect(!r.ok && r.error.code).toBe("VALIDATION");
  });
});

describe("parity giá TS và SQL", () => {
  it("quote_stay khớp quoteStay thuần trên cùng bảng giá", async () => {
    const room = await withRates((await seedRoom({ maxGuests: 5 })).id);
    const d = { arrival: "2027-06-03", departure: "2027-06-07" }; // Thu..Mon, includes a Friday
    const q = await quoteStay(anonClient(), { roomId: room, ...d, adults: 3, childrenAges: [3, 9], services: [] });
    if (!q.ok) throw new Error(q.error.message);
    const rates: RatePlan[] = [
      { kind: "base", price: 1250000n, extraAdultFee: 250000n, extraChildFee: 150000n },
      { kind: "weekday", dow: 5, price: 1450000n },
    ];
    const ts = quoteTs({ ...d, adults: 3, childrenAges: [3, 9], room: { capacityAdults: 2, maxGuests: 5 }, rates, policy: { depositRateBp: 3000, childFreeUnderAge: 6 }, services: [] });
    expect(ts.ok).toBe(true);
    if (!ts.ok) return;
    expect(q.data.total).toBe(ts.data.total.toString());
    expect(q.data.depositDue).toBe(ts.data.depositDue.toString());
  });
});
