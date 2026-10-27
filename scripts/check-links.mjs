// Fetch every sitemap URL, then every internal link on those pages; fail on non-2xx/3xx (dead-end CTAs).
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
const pages = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
const seen = new Map();
const check = async (url) => {
  if (seen.has(url)) return;
  const res = await fetch(url, { redirect: "manual" });
  seen.set(url, res.status);
  return res;
};
for (const url of pages) {
  const res = await check(url);
  const html = res && res.status < 300 ? await res.text() : "";
  for (const m of html.matchAll(/href="(\/[^"#]*)"/g)) if (!m[1].startsWith("/_next")) await check(BASE + m[1]);
}
const bad = [...seen].filter(([, s]) => s >= 400);
console.log(`check-links: ${seen.size} URLs, ${bad.length} broken`);
for (const [u, s] of bad) console.error(`${s} ${u}`);
process.exit(bad.length ? 1 : 0);
