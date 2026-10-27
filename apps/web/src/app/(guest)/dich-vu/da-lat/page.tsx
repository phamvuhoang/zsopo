import { myStayServices } from "@zsopo/api";
import { Price, StatusBadge } from "@zsopo/ui";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { cancelServiceAction, requestServiceAction } from "@/features/stay/service-actions";
import { SERVICE_GROUPS, leadLabel, listServices } from "@/features/stay/service-queries";
import { getLocation } from "@/features/stay/queries";
import { createPublicClient } from "@/lib/supabase/server";

export const metadata = { title: "Dịch vụ tại Zen Homestay Đà Lạt" };
export const instant = false;

const STATE = { requested: ["Đã gửi", "info"], accepted: ["Đã nhận", "accent"], in_progress: ["Đang phục vụ", "warning"], completed: ["Hoàn tất", "success"], cancelled: ["Đã hủy", "neutral"] } as const;

export default async function ServicesPage() {
  const loc = await getLocation("da-lat");
  const services = loc ? await listServices(loc.id) : [];
  const token = (await cookies()).get("zs_stay")?.value;
  const mine = token ? await myStayServices(createPublicClient(), token) : null;
  const stay = mine?.ok && mine.data ? mine.data : null;
  return (
    <>
      <h1 className="text-3xl font-semibold">Dịch vụ tại Zen Homestay Đà Lạt</h1>
      {stay ? (
        <p className="mt-2 text-[var(--ink-2)]">Phòng {stay.booking.roomName}. Yêu cầu được ghi vào hóa đơn phòng và thanh toán khi trả phòng.</p>
      ) : (
        <p className="mt-2 text-[var(--ink-2)]">Xem thực đơn dịch vụ. Khách đang lưu trú quét mã QR lễ tân bàn giao để gửi yêu cầu; số phòng không đủ để ghi phí.</p>
      )}
      {stay && stay.requests.length > 0 && (
        <section className="mt-6" aria-labelledby="yeu-cau">
          <h2 id="yeu-cau" className="text-lg font-semibold">Yêu cầu của bạn</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {stay.requests.map((r) => {
              const [label, tone] = STATE[r.state];
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--line)] p-3 text-sm">
                  <span className="font-semibold">{r.name} x{r.qty}</span>
                  <span>{new Date(r.scheduledAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</span>
                  <Price value={r.amount} />
                  <StatusBadge tone={tone}>{label}</StatusBadge>
                  {r.state === "requested" && <ActionForm action={cancelServiceAction} submit="Hủy" danger><input type="hidden" name="requestId" value={r.id} /></ActionForm>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {(Object.keys(SERVICE_GROUPS) as (keyof typeof SERVICE_GROUPS)[]).map((g) => {
        const list = services.filter((s) => s.group_key === g);
        if (!list.length) return null;
        return (
          <section key={g} className="mt-8" aria-labelledby={`nhom-${g}`}>
            <h2 id={`nhom-${g}`} className="text-xl font-semibold">{SERVICE_GROUPS[g]}</h2>
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {list.map((s) => (
                <li key={s.id} className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
                  <div className="flex justify-between gap-3">
                    <h3 className="font-semibold">{s.name}</h3>
                    <Price value={String(s.price)} className="font-semibold" />
                  </div>
                  <p className="mt-1 text-sm text-[var(--ink-2)]">{s.description}</p>
                  <p className="mt-1 text-xs text-[var(--ink-3)]">/{s.unit} · đặt trước {leadLabel(s.lead_time_min)} · phục vụ {s.serve_from.slice(0, 5)} đến {s.serve_to.slice(0, 5)}{s.prebook_discount_bp ? ` · giảm ${s.prebook_discount_bp / 100}% khi đặt cùng phòng` : ""}</p>
                  {stay && (
                    <ActionForm action={requestServiceAction} submit="Gửi yêu cầu" className="mt-3 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="serviceId" value={s.id} />
                      <input type="hidden" name="idempotencyKey" value={randomUUID()} />
                      <Field label="Số lượng"><input name="qty" type="number" min={1} max={20} defaultValue={1} className={`${inputCls} w-20`} /></Field>
                      <Field label="Thời gian"><input name="scheduledAt" type="datetime-local" required className={inputCls} /></Field>
                    </ActionForm>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
