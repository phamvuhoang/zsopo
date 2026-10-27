import { expect, test } from "@playwright/test";

const ld = (html: string) => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]!));
const types = (html: string) => ld(html).flatMap((j) => (j["@graph"] ?? [j]).map((x: { "@type": string }) => x["@type"]));

test("HTML không JS có JSON-LD đúng loại và đúng một canonical", async ({ request }) => {
  const cases: [string, string][] = [
    ["/", "Organization"], ["/blog/thien-buoi-sang-giua-doi-thong", "Article"], ["/stay/da-lat", "LodgingBusiness"],
    ["/stay/da-lat/phong/thach-anh-hong", "HotelRoom"], ["/shop/vong-tay-thach-anh-hong-8-ly", "Product"],
  ];
  for (const [path, type] of cases) {
    const html = await (await request.get(path)).text();
    expect(types(html), path).toContain(type);
    expect(html.match(/<link rel="canonical"/g)?.length, path).toBe(1);
    expect(html).toMatch(new RegExp(`<link rel="canonical" href="http://localhost:3100${path === "/" ? "" : path}"`));
  }
});

test("JSON-LD không có đánh giá/sao bịa và escape < trong dữ liệu", async ({ request }) => {
  const html = await (await request.get("/shop/vong-tay-thach-anh-hong-8-ly")).text();
  expect(html).not.toMatch(/aggregateRating|"review"/);
  for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) expect(m[1]).not.toContain("<");
});

test("sitemap chỉ có trang công khai đã đăng, không có trang riêng tư", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).toContain("http://localhost:3100/blog/thien-buoi-sang-giua-doi-thong");
  expect(xml).toContain("http://localhost:3100/stay/da-lat/phong/thach-anh-hong");
  expect(xml).toContain("http://localhost:3100/chinh-sach/bao-mat");
  expect(xml).not.toMatch(/\/(ops|admin|dat-phong|don-hang|gio-hang|thanh-toan|api|auth|tim-kiem|la)\b/);
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]!);
  expect(locs.filter((l) => /token|\?/.test(l))).toEqual([]);
});

test("robots chặn khu riêng tư; llms.txt chỉ có link công khai trả 200", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  for (const p of ["/ops", "/admin", "/api", "/dat-phong/", "/don-hang/"]) expect(robots).toContain(`Disallow: ${p}`);
  expect(robots).toContain("Sitemap: http://localhost:3100/sitemap.xml");
  const llms = await (await request.get("/llms.txt")).text();
  expect(llms.startsWith("# ZSOPO")).toBe(true);
  const links = [...llms.matchAll(/\((http:\/\/localhost:3100[^)]*)\)/g)].map((m) => m[1]!);
  expect(links.length).toBeGreaterThan(5);
  for (const l of links) {
    expect(l).not.toMatch(/ops|admin|dat-phong|don-hang|token/);
    expect((await request.get(l)).status(), l).toBe(200);
  }
});

test("trang riêng tư noindex và no-store", async ({ request }) => {
  for (const p of ["/dat-phong/ABC123/thanh-toan", "/don-hang/ABC123", "/gio-hang", "/admin", "/dang-nhap"]) {
    const res = await request.get(p, { maxRedirects: 0 });
    const html = await res.text();
    const noindex = /noindex/.test(res.headers()["x-robots-tag"] ?? "") || /<meta name="robots" content="[^"]*noindex/.test(html);
    expect(noindex, p).toBe(true);
  }
});
