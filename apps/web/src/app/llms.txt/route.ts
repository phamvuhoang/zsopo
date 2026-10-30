import { cacheLife, cacheTag } from "next/cache";
import { env } from "@/lib/env";
import { publicRoutes } from "@/lib/seo/public-routes";

async function body() {
  "use cache";
  cacheLife("hours");
  cacheTag("posts", "rooms", "shop", "pages");
  const routes = await publicRoutes();
  const link = (r: { path: string; title: string }) => `- [${r.title}](${env.siteUrl}${r.path === "/" ? "" : r.path})`;
  const pick = (prefix: string) => routes.filter((r) => r.path.startsWith(prefix));
  return [
    "# ZSOPO",
    "",
    "> ZSOPO là hệ sinh thái nối không gian lưu trú năng lượng (Space), kết nối học tập (Connect) và phụng sự cộng đồng (Give). Điểm đang mở: Zen Homestay Đà Lạt. Nhận phòng 14:00, trả phòng trước 12:00. Đặt phòng giữ chỗ 30 phút, xác nhận khi ZSOPO ghi nhận tiền cọc. Nội dung năng lượng mang tính hỗ trợ tinh thần, không thay thế tư vấn y khoa.",
    "",
    "## Lưu trú",
    ...[...pick("/stay"), ...pick("/handbook"), ...pick("/dich-vu")].map(link),
    "",
    "## Shop",
    ...pick("/shop").slice(0, 40).map(link),
    "",
    "## Bài viết",
    ...pick("/blog/").map(link),
    "",
    "## Chính sách",
    ...pick("/chinh-sach").map(link),
    "",
    "## Khác",
    ...routes.filter((r) => ["/", "/gioi-thieu", "/lien-he"].includes(r.path)).map(link),
    "",
  ].join("\n");
}

export async function GET() {
  return new Response(await body(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
