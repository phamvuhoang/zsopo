"use client";

import { useSyncExternalStore } from "react";

export type CartLine = { variantId: string; qty: number; name: string; price: number };
const KEY = "zs-cart";
const EVENT = "zs-cart";
let cache: { raw: string | null; lines: CartLine[] } = { raw: null, lines: [] };

export function readCart(): CartLine[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== cache.raw) cache = { raw, lines: raw ? (JSON.parse(raw) as CartLine[]) : [] };
  return cache.lines;
}

export function writeCart(lines: CartLine[]) {
  try {
    if (lines.length) localStorage.setItem(KEY, JSON.stringify(lines));
    else localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function addLine(line: CartLine) {
  const lines = [...readCart()];
  const i = lines.findIndex((l) => l.variantId === line.variantId);
  if (i >= 0) lines[i] = { ...lines[i]!, qty: Math.min(lines[i]!.qty + line.qty, 50) };
  else lines.push(line);
  writeCart(lines);
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};
const EMPTY: CartLine[] = [];
export const useCart = () => useSyncExternalStore(subscribe, readCart, () => EMPTY);
