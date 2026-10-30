import "server-only";
import type { Chakra, EnergyCardData } from "@zsopo/core";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";

export type PublicRoom = {
  id: string;
  slug: string;
  code: string;
  name: string;
  roomType: string;
  areaM2: number | null;
  capacityAdults: number;
  maxGuests: number;
  amenities: string[];
  description: string;
  sellable: boolean;
  basePrice: string | null;
  energy: EnergyCardData | null;
};

type CardRow = {
  title: string; purpose: string; origin: string; usage: string; frequency: string | null;
  stones: string[]; symbols: string[]; chakras: string[]; ritual_video_url: string | null; bovis_reference: number | null;
};

export const toEnergy = (c: CardRow | null): EnergyCardData | null =>
  c && {
    title: c.title, purpose: c.purpose, origin: c.origin, usage: c.usage, frequency: c.frequency,
    stones: c.stones, symbols: c.symbols, chakras: c.chakras as Chakra[], ritualVideoUrl: c.ritual_video_url, bovisReference: c.bovis_reference,
  };

const ROOM_SELECT =
  "id, slug, code, name, room_type, area_m2, capacity_adults, max_guests, amenities, description, sellable, sort, energy_card_id, rate_plans(kind, price, active)";
const CARD_SELECT = "id, title, purpose, origin, usage, frequency, stones, symbols, chakras, ritual_video_url, bovis_reference";

/** Energy cards live in core; PostgREST cannot embed across schemas, so load them by id. */
async function withCards<T extends { energy_card_id: string | null }>(rows: T[]): Promise<(T & { energy_cards: CardRow | null })[]> {
  const ids = [...new Set(rows.map((r) => r.energy_card_id).filter((x): x is string => !!x))];
  const { data } = ids.length ? await createPublicClient().schema("core").from("energy_cards").select(CARD_SELECT).in("id", ids) : { data: [] };
  const byId = new Map((data ?? []).map((c) => [c.id, c as CardRow]));
  return rows.map((r) => ({ ...r, energy_cards: (r.energy_card_id && byId.get(r.energy_card_id)) || null }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRoom(r: any): PublicRoom {
  const base = (r.rate_plans as { kind: string; price: number; active: boolean }[]).find((p) => p.kind === "base" && p.active);
  return {
    id: r.id, slug: r.slug, code: r.code, name: r.name, roomType: r.room_type, areaM2: r.area_m2, capacityAdults: r.capacity_adults,
    maxGuests: r.max_guests, amenities: r.amenities, description: r.description, sellable: r.sellable,
    basePrice: base ? String(base.price) : null, energy: toEnergy(r.energy_cards),
  };
}

export type PublicLocation = { id: string; slug: string; name: string; address: string | null; checkIn: string; checkOut: string; policySummary: string; policyVersionId: string | null };

export async function getLocation(slug: string): Promise<PublicLocation | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`location:${slug}`);
  const db = createPublicClient();
  const { data: l } = await db.schema("core").from("locations").select("id, slug, name, address, check_in_time, check_out_time").eq("slug", slug).eq("status", "active").maybeSingle();
  if (!l) return null;
  const { data: pol } = await db.schema("ops_config").rpc("current_policy", { p_location: l.id, p_kind: "stay" });
  return {
    id: l.id, slug: l.slug, name: l.name, address: l.address,
    checkIn: l.check_in_time.slice(0, 5), checkOut: l.check_out_time.slice(0, 5),
    policySummary: pol?.summary_md ?? "", policyVersionId: pol?.id ?? null,
  };
}

export async function listRooms(locationId: string): Promise<PublicRoom[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("rooms");
  const { data } = await createPublicClient().schema("stay").from("rooms").select(ROOM_SELECT).eq("location_id", locationId).eq("status", "published").order("sort");
  return (await withCards(data ?? [])).map(toRoom).sort((a, b) => Number(b.sellable) - Number(a.sellable));
}

export async function getRoom(slug: string): Promise<PublicRoom | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`room:${slug}`, "rooms");
  const { data } = await createPublicClient().schema("stay").from("rooms").select(ROOM_SELECT).eq("slug", slug).eq("status", "published").maybeSingle();
  return data ? toRoom((await withCards([data]))[0]) : null;
}
