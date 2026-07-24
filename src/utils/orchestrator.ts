import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { WebCrawler } from "../crawler/crawler";
import { generateHistoricReportsHub } from "../reporter/reporter";
import { generateDashboardHtml } from "../reporter/templates";
import {
  DetailedReportData,
  PageAuditResult,
  DeviceFormFactor,
} from "../types/audit";
import { executeParallelAudits } from "./pipeline/taskRunner";
import { backfillIncompletePages } from "./pipeline/dataBackfill";
import { injectVisualColorsChart } from "./pipeline/canvasInject";
import { executeAutonomousMcpAgent } from "./pipeline/mcpClient";
import { runVisualAudit } from "../auditors/visual";

export async function executeSiteAudit(
  targetSite: string,
  scanA11y: boolean,
  scanSeo: boolean,
  scanVisual: boolean,
  headless: boolean,
  deviceMode: DeviceFormFactor,
  pageCapValue: number,
  runMcpAgent: boolean,
): Promise<void> {
  const runId = Math.random().toString(36).substring(2, 7).toUpperCase();
  const hostName = new URL(targetSite).hostname.replace(/[^a-z0-9]/gi, "_");
  const reportDir = path.join(process.cwd(), "reports", hostName);

  // Ensure the specific host report directory exists before writing to it
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  console.log(
    "\n========================================================================",
  );
  console.log(
    `🚀 AUTONOMOUS TEST GENERATION AND REGRESSION TOOL [RUN ID: ${runId}]`,
  );
  console.log(`🎯 Target Platform  : ${targetSite}`);
  console.log(`📱 Device Emulation : ${deviceMode.toUpperCase()}`);
  console.log(
    "========================================================================\n",
  );

  const crawler = new WebCrawler(targetSite);
  const structuredPagesList: PageAuditResult[] = [];
  let aggregateA11yIssues = 0;
  let wasInterrupted = false;

  const handleInterrupt = (): void => {
    if (!wasInterrupted) {
      console.log(
        "\n\n⚠️  [USER TERMINATION] Compiling structural metrics data...",
      );
      wasInterrupted = true;
      crawler.stopGracefully();
    }
  };
  process.on("SIGINT", handleInterrupt);

  let executionSummary: any[] = [];
  try {
    executionSummary = await crawler.startCrawl(
      headless,
      runId,
      deviceMode,
      pageCapValue,
      async (page, url, statusCode, currentProgress, calculatedTotal) => {
        let a11yErrorsOnPage = 0;
        let seoScoreOnPage = 100;
        let pageA11yDetails: any[] = [];
        let pageSeoDetails: string[] = [];
        let pageSeoPassDetails: string[] = [];
        let screenshotPath: string | undefined = undefined;
        let visualResults: any[] = [];

        if (statusCode < 400) {
          const audits = await executeParallelAudits(
            page,
            url,
            scanA11y,
            scanSeo,
            deviceMode,
          );

          a11yErrorsOnPage = audits.a11yErrorsOnPage;
          pageA11yDetails = audits.pageA11yDetails;
          seoScoreOnPage = audits.seoScoreOnPage;
          pageSeoDetails = audits.pageSeoDetails;
          pageSeoPassDetails = audits.pageSeoPassDetails;
          aggregateA11yIssues += a11yErrorsOnPage;

          if (runMcpAgent) {
            console.log(
              `🤖 [MCP AGENT] Spawning background automation script compiler for: ${url}`,
            );
            const activeScriptFile = await executeAutonomousMcpAgent(page, url);
            if (activeScriptFile) {
              console.log(
                `   💾 Automated test compiled and saved cleanly to: ${activeScriptFile}`,
              );
            }
          }

          if (scanVisual) {
            visualResults = await runVisualAudit(page, url, reportDir);
          }

          if (scanA11y && a11yErrorsOnPage > 0) {
            await injectVisualColorsChart(page, pageA11yDetails);
            await page.waitForTimeout(1000);

            const fileSafeName = url
              .replace(/[^a-z0-9]/gi, "_")
              .toLowerCase()
              .substring(0, 40);
            const imgFilename = `screenshots/map_${runId}_${fileSafeName}.png`;
            const fullImgPath = path.join(reportDir, imgFilename);

            if (!fs.existsSync(path.dirname(fullImgPath))) {
              fs.mkdirSync(path.dirname(fullImgPath), { recursive: true });
            }

            await page.screenshot({
              path: fullImgPath,
              fullPage: true,
              animations: "disabled",
            });
            screenshotPath = imgFilename;
          }
        } else {
          pageSeoDetails = [
            `Functional Failure Node: Server error [HTTP ${statusCode}].`,
          ];
          pageA11yDetails = [];
          pageSeoPassDetails = [];
        }

        const statusIndicator = statusCode >= 400 ? "❌ FAIL" : "✅ PASS";
        const a11yIndicator = scanA11y
          ? a11yErrorsOnPage > 0
            ? `⚠️ ${a11yErrorsOnPage} Flags`
            : "Clear"
          : "Disabled";
        const seoIndicator = scanSeo
          ? seoScoreOnPage === 100
            ? "Optimal"
            : `⚠️ ${seoScoreOnPage}/100`
          : "Disabled";

        console.log(
          `[Running: ${currentProgress}/${calculatedTotal}] ${statusIndicator} | HTTP ${statusCode} | Accessibility: ${a11yIndicator} | SEO: ${seoIndicator}`,
        );
        console.log(`   🔗 Path: ${url}\n`);

        structuredPagesList.push({
          url,
          status: statusCode,
          a11yErrors: a11yErrorsOnPage,
          seoScore: seoScoreOnPage,
          a11yDetails: pageA11yDetails,
          seoDetails: pageSeoDetails,
          seoPassDetails: pageSeoPassDetails,
          screenshotPath,
          visualResults,
        });

        return { a11yErrors: a11yErrorsOnPage, seoScore: seoScoreOnPage };
      },
    );
  } catch (err) {
    console.error("Pipeline orchestrator root exception:", err);
  } finally {
    process.off("SIGINT", handleInterrupt);
  }

  backfillIncompletePages(
    executionSummary,
    structuredPagesList,
    wasInterrupted,
  );

  // =========================================================================
  // THE BRIDGE: Trigger Playwright Native Visual Engine
  // =========================================================================

  const discoveredUrls = structuredPagesList.map((p) => p.url);
  const reportsGlobalDir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(reportsGlobalDir)) {
    fs.mkdirSync(reportsGlobalDir, { recursive: true });
  }
  const lastCrawlPath = path.join(reportsGlobalDir, "last_crawled_urls.json");
  fs.writeFileSync(
    lastCrawlPath,
    JSON.stringify(discoveredUrls, null, 2),
    "utf8",
  );

  // 1. Execute Playwright programmatically
  console.log("\n📸 Firing Playwright Native Visual Regression Suite...");
  let playwrightPassed = true;
  try {
    execSync("npx playwright test tests/visual.spec.ts --reporter=html", {
      stdio: "inherit",
      timeout: 300000,
      env: {
        ...process.env,
        CI: "true",
        DEVICE_MODE: deviceMode,
      },
    });
    console.log("   ✅ Visual Engine complete. No layout shifts detected.");
  } catch (e) {
    playwrightPassed = false;
    console.log("   ⚠️ Visual diffs or test failures detected!");
  }

  // 2. Read the JSON bridge file created by tests/visual.spec.ts
  let visualData: any[] = [];
  const bridgePath = path.join(reportsGlobalDir, "visual_bridge.json");
  if (fs.existsSync(bridgePath)) {
    try {
      visualData = JSON.parse(fs.readFileSync(bridgePath, "utf8"));
    } catch (err) {
      console.warn("Could not parse visual_bridge.json");
    }
  }

  // 3. Update the Knowledge Ledger based on run results
  const ledgerPath = path.join(reportsGlobalDir, "knowledge_ledger.json");
  let knowledgeLedger: Record<string, string> = {};
  if (fs.existsSync(ledgerPath)) {
    try {
      knowledgeLedger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
    } catch (err) {}
  }

  structuredPagesList.forEach((page) => {
    const vMatch = visualData.find((v) => v.url === page.url);
    if (vMatch && vMatch.status === "failed") {
      knowledgeLedger[page.url] =
        "Warning: Visual layout shift or interaction failure detected on previous run. Adjust selectors or verify element stability.";
    } else {
      knowledgeLedger[page.url] =
        "Verified: Page structure and visual baselines stable on last execution.";
    }
  });

  fs.writeFileSync(
    ledgerPath,
    JSON.stringify(knowledgeLedger, null, 2),
    "utf8",
  );
  console.log(`   📝 Knowledge ledger updated successfully at: ${ledgerPath}`);

  // 4. Merge visual results into main page objects
  const finalPagesWithVisuals = structuredPagesList.map((page) => {
    const visualMatch = visualData.find((v) => v.url === page.url);
    return {
      ...page,
      visualResults: visualMatch || { status: "passed" },
    };
  });

  // 5. Build the final report payload
  const finalReportData: DetailedReportData = {
    runId: runId,
    targetUrl: targetSite,
    timestamp: new Date().toLocaleString(),
    deviceMode: deviceMode,
    brokenCount: finalPagesWithVisuals.filter((r) => r.status >= 400).length,
    a11yViolationCount: aggregateA11yIssues,
    pages: finalPagesWithVisuals,
    incompletePages: crawler.queue,
  };

  // 6. Generate the HTML report & save to the specific host directory
  const dashboardHtml = generateDashboardHtml(finalReportData);
  const reportPath = path.join(reportDir, `run_${runId}.html`);
  fs.writeFileSync(reportPath, dashboardHtml, "utf8");

  // 7. Update the history index
  generateHistoricReportsHub(finalReportData);
}
