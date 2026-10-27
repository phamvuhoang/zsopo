"use server";

import type { ActionState } from "@/components/action-form";
import { int, rpcAction, str } from "@/lib/rpc-action";

const roomTags = (slug: string | null) => ["rooms", ...(slug ? [`room:${slug}`] : [])];

export async function saveRate(_: ActionState, f: FormData): Promise<ActionState> {
  const kind = str(f, "kind");
  if (!kind) return { error: "Chọn loại giá." };
  return rpcAction("stay", "save_rate", {
    p_room: str(f, "roomId"), p_kind: kind, p_price: int(f, "price"), p_dow: kind === "weekday" ? int(f, "dow") : null,
    p_from: str(f, "from"), p_to: str(f, "to"), p_extra_adult_fee: int(f, "extraAdult") ?? 0, p_extra_child_fee: int(f, "extraChild") ?? 0, p_label: str(f, "label"),
  }, "Đã lưu giá. Báo giá cũ của khách sẽ yêu cầu xác nhận lại.", roomTags(str(f, "slug")));
}

export async function deactivateRate(_: ActionState, f: FormData): Promise<ActionState> {
  return rpcAction("stay", "deactivate_rate", { p_rate: str(f, "rateId"), p_reason: "Tắt từ trang quản trị điểm" }, "Đã tắt giá.", roomTags(str(f, "slug")));
}

export async function setSellable(_: ActionState, f: FormData): Promise<ActionState> {
  return rpcAction("stay", "set_room_sellable", { p_room: str(f, "roomId"), p_sellable: f.get("sellable") === "true", p_reason: str(f, "reason") },
    "Đã cập nhật trạng thái mở bán.", roomTags(str(f, "slug")));
}

export async function saveEnergy(_: ActionState, f: FormData): Promise<ActionState> {
  const list = (k: string) => (str(f, k) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return rpcAction("stay", "update_room_energy", {
    p_room: str(f, "roomId"),
    p_card: { title: str(f, "title"), purpose: str(f, "purpose"), origin: str(f, "origin"), usage: str(f, "usage"), frequency: str(f, "frequency"),
      stones: list("stones"), symbols: list("symbols"), chakras: f.getAll("chakras").map(String), ritualVideoUrl: str(f, "ritualVideoUrl") },
  }, "Đã lưu bảng năng lượng.", roomTags(str(f, "slug")));
}

export async function blockRoom(_: ActionState, f: FormData): Promise<ActionState> {
  return rpcAction("stay", "block_room", { p_room: str(f, "roomId"), p_arrival: str(f, "from"), p_departure: str(f, "to"), p_kind: str(f, "kind") ?? "maintenance", p_reason: str(f, "reason") },
    "Đã khóa lịch phòng.", ["rooms"]);
}

export async function releaseBlock(_: ActionState, f: FormData): Promise<ActionState> {
  return rpcAction("stay", "release_block", { p_block: str(f, "blockId"), p_reason: "Mở lại từ trang quản trị điểm" }, "Đã mở lại lịch.", ["rooms"]);
}

export async function publishPolicy(_: ActionState, f: FormData): Promise<ActionState> {
  const pct = int(f, "depositPct");
  if (!pct || pct < 30 || pct > 50) return { error: "Tỷ lệ cọc phải từ 30% đến 50%." };
  const current = JSON.parse(str(f, "current") ?? "{}");
  return rpcAction("ops_config", "publish_stay_policy", {
    p_location: str(f, "locationId"),
    p_params: { ...current, deposit_rate_bp: pct * 100, hold_minutes: int(f, "holdMinutes") ?? 30 },
    p_summary: str(f, "summary") ?? "",
  }, "Đã phát hành phiên bản chính sách mới. Đặt phòng cũ giữ nguyên phiên bản đã chấp nhận.", ["location:da-lat"]);
}
