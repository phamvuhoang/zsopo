import { defineConfig, devices } from "@playwright/test";

const port = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${port}`, locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    command: `pnpm --filter web exec next ${process.env.CI ? "start" : "dev"} -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
