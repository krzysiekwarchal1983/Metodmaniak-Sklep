import { defineConfig, devices } from "@playwright/test";

// Use the shared proxy, not Vite/API ports. Workflows must already be running.
export default defineConfig({
  testDir: "./tests/catalog",
  outputDir: "../../generated-artifacts/catalog-tests",
  timeout: 45_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.CATALOG_BASE_URL || "http://localhost:80",
    launchOptions: {
      // Replit provides a Nix-compatible browser; CI can use Playwright's default.
      executablePath: process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "api", testMatch: "products.api.spec.ts" },
    {
      name: "desktop",
      testMatch: "shop.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "phone",
      testMatch: "shop.spec.ts",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
});
