import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/stay/da-lat/phong/thach-anh-hong", "/shop/vong-tay-thach-anh-hong-8-ly", "/blog/thien-buoi-sang-giua-doi-thong", "/dat-phong?phong=thach-anh-hong", "/lien-he", "/dang-nhap"];

for (const path of PAGES) {
  for (const theme of ["light", "dark"] as const) {
    test(`axe WCAG A/AA không lỗi nghiêm trọng: ${path} (${theme})`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("zs-theme", t), theme);
      await page.goto(path);
      await page.getByRole("heading", { level: 1 }).first().waitFor();
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
    });
  }
}
