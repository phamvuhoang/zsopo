"use client";

import { formatVnd } from "@zsopo/core";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { holdAction, quoteAction, type QuoteView } from "../booking-actions";

export type WizardRoom = { id: string; slug: string; name: string; maxGuests: number; capacityAdults: number };
export type WizardService = { id: string; name: string; group: string; unit: string; price: number; leadLabel: string; discountBp: number };
type Picked = Record<string, { qty: number; at: string }>;

const input = "min-h-11 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-base";

function Countdown({ until }: { until: string }) {
  const [left, setLeft] = useState(() => Date.parse(until) - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(Date.parse(until) - Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  if (left <= 0) return <span className="text-[var(--danger)]">Báo giá đã hết hiệu lực, vui lòng xem giá lại.</span>;
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return <span>Giá giữ trong {m}:{String(s).padStart(2, "0")}</span>;
}

/** W-16/W-18: dates and guests -> server quote -> guest details -> hold (idempotent per wizard session). */
export function BookingWizard({ rooms, services = [], initialRoom, initialArrival, initialDeparture }: { rooms: WizardRoom[]; services?: WizardService[]; initialRoom?: string; initialArrival?: string; initialDeparture?: string }) {
  const router = useRouter();
  const [roomSlug, setRoomSlug] = useState(initialRoom && rooms.some((r) => r.slug === initialRoom) ? initialRoom : rooms[0]?.slug ?? "");
  const [arrival, setArrival] = useState(initialArrival ?? "");
  const [departure, setDeparture] = useState(initialDeparture ?? "");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState<number[]>([]);
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [picked, setPicked] = useState<Picked>({});
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const idem = useRef<string>("");
  const room = rooms.find((r) => r.slug === roomSlug);

  const requote = () =>
    start(async () => {
      setError(null);
      if (!room) return setError("Vui lòng chọn phòng.");
      const chosen = Object.entries(picked).filter(([, p]) => p.qty > 0 && p.at);
      if (Object.values(picked).some((p) => p.qty > 0 && !p.at)) return setError("Chọn thời gian cho dịch vụ đã đánh dấu.");
      const r = await quoteAction({
        roomId: room.id, arrival, departure, adults, childrenAges: children,
        services: chosen.map(([serviceId, p]) => ({ serviceId, qty: p.qty, scheduledAt: new Date(`${p.at}:00+07:00`).toISOString() })),
      });
      if (!r.ok) return setError(r.error.message);
      setQuote(r.data);
      idem.current = crypto.randomUUID(); // new quote = new hold attempt
    });

  const submit = (form: FormData) =>
    start(async () => {
      setError(null);
      if (!quote) return;
      const r = await holdAction({
        quoteId: quote.id, policyVersion: quote.policyVersion, idempotencyKey: idem.current,
        guest: { name: String(form.get("name") ?? ""), phone: String(form.get("phone") ?? ""), email: String(form.get("email") ?? "") },
        arrivalTime: String(form.get("arrivalTime") ?? "") || undefined, notes: String(form.get("notes") ?? "") || undefined,
        terms: form.get("terms") === "on", marketing: form.get("marketing") === "on", website: String(form.get("website") ?? ""),
      });
      if (r.ok) return router.push(r.data.path);
      if (r.error.code === "PRICE_CHANGED" || r.error.code === "QUOTE_EXPIRED") {
        setNotice(`${r.error.message} Giá mới đã được tính lại, vui lòng kiểm tra trước khi giữ phòng.`);
        setStep(1);
        setQuote(null);
        return requote();
      }
      setError(r.error.message);
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <div>
        <ol className="mb-6 flex gap-4 text-sm" aria-label="Các bước">
          <li aria-current={step === 1 ? "step" : undefined} className={step === 1 ? "font-semibold" : "text-[var(--ink-3)]"}>1. Ngày và khách</li>
          <li aria-current={step === 2 ? "step" : undefined} className={step === 2 ? "font-semibold" : "text-[var(--ink-3)]"}>2. Thông tin liên hệ</li>
        </ol>
        {notice && <p role="status" className="mb-4 rounded-md bg-[var(--warning-soft)] p-3 text-sm text-[var(--warning)]">{notice}</p>}
        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Phòng
              <select value={roomSlug} onChange={(e) => { setRoomSlug(e.target.value); setQuote(null); }} className={input}>
                {rooms.map((r) => <option key={r.slug} value={r.slug}>Phòng {r.name} (tối đa {r.maxGuests} khách)</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Nhận phòng
                <input type="date" value={arrival} onChange={(e) => { setArrival(e.target.value); setQuote(null); }} className={input} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Trả phòng
                <input type="date" value={departure} min={arrival} onChange={(e) => { setDeparture(e.target.value); setQuote(null); }} className={input} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Người lớn
                <input type="number" min={1} max={room?.maxGuests ?? 10} value={adults} onChange={(e) => { setAdults(Number(e.target.value)); setQuote(null); }} className={input} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Trẻ em
                <input type="number" min={0} max={6} value={children.length} onChange={(e) => { setChildren(Array.from({ length: Number(e.target.value) }, (_, i) => children[i] ?? 5)); setQuote(null); }} className={input} />
              </label>
            </div>
            {children.length > 0 && (
              <fieldset className="flex flex-wrap gap-3">
                <legend className="text-sm font-medium">Tuổi của trẻ (dùng để tính phụ thu theo chính sách)</legend>
                {children.map((age, i) => (
                  <label key={i} className="flex flex-col gap-1 text-xs">
                    Trẻ {i + 1}
                    <input type="number" min={0} max={17} value={age} onChange={(e) => { const next = [...children]; next[i] = Number(e.target.value); setChildren(next); setQuote(null); }} className={`${input} w-20`} />
                  </label>
                ))}
              </fieldset>
            )}
            {services.length > 0 && (
              <fieldset className="rounded-md border border-[var(--line)] p-3">
                <legend className="px-1 text-sm font-medium">Dịch vụ đặt trước (không bắt buộc)</legend>
                <ul className="flex flex-col gap-3">
                  {services.map((s) => {
                    const p = picked[s.id];
                    return (
                      <li key={s.id} className="flex flex-wrap items-end gap-2 text-sm">
                        <label className="flex min-h-11 flex-1 items-center gap-2">
                          <input type="checkbox" className="size-5" checked={!!p} onChange={(e) => { const next = { ...picked }; if (e.target.checked) next[s.id] = { qty: 1, at: "" }; else delete next[s.id]; setPicked(next); setQuote(null); }} />
                          <span>{s.name} <span className="text-[var(--ink-3)]">({formatVnd(String(s.price))}/{s.unit}{s.discountBp ? `, giảm ${s.discountBp / 100}%` : ""}, đặt trước {s.leadLabel})</span></span>
                        </label>
                        {p && (
                          <>
                            <label className="flex flex-col gap-1 text-xs">Số lượng<input type="number" min={1} max={20} value={p.qty} onChange={(e) => { setPicked({ ...picked, [s.id]: { ...p, qty: Number(e.target.value) } }); setQuote(null); }} className={`${input} w-20`} /></label>
                            <label className="flex flex-col gap-1 text-xs">Thời gian<input type="datetime-local" value={p.at} onChange={(e) => { setPicked({ ...picked, [s.id]: { ...p, at: e.target.value } }); setQuote(null); }} className={`${input} w-52`} /></label>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            )}
            {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={requote} disabled={pending || !arrival || !departure} className="min-h-11 rounded-md border border-[var(--line-2)] px-5 font-semibold disabled:opacity-60">
                {pending ? "Đang tính..." : "Xem giá"}
              </button>
              {quote && (
                <button type="button" onClick={() => { setNotice(null); setStep(2); }} className="min-h-11 rounded-md bg-[var(--accent)] px-5 font-semibold text-[var(--on-accent)]">
                  Tiếp tục
                </button>
              )}
            </div>
          </div>
        ) : (
          <form action={submit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium">Họ và tên<input name="name" required autoComplete="name" className={input} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium">Số điện thoại<input name="phone" required type="tel" autoComplete="tel" className={input} /></label>
              <label className="flex flex-col gap-1 text-sm font-medium">Email<input name="email" required type="email" autoComplete="email" className={input} /></label>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium">Giờ đến dự kiến<input name="arrivalTime" type="time" className={`${input} w-40`} /></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Ghi chú cho lễ tân<textarea name="notes" maxLength={1000} className={`${input} min-h-20 py-2`} /></label>
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
            <label className="flex min-h-11 items-start gap-2 text-sm">
              <input type="checkbox" name="terms" className="mt-1 size-5" />
              <span>Tôi đồng ý với điều khoản sử dụng, nội quy lưu trú và chính sách bảo mật (<a href="/chinh-sach/dieu-khoan" target="_blank" className="underline">điều khoản</a>, <a href="/chinh-sach/bao-mat" target="_blank" className="underline">bảo mật</a>).</span>
            </label>
            <label className="flex min-h-11 items-start gap-2 text-sm">
              <input type="checkbox" name="marketing" className="mt-1 size-5" />
              <span>Nhận thư tin tức và ưu đãi từ ZSOPO (không bắt buộc, hủy bất cứ lúc nào).</span>
            </label>
            {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="min-h-11 rounded-md border border-[var(--line-2)] px-5">Quay lại</button>
              <button disabled={pending} className="min-h-11 rounded-md bg-[var(--accent)] px-5 font-semibold text-[var(--on-accent)] disabled:opacity-60">
                {pending ? "Đang giữ phòng..." : "Giữ phòng và thanh toán cọc"}
              </button>
            </div>
          </form>
        )}
      </div>
      <aside aria-label="Tóm tắt đặt phòng" className="h-fit rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5 lg:sticky lg:top-20">
        <h2 className="text-lg font-semibold">Tóm tắt</h2>
        {room && <p className="mt-1 text-sm">Phòng {room.name}</p>}
        {quote ? (
          <>
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {quote.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-3"><span>{l.title}</span><span className="whitespace-nowrap">{formatVnd(l.amount)}</span></li>
              ))}
            </ul>
            <dl className="mt-3 border-t border-[var(--line)] pt-3 text-sm">
              <div className="flex justify-between font-semibold"><dt>Tổng ({quote.nights} đêm)</dt><dd className="whitespace-nowrap">{formatVnd(quote.total)}</dd></div>
              <div className="mt-1 flex justify-between text-[var(--accent-ink)]"><dt>Tiền cọc ({quote.depositRateBp / 100}%)</dt><dd className="whitespace-nowrap">{formatVnd(quote.depositDue)}</dd></div>
              <div className="mt-1 flex justify-between text-[var(--ink-2)]"><dt>Thanh toán khi nhận phòng</dt><dd className="whitespace-nowrap">{formatVnd(BigInt(quote.total) - BigInt(quote.depositDue))}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-[var(--ink-3)]"><Countdown until={quote.expiresAt} /></p>
            {quote.policySummary && <p className="mt-2 text-xs text-[var(--ink-2)]">{quote.policySummary}</p>}
          </>
        ) : (
          <p className="mt-3 text-sm text-[var(--ink-3)]">Chọn ngày và bấm Xem giá để nhận báo giá từng đêm.</p>
        )}
      </aside>
    </div>
  );
}
