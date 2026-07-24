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
  const urlMatch = testInfo.title.match(/Visual Diff:\s*(.+?)\s+on/i);
  const url = urlMatch ? urlMatch[1] : "Unknown URL";

  const isNewBaseline =
    testInfo.error?.message?.includes("A snapshot doesn't exist") ||
    testInfo.error?.message?.includes("A snapshot doesn't exist at") ||
    testInfo.annotations.some(
      (annotation) =>
        annotation.type === "visual-baseline" &&
        annotation.description === "created",
    );

  const expected = testInfo.attachments.find((a) =>
    a.name.includes("expected"),
  )?.path;
  const diff = testInfo.attachments.find((a) => a.name.includes("diff"))?.path;

  if (testInfo.status !== "passed" && !isNewBaseline) {
    visualResults.push({
      url,
      status: "failed",
      expectedPath: expected ? path.relative(process.cwd(), expected) : null,
      diffPath: diff ? path.relative(process.cwd(), diff) : null,
    });
  } else if (isNewBaseline) {
    visualResults.push({
      url,
      status: "new_baseline",
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
    test(`Visual Diff: ${url} on ${device.name}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({
        width: device.width,
        height: device.height,
      });
      await page.goto(url, { waitUntil: "networkidle" });

      const safeName = url.replace(/[^a-z0-9]/gi, "_").substring(0, 60);
      const snapshotName = `${safeName}-${device.name}.png`;
      const snapshotPath = path.join(
        process.cwd(),
        "reports",
        "baselines",
        "visual.spec.ts-snapshots",
        snapshotName,
      );

      try {
        await expect(
          page,
          `Visual diff should not be found for ${snapshotName}`,
        ).toHaveScreenshot(snapshotName, {
          fullPage: true,
          timeout: 15000,
        });
      } catch (error: any) {
        const isMissingBaseline =
          error?.message?.includes("A snapshot doesn't exist") ||
          error?.message?.includes("A snapshot doesn't exist at");

        if (isMissingBaseline) {
          if (!fs.existsSync(path.dirname(snapshotPath))) {
            fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
          }
          await page.screenshot({
            path: snapshotPath,
            fullPage: true,
            animations: "disabled",
          });
          testInfo.annotations.push({
            type: "visual-baseline",
            description: "created",
          });
          console.log(
            `🆕 [Visual Engine] Created baseline for ${snapshotName}`,
          );
          return;
        }

        throw error;
      }
    });
  }
});
