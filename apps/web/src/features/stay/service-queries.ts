import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";

export type PublicService = {
  id: string; slug: string; name: string; description: string; group_key: "food" | "transport" | "experience" | "flex";
  unit: string; price: number; lead_time_min: number; serve_from: string; serve_to: string; prebook_discount_bp: number;
};

export const SERVICE_GROUPS = { food: "Ẩm thực", transport: "Di chuyển", experience: "Trải nghiệm", flex: "Tiện ích linh hoạt" } as const;

export async function listServices(locationId: string): Promise<PublicService[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("services");
  const { data } = await createPublicClient().schema("stay").from("services")
    .select("id, slug, name, description, group_key, unit, price, lead_time_min, serve_from, serve_to, prebook_discount_bp")
    .eq("location_id", locationId).eq("active", true).order("sort");
  return (data ?? []) as PublicService[];
}

export const leadLabel = (min: number) => (min >= 1440 ? `${Math.round(min / 1440)} ngày` : min >= 60 ? `${Math.round(min / 60)} giờ` : `${min} phút`);
