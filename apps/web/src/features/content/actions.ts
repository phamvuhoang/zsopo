"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { int, rpcAction, str } from "@/lib/rpc-action";
import { createClient, createPublicClient, visitorIp } from "@/lib/supabase/server";

const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function contactAction(_: ActionState, f: FormData): Promise<ActionState> {
  if (str(f, "website")) return { error: "Không gửi được." };
  const { error } = await createPublicClient(await visitorIp()).schema("content").rpc("submit_contact", {
    p_name: str(f, "name") ?? "", p_email: str(f, "email") ?? "", p_phone: str(f, "phone") ?? "", p_message: str(f, "message") ?? "", p_consent: f.get("consent") === "on",
  });
  return error ? { error: error.details || "Không gửi được, vui lòng thử lại." } : { status: "Cảm ơn bạn. ZSOPO sẽ phản hồi sớm." };
}

export async function newsletterAction(_: ActionState, f: FormData): Promise<ActionState> {
  const { error } = await createPublicClient(await visitorIp()).schema("content").rpc("subscribe_newsletter", { p_email: str(f, "email") ?? "", p_consent: f.get("consent") === "on" });
  return error ? { error: error.details || "Không đăng ký được." } : { status: "Đã đăng ký thư năng lượng. Bạn có thể hủy bất cứ lúc nào bằng liên kết trong thư." };
}

export async function savePostAction(_: ActionState, f: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const title = str(f, "title") ?? "";
  const { error } = await supabase.schema("content").rpc("save_post", { p: {
    id: str(f, "id"), entityId: str(f, "entityId"), slug: str(f, "slug") ?? slugify(title), title, excerpt: str(f, "excerpt") ?? "", bodyMd: str(f, "bodyMd") ?? "",
    categoryId: str(f, "categoryId"), authorName: str(f, "authorName"), expectedVersion: int(f, "version"),
    cta: str(f, "ctaHref") ? { label: str(f, "ctaLabel") ?? "Xem thêm", href: str(f, "ctaHref") } : null,
  } });
  revalidatePath("/admin/noi-dung");
  return error ? { error: error.details || error.message } : { status: "Đã lưu bản nháp (tạo phiên bản mới)." };
}

export async function publishPostAction(_: ActionState, f: FormData): Promise<ActionState> {
  const at = str(f, "scheduledAt");
  const r = await rpcAction("content", "publish_content", { p_post: str(f, "id"), p_expected_version: int(f, "version"), p_scheduled_at: at ? new Date(`${at}:00+07:00`).toISOString() : null }, at ? "Đã lên lịch đăng (giờ Việt Nam)." : "Đã đăng.", ["posts"]);
  revalidatePath("/admin/noi-dung");
  return r;
}

export async function submitReviewAction(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await rpcAction("content", "submit_review", { p_post: str(f, "id") }, "Đã gửi duyệt.");
  revalidatePath("/admin/noi-dung");
  return r;
}

export async function restoreAction(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await rpcAction("content", "restore_revision", { p_post: str(f, "id"), p_revision: str(f, "revisionId") }, "Đã khôi phục thành phiên bản mới.");
  revalidatePath("/admin/noi-dung");
  return r;
}

export async function savePageAction(_: ActionState, f: FormData): Promise<ActionState> {
  const r = await rpcAction("content", "save_page", { p_page: str(f, "id"), p_title: str(f, "title"), p_excerpt: str(f, "excerpt") ?? "", p_body: str(f, "body") ?? "", p_expected_version: int(f, "version"), p_publish: f.get("publish") === "on" }, "Đã lưu trang.", ["pages", `page:${str(f, "slug")}`]);
  revalidatePath("/admin/noi-dung");
  return r;
}

export async function uploadMediaAction(_: ActionState, f: FormData): Promise<ActionState> {
  const file = f.get("file");
  const alt = str(f, "alt");
  const entityId = str(f, "entityId")!;
  if (!(file instanceof File) || !/^image\/(jpeg|png|webp|avif)$/.test(file.type) || file.size > 10 * 1024 * 1024) return { error: "Chỉ nhận ảnh JPEG/PNG/WebP/AVIF tối đa 10MB." };
  if (!alt) return { error: "Ảnh công khai cần mô tả (alt)." };
  const supabase = await createClient();
  const path = `${entityId}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
  const up = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (up.error) return { error: "Không tải lên được (cần quyền biên tập)." };
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.schema("core").from("media").insert({ entity_id: entityId, bucket: "media", path, classification: "public", alt, mime: file.type, bytes: file.size, owner_id: u.user?.id });
  if (error) return { error: "Không lưu được thông tin ảnh." };
  const url = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  return { status: `Đã tải lên. Chèn vào bài: ![${alt}](${url})` };
}

export async function importCalendarAction(_: ActionState, f: FormData): Promise<ActionState> {
  // CSV columns: week_start (YYYY-MM-DD), topic, channel, owner. Importing never publishes anything.
  const rows = (str(f, "csv") ?? "").split(/\r?\n/).map((l) => l.split(",").map((c) => c.trim())).filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r[0] ?? ""));
  if (!rows.length) return { error: "Không có dòng hợp lệ (tuần, chủ đề, kênh, người phụ trách)." };
  const supabase = await createClient();
  const { error } = await supabase.schema("content").from("campaign_calendar").insert(rows.map((r) => ({ entity_id: str(f, "entityId")!, week_start: r[0]!, topic: r[1] ?? "", channel: r[2] ?? "", owner: r[3] ?? null })));
  revalidatePath("/admin/noi-dung");
  updateTag("posts");
  return error ? { error: "Không nhập được lịch." } : { status: `Đã nhập ${rows.length} dòng lịch (không tự đăng bài).` };
}
