import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { setGuestToken } from "@/lib/guest";
import { createPublicClient, visitorIp } from "@/lib/supabase/server";

// Magic link exchange: /api/guest?t=<token>&next=/dat-phong/CODE -> HttpOnly cookie -> clean URL without the token.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  const next = request.nextUrl.searchParams.get("next") ?? "";
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  const { data, error } = await createPublicClient(await visitorIp()).schema("commerce").rpc("exchange_guest_token", { p_token: token });
  if (error || !data) return NextResponse.redirect(new URL("/khong-tim-thay-don", env.siteUrl), { headers });
  const code = (data as { orderCode: string }).orderCode;
  await setGuestToken(code, token);
  const allowed = [`/dat-phong/${code}`, `/don-hang/${code}`];
  const target = allowed.find((p) => next === p || next.startsWith(`${p}/`)) ?? `/dat-phong/${code}`;
  return NextResponse.redirect(new URL(target, env.siteUrl), { headers });
}
