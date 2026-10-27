"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "./cart-store";

export function CartLink() {
  const n = useCart().reduce((a, l) => a + l.qty, 0);
  return (
    <a href="/gio-hang" aria-label={`Giỏ hàng, ${n} sản phẩm`} className="relative grid size-11 place-items-center rounded-full hover:bg-[var(--surface-2)]">
      <ShoppingBag size={20} strokeWidth={1.5} />
      {n > 0 && <span className="absolute top-1 right-1 rounded-full bg-[var(--accent)] px-1.5 text-[10px] text-[var(--on-accent)]">{n}</span>}
    </a>
  );
}
