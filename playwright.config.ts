import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import * as path from "path";

export default defineConfig({
  testDir: "tests",

  testMatch: "**/*.{spec,test}.ts",

  timeout: 30 * 1000,

  updateSnapshots: "missing",

  snapshotDir: path.join(process.cwd(), "reports", "baselines"),

  expect: {
    toHaveScreenshot: {
      pathTemplate: "{snapshotDir}/{arg}-{ext}",
    },
  },

  fullyParallel: true,

  reporter: [["html", { open: "always" }]],

  use: {
    trace: "off",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
