import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

// Staging/preview set NEXT_PUBLIC_NOINDEX=1 (plus access protection); robots is not an access control.
export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_NOINDEX === "1") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/ops", "/admin", "/api", "/auth", "/dat-phong/", "/don-hang/", "/gio-hang", "/thanh-toan", "/dang-nhap", "/tim-kiem"] }],
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
