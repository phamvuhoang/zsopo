"use client";

import { formatVnd } from "@zsopo/core";
import Link from "next/link";
import { useEffect, useState } from "react";
import { priceCartAction, mergeCartAction, saveCartAction } from "../checkout-actions";
import { readCart, writeCart, type CartLine } from "../cart-store";

type Priced = { variantId: string; qty: number; maxQty: number; name: string; price: string; amount: string; inStock: boolean };

/** W-31: local cart (guest) or DB cart (signed in, merged once); always repriced by the server. */
export function CartView({ signedIn }: { signedIn: boolean }) {
  const [priced, setPriced] = useState<{ lines: Priced[]; subtotal: string; shipping: string; total: string } | null>(null);
  const [changed, setChanged] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const stored = readCart(); // read storage directly: the hook snapshot is empty during hydration
      let lines: CartLine[] = stored;
      if (signedIn) {
        const merged = await mergeCartAction(stored.map((l) => ({ variantId: l.variantId, qty: l.qty })));
        if (merged && stored.length) writeCart([]);
        if (merged) lines = merged.lines.map((l) => ({ variantId: l.variantId, qty: l.qty, name: l.name, price: Number(l.price) }));
      }
      const r = await priceCartAction(lines.map((l) => ({ variantId: l.variantId, qty: l.qty })), null);
      if (!r.ok) return;
      setChanged(r.data.lines.filter((p) => { const o = lines.find((l) => l.variantId === p.variantId); return o && (o.qty !== p.qty || o.price !== Number(p.price)); }).map((p) => p.name));
      setPriced(r.data);
    })();
  }, [signedIn]);

  const update = async (variantId: string, qty: number) => {
    const lines = (priced?.lines ?? []).map((l) => ({ variantId: l.variantId, qty: l.variantId === variantId ? qty : l.qty, name: l.name, price: Number(l.price) })).filter((l) => l.qty > 0);
    if (signedIn) await saveCartAction(lines.map(({ variantId: v, qty: q }) => ({ variantId: v, qty: q })));
    else writeCart(lines);
    const r = await priceCartAction(lines.map(({ variantId: v, qty: q }) => ({ variantId: v, qty: q })), null);
    if (r.ok) setPriced(r.data);
  };

  if (!priced) return <p>Đang tải giỏ hàng...</p>;
  if (priced.lines.length === 0) return <p>Giỏ hàng trống. <Link href="/shop" className="underline">Vào Shop</Link></p>;
  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <ul className="flex flex-col gap-3">
        {priced.lines.map((l) => (
          <li key={l.variantId} className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--line)] bg-[var(--surface)] p-3">
            <span className="flex-1 font-medium">{l.name}</span>
            <span className="whitespace-nowrap">{formatVnd(l.price)}</span>
            <label className="flex items-center gap-1 text-sm">SL<input type="number" min={0} max={l.maxQty} value={l.qty} onChange={(e) => update(l.variantId, Math.min(Number(e.target.value), l.maxQty))} aria-label={`Số lượng ${l.name}`} className="min-h-11 w-16 rounded-md border border-[var(--line)] px-2" /></label>
            {!l.inStock && <span className="text-sm text-[var(--danger)]">Hết hàng</span>}
            <button type="button" onClick={() => update(l.variantId, 0)} className="text-sm underline">Xóa</button>
          </li>
        ))}
      </ul>
      <aside className="h-fit rounded-md border border-[var(--line)] bg-[var(--surface)] p-4">
        {changed.length > 0 && <p role="status" className="mb-2 text-sm text-[var(--warning)]">Giá hoặc số lượng đã được cập nhật theo tồn kho: {changed.join(", ")}.</p>}
        <dl className="text-sm">
          <div className="flex justify-between"><dt>Tiền hàng</dt><dd>{formatVnd(priced.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Phí giao hàng (ước tính)</dt><dd>{formatVnd(priced.shipping)}</dd></div>
          <div className="mt-1 flex justify-between font-semibold"><dt>Tổng</dt><dd>{formatVnd(priced.total)}</dd></div>
        </dl>
        <a href="/thanh-toan" className="mt-4 flex min-h-11 items-center justify-center rounded-md bg-[var(--accent)] font-semibold text-[var(--on-accent)]">Thanh toán</a>
      </aside>
    </div>
  );
}
