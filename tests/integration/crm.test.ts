import { afterAll, describe, expect, it } from "vitest";
import { E1, E2, USERS, clientFor, db, sql } from "./helpers";

afterAll(() => db.end());
const uniq = () => Math.random().toString(36).slice(2, 8);

async function customer(name: string, phone: string, opts: { email?: string; marketing?: boolean; source?: string; entity?: string } = {}) {
  const [c] = await sql<{ id: string }>(`select core.upsert_guest_customer($1, $2::jsonb, $3, $4::jsonb) as id`, [
    opts.entity ?? E1, JSON.stringify({ name, phone, email: opts.email }), opts.source ?? "web", JSON.stringify({ terms: true, marketing: opts.marketing ?? false }),
  ]);
  return c!.id;
}

describe("CRM", () => {
  it("cùng SĐT chỉ là gợi ý gộp; gộp cần xác minh, giữ đơn và lịch sử", async () => {
    const phone = `09${Math.floor(Math.random() * 1e8).toString().padStart(8, "0")}`;
    const a = await customer("Khách A", phone);
    const b = await customer("Khách A2", phone);
    const [o] = await sql<{ id: string }>(`insert into commerce.orders(entity_id, customer_id, kind) values ($1, $2, 'shop') returning id`, [E1, b]);
    const fin = await clientFor(USERS.finance);
    const { data: dup } = await fin.schema("crm").rpc("duplicate_suggestions", { p_entity: E1 });
    expect((dup as { customer_ids: string[] }[]).some((d) => d.customer_ids.includes(a) && d.customer_ids.includes(b))).toBe(true);
    expect((await sql<{ user_id: string | null }>(`select user_id from core.customers where id = any($1)`, [[a, b]])).every((c) => c.user_id === null)).toBe(true);
    expect((await fin.schema("crm").rpc("merge_customers", { p_survivor: a, p_merged: b, p_reason: "", p_verified: false })).error?.message).toBe("VALIDATION");
    expect((await fin.schema("crm").rpc("merge_customers", { p_survivor: a, p_merged: b, p_reason: "Khách xác nhận qua điện thoại", p_verified: true })).error).toBeNull();
    expect((await sql<{ customer_id: string }>(`select customer_id from commerce.orders where id = $1`, [o!.id]))[0]!.customer_id).toBe(a);
    expect((await sql<{ merged_into: string }>(`select merged_into from core.customers where id = $1`, [b]))[0]!.merged_into).toBe(a);
    expect(await sql(`select 1 from crm.customer_merge_events where survivor_id = $1 and merged_id = $2`, [a, b])).toHaveLength(1);
  });

  it("segment động theo nguồn + đồng ý marketing; nhân sự sai pháp nhân không xuất được", async () => {
    const src = `zalo-${uniq()}`;
    await customer("Seg 1", "0911111111", { email: `s1-${uniq()}@example.test`, marketing: true, source: src });
    await customer("Seg 2", "0911111112", { email: `s2-${uniq()}@example.test`, marketing: false, source: src });
    const fin = await clientFor(USERS.finance);
    const { data: count } = await fin.schema("crm").rpc("segment_count", { p_entity: E1, p_filter: { source: src, marketingConsent: true } });
    expect(count).toBe(1);
    expect((await fin.schema("crm").rpc("segment_count", { p_entity: E1, p_filter: { evil: "1; drop" } })).error?.message).toBe("VALIDATION");
    const other = await clientFor(USERS.frontDeskB);
    expect((await other.schema("crm").rpc("segment_count", { p_entity: E1, p_filter: {} })).error?.message).toBe("FORBIDDEN");
    expect((await fin.schema("crm").rpc("export_segment", { p_entity: E2, p_filter: {} })).error?.message).toBe("FORBIDDEN");
  });

  it("chiến dịch: khách hủy đồng ý sau snapshot, trước khi gửi thì không nhận", async () => {
    const src = `camp-${uniq()}`;
    const keep = await customer("Nhận", "0922222221", { email: `keep-${uniq()}@example.test`, marketing: true, source: src });
    const drop = await customer("Hủy", "0922222222", { email: `drop-${uniq()}@example.test`, marketing: true, source: src });
    const [seg] = await sql<{ id: string }>(`insert into crm.segments(entity_id, name, filter_json) values ($1, 'test', $2) returning id`, [E1, JSON.stringify({ source: src, marketingConsent: true })]);
    const [camp] = await sql<{ id: string }>(`insert into crm.campaigns(entity_id, name, subject, body, segment_id) values ($1, 'Thư thử', 'Chào', 'Nội dung', $2) returning id`, [E1, seg!.id]);
    const fin = await clientFor(USERS.finance);
    expect((await fin.schema("crm").rpc("snapshot_campaign", { p_campaign: camp!.id })).data).toBe(2);
    await sql(`update core.consent_records set revoked_at = now() where customer_id = $1 and purpose = 'marketing'`, [drop]);
    // campaign.send needs MFA (aal2): run as the DB with the finance user's claims elevated.
    await sql(`select set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated', 'aal', 'aal2')::text, true), crm.send_campaign($2)`, [USERS.finance.id, camp!.id]);
    const rows = await sql<{ customer_id: string; status: string }>(`select customer_id, status from crm.campaign_recipients where campaign_id = $1 order by status`, [camp!.id]);
    expect(rows.find((r) => r.customer_id === keep)!.status).toBe("queued");
    expect(rows.find((r) => r.customer_id === drop)!.status).toBe("skipped_optout");
    expect(await sql(`select 1 from core.outbox where kind = 'campaign.email' and dedupe_key like $1`, [`campaign:${camp!.id}:%`])).toHaveLength(1);
  });

  it("dòng thời gian khách gồm lưu trú/shop/dịch vụ, không có dữ liệu giả", async () => {
    const c = await customer("Timeline", "0933333333");
    await sql(`insert into commerce.orders(entity_id, customer_id, kind, total) values ($1, $2, 'shop', 100000)`, [E1, c]);
    const fin = await clientFor(USERS.finance);
    const { data } = await fin.schema("crm").rpc("customer_timeline", { p_customer: c });
    expect((data as { kind: string }[]).map((e) => e.kind)).toEqual(["order"]);
  });
});
