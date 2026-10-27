import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { quoteStay } from "../../packages/api/src/stay";
import { E1, L1, USERS, anonClient, clientFor, db, seedRoom, sql } from "./helpers";

afterAll(() => db.end());

async function dirtyRoomTask(kind = "checkout") {
  const room = (await seedRoom()).id;
  await sql(`update stay.rooms set cleanliness = 'dirty' where id = $1`, [room]);
  const [t] = await sql<{ id: string }>(
    `insert into stay.housekeeping_tasks(entity_id, location_id, room_id, kind, template_version) values ($1, $2, $3, $4, 1) returning id`, [E1, L1, room, kind]);
  return { room, task: t!.id };
}
const items = async () => (await sql<{ items: { code: string }[] }>(`select items from stay.checklist_templates where kind = 'room_checkout' and active`))[0]!.items;
const op = (task: string, itemCode: string, result: "pass" | "fail" | "na", baseVersion: number, note?: string) =>
  ({ p_op: { operationId: randomUUID(), taskId: task, baseVersion, itemCode, result, note: note ?? (result === "pass" ? undefined : "ghi chú"), mediaIds: [] } });
const version = async (task: string) => (await sql<{ version: number }>(`select version from stay.housekeeping_tasks where id = $1`, [task]))[0]!.version;

async function completeChecklist(task: string, user = USERS.housekeeping, failCode?: string) {
  const hk = await clientFor(user);
  for (const it of await items()) {
    const r = await hk.schema("stay").rpc("apply_checklist_op", op(task, it.code, it.code === failCode ? "fail" : "pass", await version(task)));
    expect(r.error).toBeNull();
  }
  return hk;
}

describe("BP01/BM02/BM03 dọn và nghiệm thu", () => {
  it("BM02 còn lỗi thì BM03 không duyệt được", async () => {
    const { task } = await dirtyRoomTask();
    const hk = await completeChecklist(task, USERS.housekeeping, (await items())[3]!.code);
    expect((await hk.schema("stay").rpc("submit_for_inspection", { p_task: task, p_expected_version: await version(task) })).error).toBeNull();
    const mgr = await clientFor(USERS.manager);
    const r = await mgr.schema("stay").rpc("approve_inspection", { p_task: task, p_expected_version: await version(task), p_approved: true, p_notes: "ok" });
    expect(r.error?.message).toBe("VALIDATION");
  });

  it("đạt hết + người nghiệm thu khác người dọn => phòng ready", async () => {
    const { room, task } = await dirtyRoomTask();
    const hk = await completeChecklist(task);
    await hk.schema("stay").rpc("submit_for_inspection", { p_task: task, p_expected_version: await version(task) });
    expect((await sql<{ cleanliness: string }>(`select cleanliness from stay.rooms where id = $1`, [room]))[0]!.cleanliness).toBe("awaiting_inspection");
    const selfApprove = await hk.schema("stay").rpc("approve_inspection", { p_task: task, p_expected_version: await version(task), p_approved: true, p_notes: "" });
    expect(selfApprove.error?.message).toBe("FORBIDDEN");
    const mgr = await clientFor(USERS.manager);
    expect((await mgr.schema("stay").rpc("approve_inspection", { p_task: task, p_expected_version: await version(task), p_approved: true, p_notes: "Đạt" })).error).toBeNull();
    expect((await sql<{ cleanliness: string }>(`select cleanliness from stay.rooms where id = $1`, [room]))[0]!.cleanliness).toBe("ready");
  });

  it("lỗi an toàn khi nghiệm thu khóa bán phòng", async () => {
    const { room, task } = await dirtyRoomTask();
    await sql(`insert into stay.rate_plans(entity_id, location_id, room_id, kind, price) values ($1, $2, $3, 'base', 900000)`, [E1, L1, room]);
    const hk = await completeChecklist(task);
    await hk.schema("stay").rpc("submit_for_inspection", { p_task: task, p_expected_version: await version(task) });
    const mgr = await clientFor(USERS.manager);
    await mgr.schema("stay").rpc("approve_inspection", { p_task: task, p_expected_version: await version(task), p_approved: false, p_notes: "Ổ điện hở", p_safety_issue: true });
    const [r] = await sql<{ safety_block: boolean; cleanliness: string }>(`select safety_block, cleanliness from stay.rooms where id = $1`, [room]);
    expect(r).toEqual({ safety_block: true, cleanliness: "dirty" });
    const q = await quoteStay(anonClient(), { roomId: room, arrival: "2028-09-01", departure: "2028-09-02", adults: 1, childrenAges: [], services: [] });
    expect(!q.ok && q.error.code).toBe("SOLD_OUT");
  });
});

describe("hàng đợi checklist (offline-safe)", () => {
  it("cùng operationId gửi lại => duplicate, không ghi hai lần", async () => {
    const { task } = await dirtyRoomTask();
    const hk = await clientFor(USERS.housekeeping);
    const o = op(task, (await items())[0]!.code, "pass", await version(task));
    expect((await hk.schema("stay").rpc("apply_checklist_op", o)).data.state).toBe("applied");
    expect((await hk.schema("stay").rpc("apply_checklist_op", o)).data.state).toBe("duplicate");
    expect(await sql(`select 1 from stay.checklist_results where task_id = $1`, [task])).toHaveLength(1);
  });

  it("mục đã bị người khác sửa sau baseVersion => conflict, không ghi đè im lặng", async () => {
    const { task } = await dirtyRoomTask();
    const code = (await items())[1]!.code;
    const base = await version(task);
    const other = await clientFor(USERS.housekeeping2);
    expect((await other.schema("stay").rpc("apply_checklist_op", op(task, code, "fail", base, "Vết bẩn ga"))).data.state).toBe("applied");
    const hk = await clientFor(USERS.housekeeping);
    const r = await hk.schema("stay").rpc("apply_checklist_op", op(task, code, "pass", base));
    expect(r.data.state).toBe("conflict");
    const [row] = await sql<{ result: string }>(`select result from stay.checklist_results where task_id = $1 and item_code = $2 order by created_at desc limit 1`, [task, code]);
    expect(row!.result).toBe("fail");
  });

  it("nhân sự điểm khác hoặc bị thu hồi quyền => forbidden", async () => {
    const { task } = await dirtyRoomTask();
    const fd2 = await clientFor(USERS.frontDesk2);
    expect((await fd2.schema("stay").rpc("apply_checklist_op", op(task, (await items())[0]!.code, "pass", await version(task)))).data.state).toBe("forbidden");
  });
});

describe("BP02 dọn phòng đang ở", () => {
  it("khách từ chối/DND: ghi lịch hẹn, không cho ghi checklist", async () => {
    const { task } = await dirtyRoomTask("stayover");
    const hk = await clientFor(USERS.housekeeping);
    expect((await hk.schema("stay").rpc("refuse_service", { p_task: task, p_reason: "Treo biển DND", p_reschedule_at: new Date(Date.now() + 3 * 3600_000).toISOString() })).error).toBeNull();
    expect((await hk.schema("stay").rpc("apply_checklist_op", op(task, (await items())[0]!.code, "pass", await version(task)))).data.state).toBe("forbidden");
  });
});

describe("BP03 đồ vải, vật tư", () => {
  it("giao nhận hai bên xác nhận; tồn sạch/bẩn đối chiếu được", async () => {
    const hk = await clientFor(USERS.housekeeping);
    const [item] = await sql<{ id: string }>(`insert into stay.supply_items(entity_id, location_id, code, name, kind, min_level) values ($1, $2, 'GA-' || substr(md5(random()::text),1,6), 'Ga giường đôi', 'linen', 5) returning id`, [E1, L1]);
    const mv = async (kind: string, qty: number) => (await hk.schema("stay").rpc("record_supply_movement", { p_item: item!.id, p_kind: kind, p_qty: qty, p_room: null, p_counterpart: USERS.housekeeping2.id, p_note: "" })).data as string;
    const received = await mv("receive_clean", 10);
    await mv("issue_room", 4);
    await mv("collect_dirty", 4);
    await mv("send_laundry", 4);
    const hk2 = await clientFor(USERS.housekeeping2);
    expect((await hk2.schema("stay").rpc("confirm_supply_movement", { p_movement: received })).error).toBeNull();
    expect((await hk.schema("stay").rpc("confirm_supply_movement", { p_movement: received })).error?.message).toBe("FORBIDDEN");
    const { data } = await hk.schema("stay").rpc("supply_balances", { p_location: L1 });
    const row = (data as { item_id: string; clean: number; dirty: number; at_laundry: number; below_min: boolean }[]).find((r) => r.item_id === item!.id);
    expect(row).toMatchObject({ clean: 6, dirty: 0, at_laundry: 4 });
  });
});

describe("đồ thất lạc", () => {
  it("trả lại cần xác minh và biên nhận; thanh lý cần quản lý", async () => {
    const hk = await clientFor(USERS.housekeeping);
    const { data: id } = await hk.schema("stay").rpc("record_lost_item", { p_location: L1, p_room: null, p_description: "Ví da nâu", p_storage: "Tủ khóa lễ tân", p_seal: "NP-001", p_witness: USERS.housekeeping2.id });
    const noEvidence = await hk.schema("stay").rpc("transition_lost_item", { p_item: id, p_to: "returned", p_note: "", p_receipt: "" });
    expect(noEvidence.error?.message).toBe("VALIDATION");
    const dispose = await hk.schema("stay").rpc("transition_lost_item", { p_item: id, p_to: "disposed", p_note: "Quá hạn", p_receipt: "" });
    expect(dispose.error?.message).toBe("FORBIDDEN");
    const ok = await hk.schema("stay").rpc("transition_lost_item", { p_item: id, p_to: "returned", p_note: "Khách mô tả đúng, đối chiếu CCCD", p_receipt: "BN-2026-001" });
    expect(ok.error).toBeNull();
  });
});
