// Lab measurement of 5 public templates (median of 3 runs, mobile emulation, cold cache per run).
// Usage: pnpm build && (cd apps/web && pnpm exec next start -p 3100) & BASE_URL=http://localhost:3100 node tests/performance/public-pages.ts
// This is a budget guard, not Lighthouse: official Performance/SEO/A11y scores are measured with Lighthouse on staging from Vietnam.
import { chromium, devices } from "@playwright/test";
import { gzipSync } from "node:zlib";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const PAGES = ["/", "/stay/da-lat/phong/thach-anh-hong", "/shop/vong-tay-thach-anh-hong-8-ly", "/blog/thien-buoi-sang-giua-doi-thong", "/chinh-sach/noi-quy"];
const BUDGET = { lcpMs: 2500, cls: 0.1, jsKb: 180, ttfbMs: 300 };

type Run = { ttfb: number; lcp: number; cls: number; jsKb: number };
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

const browser = await chromium.launch();
let failed = false;
for (const path of PAGES) {
  const runs: Run[] = [];
  for (let i = 0; i < 3; i++) {
    const ctx = await browser.newContext({ ...devices["Pixel 7"] });
    const page = await ctx.newPage();
    let js = 0;
    page.on("response", async (r) => {
      // Budget is gzip size: compress the decoded body ourselves (independent of server compression settings).
      if (r.request().resourceType() === "script") js += gzipSync(await r.body().catch(() => Buffer.alloc(0))).length;
    });
    await page.addInitScript(() => {
      const w = window as unknown as { __lcp: number; __cls: number };
      w.__lcp = 0;
      w.__cls = 0;
      new PerformanceObserver((l) => l.getEntries().forEach((e) => (w.__lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => l.getEntries().forEach((e) => { const s = e as PerformanceEntry & { value: number; hadRecentInput: boolean }; if (!s.hadRecentInput) w.__cls += s.value; })).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      const w = window as unknown as { __lcp: number; __cls: number };
      return { ttfb: nav.responseStart - nav.requestStart, lcp: w.__lcp, cls: w.__cls };
    });
    runs.push({ ...m, jsKb: Math.round(js / 1024) });
    await ctx.close();
  }
  const r = { ttfb: median(runs.map((x) => x.ttfb)), lcp: median(runs.map((x) => x.lcp)), cls: median(runs.map((x) => x.cls)), jsKb: median(runs.map((x) => x.jsKb)) };
  const over = [r.lcp > BUDGET.lcpMs && "LCP", r.cls > BUDGET.cls && "CLS", r.jsKb > BUDGET.jsKb && "JS", r.ttfb > BUDGET.ttfbMs && "TTFB"].filter(Boolean);
  if (over.length) failed = true;
  console.log(`${path.padEnd(42)} TTFB ${Math.round(r.ttfb)}ms  LCP ${Math.round(r.lcp)}ms  CLS ${r.cls.toFixed(3)}  JS ${r.jsKb}KB (gzip)  ${over.length ? "OVER: " + over.join(",") : "ok"}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
