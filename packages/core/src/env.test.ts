import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "./env";

const ok = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:55421",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
  NEXT_PUBLIC_SITE_URL: "https://zsopo.vn",
};

describe("parsePublicEnv", () => {
  it("trả cấu hình hợp lệ, bỏ dấu / cuối SITE_URL", () => {
    expect(parsePublicEnv({ ...ok, NEXT_PUBLIC_SITE_URL: "https://zsopo.vn/" }).siteUrl).toBe("https://zsopo.vn");
  });

  it("báo lỗi dễ hiểu liệt kê biến thiếu", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_SITE_URL: "https://zsopo.vn" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL.*NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/s,
    );
  });

  it("từ chối secret elevated lọt vào biến public", () => {
    expect(() => parsePublicEnv({ ...ok, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_abc" })).toThrow(/secret/);
  });
});
