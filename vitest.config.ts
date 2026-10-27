import { defineConfig } from "vitest/config";

export default defineConfig({
  // Edge Function code imports npm: specifiers (Deno); map them to node_modules for tests.
  resolve: { alias: { "npm:ical.js@2.2.1": "ical.js" } },
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["packages/**/src/**/*.test.ts"],
          env: { TZ: "Asia/Ho_Chi_Minh" },
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          testTimeout: 30_000,
          hookTimeout: 60_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
