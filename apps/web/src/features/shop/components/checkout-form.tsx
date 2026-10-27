"use client";

import { formatVnd } from "@zsopo/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { checkoutAction, mergeCartAction, priceCartAction } from "../checkout-actions";
import { readCart, writeCart } from "../cart-store";

const input = "min-h-11 w-full rounded-md border border-[var(--line)] bg-[var(--surface)] px-3";

/** W-32: address, COD/bank, terms; server reprices and reserves stock; double submit guarded by one idempotency key. */
export function CheckoutForm({ regions, signedIn }: { regions: { code: string; name: string }[]; signedIn: boolean }) {
  const router = useRouter();
  const [lines, setLines] = useState<{ variantId: string; qty: number }[] | null>(null);
  const [region, setRegion] = useState("default");
  const [totals, setTotals] = useState<{ subtotal: string; shipping: string; total: string } | null>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const key = useRef(typeof crypto !== "undefined" ? crypto.randomUUID() : "");

  useEffect(() => {
    (async () => {
      const stored = readCart(); // the hook snapshot is empty during hydration
      const merged = signedIn ? await mergeCartAction(stored.map((l) => ({ variantId: l.variantId, qty: l.qty }))) : null;
      if (merged && stored.length) writeCart([]);
      setLines(merged ? merged.lines.map((l) => ({ variantId: l.variantId, qty: l.qty })) : stored.map((l) => ({ variantId: l.variantId, qty: l.qty })));
    })();
  }, [signedIn]);

  useEffect(() => {
    if (lines) priceCartAction(lines, region).then((r) => r.ok && setTotals(r.data));
  }, [lines, region]);

  const submit = (f: FormData) =>
    start(async () => {
      setError(undefined);
      const r = await checkoutAction({
        lines: lines ?? [], name: String(f.get("name")), phone: String(f.get("phone")), line1: String(f.get("line1")), regionCode: region,
        email: String(f.get("email") ?? ""), method: f.get("method") === "bank" ? "bank" : "cod", terms: f.get("terms") === "on", idempotencyKey: key.current, notes: String(f.get("notes") ?? ""),
      });
      if (!r.ok) return setError(r.error.message);
      writeCart([]);
      router.push(r.data.path);
    });

  if (!lines) return <p>Đang tải giỏ hàng...</p>;
  if (!lines.length) return <p>Giỏ hàng trống. <Link href="/shop" className="underline">Vào Shop</Link></p>;
  return (
    <form action={submit} className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">Họ tên người nhận<input name="name" required autoComplete="name" className={input} /></label>
        <label className="flex flex-col gap-1 text-sm">Số điện thoại<input name="phone" required type="tel" autoComplete="tel" className={input} /></label>
        <label className="flex flex-col gap-1 text-sm">Email (không bắt buộc, để nhận thông báo đơn)<input name="email" type="email" autoComplete="email" className={input} /></label>
        <label className="flex flex-col gap-1 text-sm">Địa chỉ (số nhà, đường, phường/xã)<input name="line1" required autoComplete="street-address" className={input} /></label>
        <label className="flex flex-col gap-1 text-sm">Tỉnh/thành
          <select value={region} onChange={(e) => setRegion(e.target.value)} className={input}>
            <option value="default">Khác</option>{regions.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
        </label>
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="font-medium">Thanh toán</legend>
          <label className="flex min-h-11 items-center gap-2"><input type="radio" name="method" value="cod" defaultChecked /> Thanh toán khi nhận hàng (COD)</label>
          <label className="flex min-h-11 items-center gap-2"><input type="radio" name="method" value="bank" /> Chuyển khoản (VietQR, giữ hàng 24 giờ)</label>
        </fieldset>
        <label className="flex flex-col gap-1 text-sm">Ghi chú<textarea name="notes" className={`${input} py-2`} /></label>
        <label className="flex min-h-11 items-start gap-2 text-sm"><input type="checkbox" name="terms" className="mt-1" /> Tôi đồng ý điều khoản, chính sách giao hàng và bảo mật.</label>
        {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
      </div>
      <aside className="h-fit rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
        {totals && (
          <dl className="text-sm">
            <div className="flex justify-between"><dt>Tiền hàng</dt><dd>{formatVnd(totals.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Phí giao hàng</dt><dd>{formatVnd(totals.shipping)}</dd></div>
            <div className="mt-1 flex justify-between font-semibold"><dt>Tổng</dt><dd>{formatVnd(totals.total)}</dd></div>
          </dl>
        )}
        <button disabled={pending} className="mt-4 min-h-11 w-full rounded-md bg-[var(--accent)] font-semibold text-[var(--on-accent)] disabled:opacity-60">{pending ? "Đang đặt hàng..." : "Đặt hàng"}</button>
      </aside>
    </form>
  );
}
