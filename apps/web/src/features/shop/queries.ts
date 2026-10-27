import "server-only";
import type { EnergyCardData } from "@zsopo/core";
import { cacheLife, cacheTag } from "next/cache";
import { toEnergy } from "@/features/stay/queries";
import { createPublicClient } from "@/lib/supabase/server";

export type Category = { id: string; slug: string; name: string; description: string };
export type ProductCard = { id: string; slug: string; name: string; summary: string; categoryId: string; priceFrom: number; chakras: string[] };
export type ProductDetail = ProductCard & { origin: string; usage: string; ritualSlug: string | null; energy: EnergyCardData | null; variants: { id: string; sku: string; name: string; price: number }[] };

export async function listCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("shop");
  const { data } = await createPublicClient().schema("shop").from("categories").select("id, slug, name, description").order("sort");
  return data ?? [];
}

/** Published catalogue with "from" price and chakra tags (from Energy Cards) for filters. */
export async function listProducts(): Promise<ProductCard[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("shop");
  const db = createPublicClient();
  const { data } = await db.schema("shop").from("products").select("id, slug, name, summary, category_id, energy_card_id, product_variants(price, active)").eq("status", "published").order("created_at");
  const cardIds = (data ?? []).map((p) => p.energy_card_id).filter((x): x is string => !!x);
  const { data: cards } = cardIds.length ? await db.schema("core").from("energy_cards").select("id, chakras").in("id", cardIds) : { data: [] };
  const chakras = new Map((cards ?? []).map((c) => [c.id, c.chakras as string[]]));
  return (data ?? []).map((p) => ({
    id: p.id, slug: p.slug, name: p.name, summary: p.summary, categoryId: p.category_id,
    priceFrom: Math.min(...(p.product_variants as { price: number; active: boolean }[]).filter((v) => v.active).map((v) => v.price)),
    chakras: (p.energy_card_id && chakras.get(p.energy_card_id)) || [],
  }));
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("shop", `product:${slug}`);
  const db = createPublicClient();
  const { data: p } = await db.schema("shop").from("products").select("id, slug, name, summary, origin, usage, category_id, energy_card_id, ritual_slug, product_variants(id, sku, name, price, active)").eq("slug", slug).eq("status", "published").maybeSingle();
  if (!p) return null;
  const { data: card } = p.energy_card_id ? await db.schema("core").from("energy_cards").select("*").eq("id", p.energy_card_id).maybeSingle() : { data: null };
  const variants = (p.product_variants as { id: string; sku: string; name: string; price: number; active: boolean }[]).filter((v) => v.active);
  return {
    id: p.id, slug: p.slug, name: p.name, summary: p.summary, categoryId: p.category_id, origin: p.origin, usage: p.usage, ritualSlug: p.ritual_slug,
    priceFrom: Math.min(...variants.map((v) => v.price)), chakras: (card?.chakras as string[]) ?? [], energy: toEnergy(card), variants,
  };
}

export async function getRitual(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("shop", `ritual:${slug}`);
  const { data } = await createPublicClient().schema("shop").from("ritual_contents").select("slug, title, intro, steps, video_url, updated_at").eq("slug", slug).eq("status", "published").maybeSingle();
  return data as { slug: string; title: string; intro: string; steps: { title: string; text: string }[]; video_url: string | null; updated_at: string } | null;
}
