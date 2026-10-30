import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

// In-room handover link (front desk QR/card): /api/stay?k=<stay token> -> HttpOnly cookie -> clean menu URL.
export async function GET(request: NextRequest) {
  const k = request.nextUrl.searchParams.get("k") ?? "";
  const res = NextResponse.redirect(new URL("/dich-vu/da-lat", env.siteUrl), { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  if (k.length >= 32) {
    (await cookies()).set("zs_stay", k, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 14 * 24 * 3600 });
  }
  return res;
}
