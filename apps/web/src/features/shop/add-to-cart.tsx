"use client";

import { useState } from "react";
import { addLine } from "./cart-store";

/** Adds to the local cart; prices are only indicative here, the server reprices at checkout. */
export function AddToCart({ variantId, name, price }: { variantId: string; name: string; price: number }) {
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs">Số lượng<input type="number" min={1} max={50} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} className="min-h-11 w-20 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2" /></label>
      <button type="button" onClick={() => { addLine({ variantId, qty, name, price }); setDone(true); }} className="min-h-11 rounded-md bg-[var(--accent)] px-4 font-semibold text-[var(--on-accent)]">Thêm vào giỏ</button>
      {done && <a href="/gio-hang" role="status" className="text-sm underline">Đã thêm. Xem giỏ hàng</a>}
    </div>
  );
}
