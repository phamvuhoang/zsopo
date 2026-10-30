import "server-only";
import { getGuestReceipt, type GuestReceipt } from "@zsopo/api";
import { getGuestToken } from "@/lib/guest";
import { createPublicClient } from "@/lib/supabase/server";

/** Receipt for an order the visitor holds a capability cookie for; null otherwise (order code alone is not enough). */
export async function loadReceipt(code: string): Promise<GuestReceipt | null> {
  const token = await getGuestToken(code);
  if (!token) return null;
  const r = await getGuestReceipt(createPublicClient(), token);
  return r.ok && r.data.orderCode === code ? r.data : null;
}
