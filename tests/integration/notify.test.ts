import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { recordPayment } from "../../packages/api/src/payments";
import { createStayHold, quoteStay } from "../../packages/api/src/stay";
import { API_URL, E1, L1, USERS, anonClient, clientFor, db, eventually, seedRoom, sql } from "./helpers";

afterAll(() => db.end());
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:56424";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "REDACTED_LOCAL_SERVICE_KEY";

describe("notify worker gửi email xác nhận", () => {
  it("xác nhận cọc -> email trong Mailpit chứa mã đơn và link riêng, Zalo ghi trạng thái tắt", async () => {
    const room = (await seedRoom()).id;
    await sql(`insert into stay.rate_plans(entity_id, location_id, room_id, kind, price) values ($1, $2, $3, 'base', 900000)`, [E1, L1, room]);
    const email = `khach-${randomUUID().slice(0, 8)}@example.test`;
    const client = anonClient();
    const q = await quoteStay(client, { roomId: room, arrival: "2028-03-01", departure: "2028-03-02", adults: 2, childrenAges: [], services: [] });
    if (!q.ok) throw new Error(q.error.message);
    const h = await createStayHold(client, { quoteId: q.data.id, guest: { name: "Khách Email", phone: "0900000004", email }, policyVersion: q.data.policyVersion, idempotencyKey: randomUUID(), consents: { terms: true, marketing: false } });
    if (!h.ok) throw new Error(h.error.message);
    const p = await recordPayment(await clientFor(USERS.frontDesk), { orderId: h.data.orderId, provider: "bank_transfer", providerRef: randomUUID(), amount: "270000", receivedAt: new Date().toISOString(), evidenceNote: "Sao kê", idempotencyKey: randomUUID() });
    expect(p.ok && p.data.bookingState).toBe("confirmed");

    const started = Date.now();
    const res = await fetch(`${API_URL}/functions/v1/notify`, { method: "POST", headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } });
    expect(res.status).toBe(200);

    let text = "";
    await eventually(async () => {
      const list = await (await fetch(`${MAILPIT}/api/v1/search?query=to:${email}`)).json();
      expect(list.messages.length).toBe(1);
      expect(list.messages[0].Subject).toContain(h.data.orderCode);
      text = (await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json()).Text;
    });
    expect(Date.now() - started).toBeLessThan(60_000);
    expect(text).toMatch(/\/api\/guest\?t=[\w-]+&next=\/dat-phong\//);
    const logs = await sql<{ channel: string; status: string }>(
      `select l.channel, l.status from ops_config.delivery_logs l join core.outbox o on o.id = l.outbox_id where o.kind = 'booking.confirmed' and o.aggregate_id = $1 order by l.channel`, [h.data.bookingId]);
    expect(logs).toEqual([{ channel: "email", status: "sent" }, { channel: "zalo", status: "disabled" }]);
  });
});
