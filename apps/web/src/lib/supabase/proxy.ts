import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

const PROTECTED = /^\/(ops|admin)(\/|$)/;
const PRIVATE = /^\/(dat-phong\/[A-Z0-9]+|don-hang|gio-hang|thanh-toan|api\/guest|auth)(\/|$)/;

/** Refresh the Supabase session cookie and send anonymous visitors of /ops, /admin to login. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // getClaims verifies the JWT; do not trust getSession for authorization.
  const { data } = await supabase.auth.getClaims();
  const { pathname, search } = request.nextUrl;
  if (!data?.claims && PROTECTED.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dang-nhap";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("X-Robots-Tag", "noindex, nofollow");
    return redirect;
  }
  if (PROTECTED.test(pathname) || PRIVATE.test(pathname)) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}
