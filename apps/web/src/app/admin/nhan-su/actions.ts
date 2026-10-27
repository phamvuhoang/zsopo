"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type StaffState = { error?: string; status?: string };

const ROLES = ["front_desk", "housekeeping", "location_manager", "editor", "ops_finance", "super_admin"] as const;
const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(ROLES),
  entityId: z.uuid(),
  locationId: z.uuid().optional(),
});

const message = (e: { message: string; code?: string } | null) =>
  e?.code === "P0403" ? e.message : "Không thực hiện được. Vui lòng thử lại.";

export async function inviteStaff(_: StaffState, form: FormData): Promise<StaffState> {
  const parsed = inviteSchema.safeParse({
    email: form.get("email"),
    role: form.get("role"),
    entityId: form.get("entityId"),
    locationId: form.get("locationId") || undefined,
  });
  if (!parsed.success) return { error: "Email hoặc vai trò không hợp lệ." };
  const supabase = await createClient();
  // Invite needs the Auth admin API, which only exists inside the staff-admin Edge Function.
  const { error } = await supabase.functions.invoke("staff-admin", { body: { action: "invite", ...parsed.data } });
  if (error) return { error: "Không gửi được lời mời. Kiểm tra quyền (cần MFA) và cấu hình email." };
  revalidatePath("/admin/nhan-su");
  return { status: `Đã gửi lời mời tới ${parsed.data.email}.` };
}

export async function disableStaff(_: StaffState, form: FormData): Promise<StaffState> {
  const supabase = await createClient();
  const { error } = await supabase.schema("core").rpc("disable_staff", {
    p_user: String(form.get("userId")),
    p_reason: String(form.get("reason") ?? ""),
  });
  if (error) return { error: message(error) };
  revalidatePath("/admin/nhan-su");
  return { status: "Đã vô hiệu hóa tài khoản. Quyền bị thu hồi ngay lập tức." };
}

export async function revokeRole(_: StaffState, form: FormData): Promise<StaffState> {
  const supabase = await createClient();
  const { error } = await supabase.schema("core").rpc("revoke_role", {
    p_role_id: String(form.get("roleId")),
    p_reason: String(form.get("reason") ?? "Thu hồi từ trang nhân sự"),
  });
  if (error) return { error: message(error) };
  revalidatePath("/admin/nhan-su");
  return { status: "Đã thu hồi vai trò." };
}
