import { createClient } from "@supabase/supabase-js";
import type { Database } from "@zsopo/db";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  const match = request.nextUrl.pathname.match(/^\/(chinh-sach|stay\/da-lat\/phong)\/([^/]+)\/?$/);
  if (!match) return response;

  // Cache Components streams unknown params after sending the static shell.
  // Check only existence here so a missing resource gets HTTP 404 before streaming.
  // Always use anon visibility, including when a staff member browses public pages.
  const db = createClient<Database>(env.supabaseUrl, env.supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let slug: string;
  try { slug = decodeURIComponent(match[2]); } catch { slug = ""; }
  const results = match[1] === "chinh-sach"
    ? [await db.schema("content").from("pages").select("id").eq("slug", slug).eq("kind", "policy").eq("status", "published").maybeSingle()]
    : await Promise.all([
      db.schema("stay").from("rooms").select("id").eq("slug", slug).eq("status", "published").maybeSingle(),
      db.schema("core").from("locations").select("id").eq("slug", "da-lat").eq("status", "active").maybeSingle(),
    ]);
  if (results.some((r) => r.error)) return new NextResponse("Tạm thời không tải được trang. Vui lòng thử lại.", { status: 503, headers: { "Cache-Control": "no-store" } });
  if (results.every((r) => r.data)) return response;
  const missing = NextResponse.rewrite(new URL("/khong-tim-thay", request.url), { status: 404 });
  missing.headers.set("Cache-Control", "no-store");
  for (const cookie of response.cookies.getAll()) missing.cookies.set(cookie);
  return missing;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|webp|mp4|ico)$).*)"],
};
