"use server";

import { createShopOrder, priceCart } from "@zsopo/api";
import type { DomainResult } from "@zsopo/core";
import { setGuestToken } from "@/lib/guest";
import { createClient, createPublicClient, visitorIp } from "@/lib/supabase/server";

type Line = { variantId: string; qty: number };

export async function priceCartAction(lines: Line[], region: string | null) {
  return priceCart(createPublicClient(), lines, region);
}

/** Logged-in customers keep their cart in the DB; the local cart is merged once at sign-in. */
export async function mergeCartAction(lines: Line[]) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return null;
  const { data } = await supabase.schema("shop").rpc("merge_cart", { p_lines: lines });
  return data as { lines: (Line & { name: string; price: string })[] } | null;
}

export async function saveCartAction(lines: Line[]) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (claims?.claims) await supabase.schema("shop").rpc("set_cart", { p_lines: lines });
}

export async function checkoutAction(input: {
  lines: Line[]; name: string; phone: string; line1: string; regionCode: string; email: string; method: "cod" | "bank"; terms: boolean; idempotencyKey: string; notes?: string;
}): Promise<DomainResult<{ path: string }>> {
  if (!input.terms) return { ok: false, error: { code: "VALIDATION", message: "Vui lòng đồng ý điều khoản và chính sách giao hàng.", retryable: false } };
  const r = await createShopOrder(createPublicClient(await visitorIp()), {
    lines: input.lines, shippingAddress: { name: input.name, phone: input.phone, line1: input.line1, regionCode: input.regionCode || "default" },
    method: input.method, email: input.email || undefined, idempotencyKey: input.idempotencyKey, terms: true, notes: input.notes,
  });
  if (!r.ok) return r;
  if (r.data.guestToken) await setGuestToken(r.data.orderCode, r.data.guestToken);
  await saveCartAction([]);
  return { ok: true, data: { path: r.data.receiptPath } };
}
