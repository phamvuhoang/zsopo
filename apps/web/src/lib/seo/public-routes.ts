import "server-only";
import { listPosts, listBlogCategories } from "@/features/content/queries";
import { listCategories, listProducts } from "@/features/shop/queries";
import { getLocation, listRooms } from "@/features/stay/queries";
import { listPublishedPolicies } from "@/lib/content";

export type PublicRoute = { path: string; title: string; lastModified?: string };

/** Registry of indexable public URLs (published content only). Used by sitemap.xml and llms.txt. */
export async function publicRoutes(): Promise<PublicRoute[]> {
  const loc = await getLocation("da-lat");
  const [policies, posts, blogCats, rooms, products, cats] = await Promise.all([
    listPublishedPolicies(), listPosts(), listBlogCategories(), loc ? listRooms(loc.id) : [], listProducts(), listCategories(),
  ]);
  return [
    { path: "/", title: "Trang chủ ZSOPO" },
    { path: "/gioi-thieu", title: "Giới thiệu ZSOPO" },
    { path: "/lien-he", title: "Liên hệ" },
    { path: "/stay", title: "ZSOPO Space" },
    { path: "/stay/da-lat", title: "Zen Homestay Đà Lạt" },
    { path: "/stay/da-lat/phong", title: "Phòng tại Zen Homestay Đà Lạt" },
    ...rooms.map((r) => ({ path: `/stay/da-lat/phong/${r.slug}`, title: `Phòng ${r.name}` })),
    { path: "/dich-vu/da-lat", title: "Dịch vụ tại Zen Homestay Đà Lạt" },
    { path: "/handbook/da-lat", title: "Cẩm nang lưu trú" },
    { path: "/shop", title: "Shop năng lượng" },
    ...cats.map((c) => ({ path: `/shop/danh-muc/${c.slug}`, title: c.name })),
    ...products.map((p) => ({ path: `/shop/${p.slug}`, title: p.name })),
    { path: "/blog", title: "Blog" },
    ...blogCats.map((c) => ({ path: `/blog/danh-muc/${c.slug}`, title: c.name })),
    ...posts.map((p) => ({ path: `/blog/${p.slug}`, title: p.title, lastModified: p.published_at })),
    ...policies.map((p) => ({ path: `/chinh-sach/${p.slug}`, title: p.title })),
  ];
}
