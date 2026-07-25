import { defineConfig, devices } from "@playwright/test";

const testPort = 3100;
const testBaseUrl = `http://127.0.0.1:${testPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "line",
  use: {
    baseURL: testBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `HAVEN_E2E=1 npm run dev -- --hostname 127.0.0.1 --port ${testPort}`,
    url: `${testBaseUrl}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "narrow-browser",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 } },
    },
  ],
});
