import { afterAll, describe, expect, it } from "vitest";
import { USERS, clientFor, db, sql } from "./helpers";

afterAll(() => db.end());

describe("RLS qua JWT thật", () => {
  it("lễ tân điểm 2 không đọc được đơn của điểm Đà Lạt; lễ tân Đà Lạt đọc được", async () => {
    const [order] = await sql<{ id: string }>(
      `insert into commerce.orders(entity_id, location_id, kind) values ($1, $2, 'stay') returning id`,
      ["e0000000-0000-4000-8000-000000000001", "c0000000-0000-4000-8000-000000000001"],
    );
    const other = await clientFor(USERS.frontDesk2);
    const own = await clientFor(USERS.frontDesk);
    expect((await other.schema("commerce").from("orders").select("id").eq("id", order!.id)).data).toEqual([]);
    expect((await own.schema("commerce").from("orders").select("id").eq("id", order!.id)).data).toHaveLength(1);
  });

  it("thu hồi role có hiệu lực ngay với JWT cũ", async () => {
    const hk = await clientFor(USERS.housekeeping2);
    expect((await hk.schema("core").rpc("has_permission", { p_action: "housekeeping.work", p_entity: "e0000000-0000-4000-8000-000000000001", p_location: "c0000000-0000-4000-8000-000000000001" })).data).toBe(true);
    await sql(`update core.user_roles set disabled_at = now() where user_id = $1`, [USERS.housekeeping2.id]);
    try {
      expect((await hk.schema("core").rpc("has_permission", { p_action: "housekeeping.work", p_entity: "e0000000-0000-4000-8000-000000000001", p_location: "c0000000-0000-4000-8000-000000000001" })).data).toBe(false);
    } finally {
      await sql(`update core.user_roles set disabled_at = null where user_id = $1`, [USERS.housekeeping2.id]);
    }
  });
});
