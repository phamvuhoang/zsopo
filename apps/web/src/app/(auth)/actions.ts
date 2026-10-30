"use server";

import { safeRedirectPath } from "@zsopo/core";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; status?: string };

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
  });
  if (error) return { error: "Email hoặc mật khẩu không đúng, hoặc tài khoản chưa xác minh." };
  redirect(safeRedirectPath(String(form.get("next") ?? ""), "/"));
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Mật khẩu cần ít nhất 8 ký tự." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: String(form.get("email") ?? "").trim(),
    password,
    options: { emailRedirectTo: `${env.siteUrl}/auth/callback?next=/` },
  });
  if (error) return { error: "Không tạo được tài khoản. Vui lòng kiểm tra email và thử lại." };
  return { status: "Đã gửi email xác minh. Vui lòng mở liên kết trong email để kích hoạt tài khoản." };
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(String(form.get("email") ?? "").trim(), {
    redirectTo: `${env.siteUrl}/auth/callback?next=/dat-lai-mat-khau`,
  });
  // Same answer whether or not the account exists.
  return { status: "Nếu email có tài khoản, chúng tôi đã gửi liên kết đặt lại mật khẩu. Liên kết có hiệu lực trong 1 giờ." };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Mật khẩu cần ít nhất 8 ký tự." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Liên kết đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu liên kết mới." };
  return { status: "Đã đổi mật khẩu. Bạn có thể tiếp tục sử dụng tài khoản." };
}

/** Ends the session; the caller wipes device data only after this succeeded, then navigates. */
export async function signOut(): Promise<{ error?: string }> {
  const { error } = await (await createClient()).auth.signOut();
  return error ? { error: error.message } : {};
}
