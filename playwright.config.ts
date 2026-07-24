import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import * as path from "path";

export default defineConfig({
  testDir: "tests",

  testMatch: "**/*.{spec,test}.ts",

  timeout: 30 * 1000,

  updateSnapshots: "missing",

  snapshotDir: "reports/baselines",

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
      pathTemplate: "reports/baselines/{testFileName}-snapshots/{arg}.png",
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
