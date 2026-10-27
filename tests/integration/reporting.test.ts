import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { recordPayment } from "../../packages/api/src/payments";
import { E1, USERS, clientFor, db, seedRoom, sql } from "./helpers";

afterAll(() => db.end());
const today = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
const plus = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Booking in a fresh test location with one room_night item per night at 1.000.000 đ. */
let L2 = "";
async function stay(room: string, arrival: string, nights: number, state: string, source = "web") {
  const [o] = await sql<{ id: string }>(`insert into commerce.orders(entity_id, location_id, kind, status, total, deposit_due, source) values ($1, $2, 'stay', 'confirmed', $3, $4, $5) returning id`,
    [E1, L2, nights * 1000000, nights * 300000, source]);
  const [b] = await sql<{ id: string }>(`insert into stay.bookings(entity_id, location_id, order_id, room_id, arrival, departure, state, adults, source) values ($1, $2, $3, $4, $5, $6, $7, 2, $8) returning id`,
    [E1, L2, o!.id, room, arrival, plus(arrival, nights), state, source]);
  for (let i = 0; i < nights; i++) {
    await sql(`insert into commerce.order_items(entity_id, order_id, item_type, item_id, title, qty, unit_price, amount, revenue_source, service_date) values ($1, $2, 'room_night', $3, 'Đêm', 1, 1000000, 1000000, 'room', $4)`, [E1, o!.id, room, plus(arrival, i)]);
  }
  await sql(`insert into stay.room_allocations(entity_id, location_id, room_id, occupied_range, kind, source_id) values ($1, $2, $3, stay.stay_range($2, $4::date, $5::date), 'booking', $6)`, [E1, L2, room, arrival, plus(arrival, nights), b!.id]);
  return { orderId: o!.id, bookingId: b!.id };
}

describe("dashboard 5 nguồn", () => {
  it("doanh thu phòng theo đêm đã phục vụ, cọc không thành doanh thu, ADR không gồm dịch vụ, bảo trì trừ khỏi đêm bán", async () => {
    // A fresh location per run keeps the metrics exact regardless of earlier test data.
    const [loc] = await sql<{ id: string }>(`insert into core.locations(entity_id, slug, name, status) values ($1, 'bao-cao-' || substr(md5(random()::text),1,8), 'Điểm báo cáo thử', 'test') returning id`, [E1]);
    L2 = loc!.id;
    const r1 = (await seedRoom({ location: L2 })).id;
    const r2 = (await seedRoom({ location: L2 })).id;
    const from = plus(today(), -3);
    const to = plus(today(), 3); // 7 nights window
    const served = await stay(r1, plus(today(), -3), 3, "checked_out", "web"); // 3 nights served
    const future = await stay(r2, plus(today(), 1), 2, "confirmed", "zalo"); // future: deposit only
    await sql(`select stay.block_room($1, $2::date, $3::date, 'maintenance', 'Sơn', null)`, [r2, plus(today(), -3), plus(today(), -1)]); // 2 closed nights
    const fin = await clientFor(USERS.finance);
    await recordPayment(fin, { orderId: future.orderId, provider: "bank_transfer", providerRef: randomUUID(), amount: "600000", receivedAt: new Date().toISOString(), evidenceNote: "Sao kê", idempotencyKey: randomUUID() });
    await recordPayment(fin, { orderId: served.orderId, provider: "cash", providerRef: randomUUID(), amount: "3000000", receivedAt: new Date().toISOString(), idempotencyKey: randomUUID() });
    // A completed in-stay service (own_service) and a manual beverage sale (outside web).
    await sql(`insert into commerce.order_items(entity_id, order_id, item_type, title, qty, unit_price, amount, revenue_source, status, completed_at) values ($1, $2, 'service', 'Trà', 1, 60000, 60000, 'own_service', 'completed', now())`, [E1, served.orderId]);
    const mgr = await clientFor(USERS.finance);
    const sale = await mgr.schema("commerce").rpc("record_manual_sale", { p_location: L2, p_revenue_source: "beverage", p_title: "Cafe quầy", p_amount: 45000, p_provider: "cash", p_evidence_note: "Phiếu thu 001" });
    expect(sale.error).toBeNull();

    const { data, error } = await fin.schema("commerce").rpc("get_location_metrics", { p_entity: E1, p_location: L2, p_from: from, p_to: to });
    expect(error).toBeNull();
    const m = data as { recognizedRevenueBySource: Record<string, string>; cashCollected: string; depositsLiability: string; occupancy: { occupied: number; sellable: number; pct: number }; adr: string; bookingsByChannel: Record<string, number> };
    expect(m.recognizedRevenueBySource).toMatchObject({ room: "3000000", own_service: "60000", beverage: "45000", product: "0", cohost_service: "0" });
    expect(m.cashCollected).toBe(String(600000 + 3000000 + 45000));
    expect(m.depositsLiability).toBe("600000");
    expect(m.occupancy).toEqual({ occupied: 5, sellable: 14 - 2, pct: 41.7 });
    expect(m.adr).toBe("1000000");
    expect(m.bookingsByChannel).toMatchObject({ web: 1, zalo: 1 });
  });

  it("nhân sự điểm khác / pháp nhân khác không xem được báo cáo", async () => {
    const fd = await clientFor(USERS.frontDeskB);
    const { error } = await fd.schema("commerce").rpc("get_location_metrics", { p_entity: E1, p_location: "c0000000-0000-4000-8000-000000000001", p_from: today(), p_to: today() });
    expect(error?.message).toBe("FORBIDDEN");
  });
});
