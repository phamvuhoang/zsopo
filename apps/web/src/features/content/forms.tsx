"use client";

import { ActionForm } from "@/components/action-form";
import { contactAction, newsletterAction } from "./actions";

const input = "min-h-11 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3";

export function ContactForm() {
  return (
    <ActionForm action={contactAction} submit="Gửi liên hệ" className="mt-6 grid gap-3">
      <label className="flex flex-col gap-1 text-sm">Họ tên<input name="name" required className={input} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">Email<input name="email" type="email" className={input} /></label>
        <label className="flex flex-col gap-1 text-sm">Số điện thoại<input name="phone" type="tel" className={input} /></label>
      </div>
      <label className="flex flex-col gap-1 text-sm">Nội dung<textarea name="message" required className={`${input} min-h-28 py-2`} /></label>
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <label className="flex min-h-11 items-start gap-2 text-sm"><input type="checkbox" name="consent" required className="mt-1" /> Tôi đồng ý để ZSOPO dùng thông tin này để phản hồi, theo chính sách bảo mật.</label>
    </ActionForm>
  );
}

export function NewsletterForm() {
  return (
    <ActionForm action={newsletterAction} submit="Đăng ký" className="mt-4 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">Email<input name="email" type="email" required className={`${input} w-72`} /></label>
      <label className="flex min-h-11 basis-full items-center gap-2 text-sm"><input type="checkbox" name="consent" required /> Tôi muốn nhận thư năng lượng mỗi sáng Chủ nhật (hủy bất cứ lúc nào).</label>
    </ActionForm>
  );
}
