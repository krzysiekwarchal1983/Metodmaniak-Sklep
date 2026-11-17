import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/stock",
  outputDir: "../../generated-artifacts/stock-tests",
  timeout: 45_000,
  expect: { timeout: 12_000 },
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.STOCK_BASE_URL || "http://localhost:80",
    // Service workers must not bypass the API interception safety boundary.
    serviceWorkers: "block",
    launchOptions: { executablePath: process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
});
