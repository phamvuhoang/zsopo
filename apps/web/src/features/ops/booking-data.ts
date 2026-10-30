import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Booking + order + statement for front desk pages (RLS: booking.read at the location). */
export async function loadBooking(id: string, userId: string) {
  const db = await createClient();
  const { data: b } = await db.schema("stay").from("bookings").select("*").eq("id", id).maybeSingle();
  if (!b) notFound();
  const [{ data: order }, { data: items }, { data: room }, { data: allocs }, { data: shift }] = await Promise.all([
    db.schema("commerce").from("orders").select("*").eq("id", b.order_id).single(),
    db.schema("commerce").from("order_items").select("id, title, amount, status, item_type, created_at").eq("order_id", b.order_id).order("created_at"),
    db.schema("stay").from("rooms").select("id, code, name, cleanliness, occupancy, safety_block").eq("id", b.room_id).single(),
    db.schema("commerce").from("payment_allocations").select("amount, created_at, payment_id").eq("order_id", b.order_id),
    db.schema("stay").from("shifts").select("id").eq("opened_by", userId).eq("status", "open").maybeSingle(),
  ]);
  const { data: payments } = allocs?.length
    ? await db.schema("commerce").from("payments").select("id, provider, provider_ref, amount, received_at").in("id", allocs.map((a) => a.payment_id))
    : { data: [] };
  return { b, order: order!, items: items ?? [], room: room!, payments: payments ?? [], shiftId: shift?.id ?? null };
}
