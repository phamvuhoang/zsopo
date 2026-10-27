"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { env } from "@/lib/env";

/** LT02 identity capture: file goes straight to the encrypting Edge Function; nothing is cached on the device. */
export function IdentityUpload({ bookingId }: { bookingId: string }) {
  const [status, setStatus] = useState<string>();
  const upload = async (file: File) => {
    setStatus("Đang mã hóa và tải lên...");
    const { data } = await createClient().auth.getSession();
    const form = new FormData();
    form.set("bookingId", bookingId);
    form.set("file", file);
    const res = await fetch(`${env.supabaseUrl}/functions/v1/identity-docs`, {
      method: "POST", headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, apikey: env.supabaseKey }, body: form,
    });
    setStatus(res.ok ? "Đã lưu giấy tờ (mã hóa, tự xóa sau 30 ngày)." : res.status === 403 ? "Bạn không có quyền lưu giấy tờ." : "Không lưu được, chỉ nhận ảnh JPEG/PNG/WebP hoặc PDF tối đa 10MB.");
  };
  return (
    <div className="rounded-md border border-[var(--line)] p-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Ảnh giấy tờ tùy thân (đăng ký tạm trú)
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </label>
      {status && <p role="status" className="mt-1 text-xs">{status}</p>}
    </div>
  );
}
