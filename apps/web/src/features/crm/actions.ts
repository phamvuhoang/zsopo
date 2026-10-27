"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { rpcAction, str } from "@/lib/rpc-action";
import { createClient } from "@/lib/supabase/server";

export async function mergeAction(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await rpcAction("crm", "merge_customers", { p_survivor: str(f, "survivor"), p_merged: str(f, "merged"), p_reason: str(f, "reason") ?? "", p_verified: f.get("verified") === "on" }, "Đã gộp hồ sơ (giữ lịch sử).");
  revalidatePath("/admin/khach-hang");
  return r;
}
export async function noteAction(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await rpcAction("crm", "add_note", { p_customer: str(f, "customerId"), p_body: str(f, "body") ?? "" }, "Đã thêm ghi chú.");
  revalidatePath(`/admin/khach-hang/${str(f, "customerId")}`);
  return r;
}
export async function tagAction(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await rpcAction("crm", "tag_customer", { p_customer: str(f, "customerId"), p_tag: str(f, "tag") ?? "" }, "Đã gắn thẻ.");
  revalidatePath(`/admin/khach-hang/${str(f, "customerId")}`);
  return r;
}
export async function createCampaignAction(_: ActionState, f: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const entityId = str(f, "entityId")!;
  const filter = JSON.parse(str(f, "filter") ?? "{}");
  const { data: seg, error: e1 } = await supabase.schema("crm").from("segments").insert({ entity_id: entityId, name: str(f, "name") ?? "Phân khúc", filter_json: filter }).select("id").single();
  if (e1) return { error: "Không lưu được phân khúc (cần quyền CRM)." };
  const { error } = await supabase.schema("crm").from("campaigns").insert({ entity_id: entityId, name: str(f, "name") ?? "", subject: str(f, "subject") ?? "", body: str(f, "body") ?? "", segment_id: seg.id });
  revalidatePath("/admin/thong-bao");
  return error ? { error: "Không tạo được chiến dịch." } : { status: "Đã tạo chiến dịch nháp. Chốt danh sách rồi gửi ở trang Thông báo." };
}
export async function snapshotAction(_: ActionState, f: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.schema("crm").rpc("snapshot_campaign", { p_campaign: str(f, "campaignId")! });
  revalidatePath("/admin/thong-bao");
  return error ? { error: error.details || "Không chốt được danh sách." } : { status: `Đã chốt ${data} người nhận có đồng ý nhận thư.` };
}
export async function sendCampaignAction(_: ActionState, f: FormData): Promise<ActionState> {
  if (f.get("confirm") !== "on") return { error: "Đánh dấu xác nhận gửi chiến dịch." };
  const supabase = await createClient();
  const { data, error } = await supabase.schema("crm").rpc("send_campaign", { p_campaign: str(f, "campaignId")! });
  revalidatePath("/admin/thong-bao");
  return error ? { error: error.details || "Không gửi được (cần xác thực hai lớp)." } : { status: `Đã xếp hàng gửi ${data} thư (30 thư/phút).` };
}
