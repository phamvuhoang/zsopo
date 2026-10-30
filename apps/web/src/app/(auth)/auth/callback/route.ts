import { safeRedirectPath } from "@zsopo/core";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"), "/");
  // Build redirects from the configured SITE_URL, never from the request Host header.
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, env.siteUrl));
  }
  return NextResponse.redirect(new URL("/dang-nhap?loi=lien-ket", env.siteUrl));
}
