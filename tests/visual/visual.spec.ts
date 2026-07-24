import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BRIDGE_FILE_PATH = path.join(
  process.cwd(),
  "reports",
  "visual_bridge.json",
);
let visualResults: any[] = [];

function getTargetUrls(): string[] {
  const discoveredUrlsPath = path.join(
    process.cwd(),
    "reports",
    "last_crawled_urls.json",
  );

  if (fs.existsSync(discoveredUrlsPath)) {
    try {
      const rawData = fs.readFileSync(discoveredUrlsPath, "utf8");
      const urls = JSON.parse(rawData);
      if (Array.isArray(urls) && urls.length > 0) {
        console.log(
          `📸 [Visual Engine] Loaded ${urls.length} URLs from crawler output.`,
        );
        return urls;
      }
    } catch (e) {
      console.warn("⚠️ [Visual Engine] Failed to parse last_crawled_urls.json");
    }
  }
  return [];
}

function getDeviceConfig() {
  const mode = (process.env.DEVICE_MODE || "desktop").toLowerCase();

  if (mode.includes("mobile")) {
    return { name: "mobile", width: 375, height: 667 };
  } else if (mode.includes("tablet")) {
    return { name: "tablet", width: 768, height: 1024 };
  }
  return { name: "desktop", width: 1280, height: 720 };
}

const TARGET_URLS = getTargetUrls();
const device = getDeviceConfig();

test.afterEach(async ({}, testInfo) => {
  const urlMatch = testInfo.title.match(/Visual Diff: (.*) on/);
  const url = urlMatch ? urlMatch[1] : "Unknown URL";

  const isNewBaseline =
    testInfo.error?.message?.includes("A snapshot doesn't exist") ||
    testInfo.error?.message?.includes("A snapshot doesn't exist at");

  if (testInfo.status !== "passed" && !isNewBaseline) {
    const expected = testInfo.attachments.find((a) =>
      a.name.includes("expected"),
    )?.path;
    const diff = testInfo.attachments.find((a) =>
      a.name.includes("diff"),
    )?.path;

    visualResults.push({
      url,
      status: "failed",
      expectedPath: expected ? path.relative(process.cwd(), expected) : null,
      diffPath: diff ? path.relative(process.cwd(), diff) : null,
    });
  } else {
    visualResults.push({ url, status: "passed" });
  }
});

test.afterAll(() => {
  if (!fs.existsSync(path.dirname(BRIDGE_FILE_PATH))) {
    fs.mkdirSync(path.dirname(BRIDGE_FILE_PATH), { recursive: true });
  }
  fs.writeFileSync(
    BRIDGE_FILE_PATH,
    JSON.stringify(visualResults, null, 2),
    "utf8",
  );
  console.log(`   💾 Visual bridge data saved to: ${BRIDGE_FILE_PATH}`);
});

test.describe(`Autonomous Visual Regression Suite (${device.name.toUpperCase()})`, () => {
  for (const url of TARGET_URLS) {
    test(`Visual Diff: ${url} on${device.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: device.width,
        height: device.height,
      });
      await page.goto(url, { waitUntil: "networkidle" });

      const safeName = url.replace(/[^a-z0-9]/gi, "_").substring(0, 60);
      const snapshotName = `${safeName}-${device.name}.png`;

      await expect(
        page,
        `Visual diff should not be found for ${snapshotName}`,
      ).toHaveScreenshot(snapshotName, {
        fullPage: true,
        timeout: 15000,
      });
    });
  }
});
