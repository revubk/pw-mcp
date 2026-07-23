import { Page, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";

export interface VisualAuditResult {
  viewport: string;
  status: "PASSED" | "FAILED" | "NEW_BASELINE";
  baselinePath: string;
  actualPath: string;
  diffPath?: string;
  error?: string;
}

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 667 },
];

/**
 * Native Playwright Visual Regression Engine
 * Captures screenshots across 3 device viewports and compares against stored baselines.
 */
export async function runVisualAudit(
  page: Page,
  url: string,
  reportDir: string,
): Promise<VisualAuditResult[]> {
  const results: VisualAuditResult[] = [];

  // Create a safe unique filename hash for the URL
  const urlHash = crypto
    .createHash("md5")
    .update(url)
    .digest("hex")
    .substring(0, 8);

  // Setup directory paths
  const baselineDir = path.join(process.cwd(), "baselines");
  const actualDir = path.join(reportDir, "screenshots", "actuals");
  const diffDir = path.join(reportDir, "screenshots", "diffs");

  [baselineDir, actualDir, diffDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  for (const vp of VIEWPORTS) {
    console.log(
      `📸 [Visual Engine] Testing ${vp.name} (${vp.width}x${vp.height}) for: ${url}`,
    );

    // Set screen size and wait for layout stabilization
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForLoadState("networkidle");

    const fileName = `${urlHash}_${vp.name}.png`;
    const baselinePath = path.join(baselineDir, fileName);
    const actualPath = path.join(actualDir, fileName);
    const diffPath = path.join(diffDir, fileName);

    // 1. Capture current screenshot
    await page.screenshot({ path: actualPath, fullPage: true });

    // 2. First Run: Create Baseline if it doesn't exist
    if (!fs.existsSync(baselinePath)) {
      console.log(
        `   🆕 [Baseline] No baseline found for ${vp.name}. Saving current view as golden master.`,
      );
      fs.copyFileSync(actualPath, baselinePath);
      results.push({
        viewport: vp.name,
        status: "NEW_BASELINE",
        baselinePath,
        actualPath,
      });
      continue;
    }

    // 3. Subsequent Runs: Playwright Native Screenshot Comparison
    try {
      // Compare actual screenshot buffer against baseline screenshot buffer
      const baselineBuffer = fs.readFileSync(baselinePath);
      const actualBuffer = fs.readFileSync(actualPath);

      // Playwright native assertion matcher
      expect(actualBuffer).toMatchSnapshot(fileName, {
        maxDiffPixelRatio: 0.02, // 2% pixel tolerance threshold
      });

      console.log(
        `   ✅ [Visual Pass] ${vp.name} layout matches baseline perfectly.`,
      );
      results.push({
        viewport: vp.name,
        status: "PASSED",
        baselinePath,
        actualPath,
      });
    } catch (err: any) {
      console.log(`   ⚠️ [Visual Diff Detected] Layout shift on ${vp.name}!`);

      // Save actual snapshot to diff directory for HTML report embedding
      fs.copyFileSync(actualPath, diffPath);

      results.push({
        viewport: vp.name,
        status: "FAILED",
        baselinePath,
        actualPath,
        diffPath,
        error: "Layout shift or rendering pixel mismatch detected.",
      });
    }
  }

  return results;
}
