// Shared staff sign-in for e2e, including the TOTP step for sensitive actions (bank transfers, refunds).
import { createHmac } from "node:crypto";
import { expect, type Page } from "@playwright/test";

/** Secret of the fixed verified TOTP factor seeded for le-tan@ and tai-chinh@ in supabase/seed.sql (LOCAL ONLY). */
export const E2E_TOTP_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const base32 = (s: string) => {
  const bits = [...s.replace(/=+$/, "").toUpperCase()].map((c) => B32.indexOf(c).toString(2).padStart(5, "0")).join("");
  return Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));
};

/** RFC 6238 TOTP: HMAC-SHA1, 30 s step, 6 digits. */
export function totp(secretBase32: string, atMs = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(atMs / 30_000)));
  const h = createHmac("sha1", base32(secretBase32)).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  const n = ((h[o]! & 0x7f) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!;
  return String(n % 1_000_000).padStart(6, "0");
}

/** Signs in a seeded staff user; with `mfa` also completes /auth/mfa using the seeded TOTP (the page must send the user there, e.g. via `next`). */
export async function staffLogin(page: Page, email: string, opts: { mfa?: boolean; next?: string } = {}): Promise<void> {
  await page.goto(opts.next ? `/dang-nhap?next=${encodeURIComponent(opts.next)}` : "/dang-nhap");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("zsopo-local-1");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  if (opts.mfa) {
    await page.waitForURL(/\/auth\/mfa/);
    const confirm = page.getByRole("button", { name: "Xác nhận" });
    await expect(confirm).toBeEnabled(); // enabled once the form hydrated and loaded the verified factor
    await page.getByLabel("Mã 6 số").fill(totp(E2E_TOTP_SECRET));
    await confirm.click();
  }
}
