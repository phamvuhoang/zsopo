import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { publicRoutes } from "@/lib/seo/public-routes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return (await publicRoutes()).map((r) => ({ url: `${env.siteUrl}${r.path === "/" ? "" : r.path}`, ...(r.lastModified ? { lastModified: r.lastModified } : {}) }));
}
