import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";

export type PublicPage = { slug: string; title: string; excerpt: string; body_md: string; kind: string; updated_at: string };
export type SiteContact = { name: string; address: string | null; phone: string | null; email: string | null; zalo: string | null; mapsUrl: string | null };

export async function getPublishedPage(slug: string): Promise<PublicPage | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`page:${slug}`);
  const { data } = await createPublicClient()
    .schema("content")
    .from("pages")
    .select("slug, title, excerpt, body_md, kind, updated_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data;
}

export async function listPublishedPolicies(): Promise<Pick<PublicPage, "slug" | "title">[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("pages");
  const { data } = await createPublicClient().schema("content").from("pages").select("slug, title").eq("kind", "policy").eq("status", "published").order("title");
  return data ?? [];
}

export async function getSiteContact(): Promise<SiteContact | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("settings");
  const { data } = await createPublicClient().schema("ops_config").from("runtime_settings").select("value").eq("key", "site.contact").maybeSingle();
  return (data?.value as SiteContact | undefined) ?? null;
}
