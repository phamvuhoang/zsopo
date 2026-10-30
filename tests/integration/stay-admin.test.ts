import { afterAll, describe, expect, it } from "vitest";
import { USERS, clientFor, db, seedRoom, sql } from "./helpers";

afterAll(() => db.end());

describe("quản trị phòng, giá, khóa lịch theo quyền", () => {
  it("quản lý điểm lưu giá base mới: bản cũ bị vô hiệu, có audit", async () => {
    const room = await seedRoom();
    const mgr = await clientFor(USERS.manager);
    const save = (price: number) => mgr.schema("stay").rpc("save_rate", { p_room: room.id, p_kind: "base", p_price: price, p_extra_adult_fee: 250000, p_extra_child_fee: 0 });
    expect((await save(1000000)).error).toBeNull();
    expect((await save(1100000)).error).toBeNull();
    const rows = await sql<{ price: string; active: boolean }>(`select price, active from stay.rate_plans where room_id = $1 and kind = 'base' order by created_at`, [room.id]);
    expect(rows.map((r) => [r.price, r.active])).toEqual([["1000000", false], ["1100000", true]]);
    expect(await sql(`select 1 from core.audit_logs where action = 'rate.save' and subject_id = $1`, [room.id])).toHaveLength(2);
  });

  it("mùa trùng khoảng ngày bị từ chối", async () => {
    const room = await seedRoom();
    const mgr = await clientFor(USERS.manager);
    const season = (from: string, to: string) => mgr.schema("stay").rpc("save_rate", { p_room: room.id, p_kind: "season", p_from: from, p_to: to, p_price: 1500000 });
    expect((await season("2027-07-01", "2027-08-01")).error).toBeNull();
    expect((await season("2027-07-15", "2027-08-15")).error?.message).toBe("VALIDATION");
  });

  it("buồng phòng và lễ tân điểm khác không sửa được giá hoặc khóa lịch", async () => {
    const room = await seedRoom();
    const hk = await clientFor(USERS.housekeeping);
    expect((await hk.schema("stay").rpc("save_rate", { p_room: room.id, p_kind: "base", p_price: 1 })).error?.message).toBe("FORBIDDEN");
    const other = await clientFor(USERS.frontDesk2);
    expect((await other.schema("stay").rpc("block_room", { p_room: room.id, p_arrival: "2027-09-01", p_departure: "2027-09-02", p_kind: "maintenance", p_reason: "x" })).error?.message).toBe("FORBIDDEN");
  });

  it("đóng bán phòng và cập nhật bảng năng lượng có audit", async () => {
    const room = await seedRoom();
    const mgr = await clientFor(USERS.manager);
    expect((await mgr.schema("stay").rpc("set_room_sellable", { p_room: room.id, p_sellable: false, p_reason: "Sửa chữa" })).error).toBeNull();
    expect((await sql<{ sellable: boolean }>(`select sellable from stay.rooms where id = $1`, [room.id]))[0]!.sellable).toBe(false);
    const card = { title: "Phòng thử", purpose: "Nghỉ ngơi", origin: "Đà Lạt", usage: "Thở chậm", frequency: "528Hz", stones: ["Thạch anh"], symbols: [], chakras: ["heart"] };
    expect((await mgr.schema("stay").rpc("update_room_energy", { p_room: room.id, p_card: card })).error).toBeNull();
    const [c] = await sql<{ title: string; status: string }>(`select c.title, c.status from stay.rooms r join core.energy_cards c on c.id = r.energy_card_id where r.id = $1`, [room.id]);
    expect(c).toEqual({ title: "Phòng thử", status: "published" });
  });
});
