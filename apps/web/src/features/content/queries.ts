import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/server";

export type PostCard = { id: string; slug: string; title: string; excerpt: string; published_at: string; reading_minutes: number; author_name: string; category_id: string | null };
export type Post = PostCard & { body_md: string; cta: { label: string; href: string } | null; updated_at: string; seo: { title?: string; description?: string } };

const CARD = "id, slug, title, excerpt, published_at, reading_minutes, author_name, category_id";

export async function listPosts(): Promise<PostCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("posts");
  const { data } = await createPublicClient().schema("content").from("posts").select(CARD).eq("status", "published").order("published_at", { ascending: false }).limit(200);
  return (data ?? []) as PostCard[]; // published_at is non-null for published posts (DB check)
}

export async function getPost(slug: string): Promise<Post | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("posts", `post:${slug}`);
  const { data } = await createPublicClient().schema("content").from("posts").select(`${CARD}, body_md, cta, updated_at, seo`).eq("slug", slug).eq("status", "published").maybeSingle();
  return data as Post | null;
}

export async function getRedirect(path: string): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("posts");
  const { data } = await createPublicClient().schema("content").from("redirects").select("to_path").eq("from_path", path).maybeSingle();
  return data?.to_path ?? null;
}

export async function listBlogCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag("posts");
  const { data } = await createPublicClient().schema("content").from("categories").select("id, slug, name, description").order("sort");
  return data ?? [];
}

/** Headings (##, ###) for the table of contents; ids match the Markdown renderer. */
export const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const toc = (md: string) => [...md.matchAll(/^(#{2,3})\s+(.+)$/gm)].map((m) => ({ level: m[1]!.length, text: m[2]!.trim(), id: slugify(m[2]!) }));
