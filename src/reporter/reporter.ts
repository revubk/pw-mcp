import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { pathToFileURL } from "url";
import { DetailedReportData, RunHistoryRecord } from "../types/audit";
import { generateDashboardHtml } from "./templates";

export function generateHistoricReportsHub(
  currentRunData: DetailedReportData,
): void {
  let hostName = "default_domain";
  try {
    hostName = new URL(currentRunData.targetUrl).hostname.replace(
      /[^a-z0-9]/gi,
      "_",
    );
  } catch (_) {}

  const reportsDir = path.join(process.cwd(), "reports", hostName);
  const databasePath = path.join(reportsDir, "history_database.json");
  const indexDashboardPath = path.join(reportsDir, "index.html");
  const uniqueReportName = `report_${currentRunData.runId}.html`;
  const uniqueReportPath = path.join(reportsDir, uniqueReportName);

  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const totalSeoScoresSum = currentRunData.pages.reduce(
    (sum, p) => sum + (p.seoScore || 0),
    0,
  );
  const calculatedAverageSeoScore =
    currentRunData.pages.length > 0
      ? Math.round(totalSeoScoresSum / currentRunData.pages.length)
      : 100;

  let historyList: RunHistoryRecord[] = [];
  if (fs.existsSync(databasePath)) {
    try {
      historyList = JSON.parse(fs.readFileSync(databasePath, "utf8"));
    } catch (_) {
      historyList = [];
    }
  }

  const newHistoryItem: RunHistoryRecord = {
    runId: currentRunData.runId,
    timestamp: currentRunData.timestamp,
    targetUrl: currentRunData.targetUrl,
    deviceMode: currentRunData.deviceMode || "desktop",
    totalScanned: currentRunData.pages.length,
    brokenCount: currentRunData.brokenCount,
    a11yViolations: currentRunData.a11yViolationCount,
    avgSeoScore: calculatedAverageSeoScore,
    reportFilename: uniqueReportName,
  };
  historyList.unshift(newHistoryItem);
  fs.writeFileSync(databasePath, JSON.stringify(historyList, null, 2), "utf8");

  const individualHtml = generateDashboardHtml(currentRunData);

  fs.writeFileSync(uniqueReportPath, individualHtml, "utf8");

  const historyTableRows = historyList
    .map((h) => {
      const seoAlertColor =
        h.avgSeoScore < 100
          ? "color: #ca8a04; font-weight: 600;"
          : "color: #16a34a; font-weight: 600;";
      const clearDeviceLabel = h.deviceMode
        ? h.deviceMode.toUpperCase()
        : "DESKTOP";

      return `
      <tr class="clickable-row" data-href="${h.reportFilename}">
          <td style="padding: 16px; font-size: 14px; color: #475569;">${h.timestamp}</td>
          <td style="padding: 16px; font-size: 14px; font-weight: 600; color: #0f172a;">${h.targetUrl}</td>
          <td style="padding: 16px; font-size: 13px; font-weight: 700; color: #2563eb;">${clearDeviceLabel}</td>
          <td style="padding: 16px; font-size: 14px; color: #475569;">${h.totalScanned} pages</td>
          <td style="padding: 16px; font-size: 14px; color: ${h.brokenCount > 0 ? "#dc2626" : "#475569"}; font-weight: ${h.brokenCount > 0 ? "600" : "normal"};">${h.brokenCount}</td>
          <td style="padding: 16px; font-size: 14px; color: ${h.a11yViolations > 0 ? "#dc2626" : "#475569"}; font-weight: ${h.a11yViolations > 0 ? "600" : "normal"};">${h.a11yViolations}</td>
          <td style="padding: 16px; font-size: 14px; ${seoAlertColor}">${h.avgSeoScore}/100</td>
      </tr>`;
    })
    .join("");

  let incompleteBlock = "";
  if (
    currentRunData.incompletePages &&
    currentRunData.incompletePages.length > 0
  ) {
    const items = currentRunData.incompletePages
      .map(
        (url) =>
          `<li style="margin-bottom: 4px; font-family: monospace; font-size: 13px; color: #9a3412;">${url}</li>`,
      )
      .join("");

    incompleteBlock = `
      <div style="background: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 10px 0; color: #ea580c; font-size: 14px;">⚠️ Run Interrupted — Incomplete Queue Pages Remaining (${currentRunData.incompletePages.length}):</h4>
        <ul style="margin: 0; padding-left: 20px;">${items}</ul>
      </div>`;
  }

  const masterDashboardHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Automation Run Matrix History Hub</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f8fafc; color: #1e293b; padding: 50px; margin: 0; }
        .wrapper { max-width: 1200px; margin: 0 auto; }
        h1 { margin: 0 0 8px 0; color: #0f172a; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
        table { width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        th { background: #f1f5f9; color: #475569; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 16px; text-align: left; border-bottom: 2px solid #e2e8f0; }
        td { padding: 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #475569; }
        .clickable-row { cursor: pointer; transition: background 0.15s; }
        .clickable-row:hover { background: #f8fafc; }
        tr:last-child td { border-bottom: none; }
    </style>
</head>
<body>
    <div class="wrapper">
        <h1>Site Auditor Engine History Hub</h1>
        <p style="color: #64748b; font-size: 15px; margin-top: 0; margin-bottom: 32px;">Domain-Isolated Dashboard Network tracking regression metrics for target host environment: <strong style="color: #0f172a;">${hostName}</strong></p>
        <table>
            <thead>
                <tr>
                    <th>Execution Date & Time</th>
                    <th>Target Destination Website</th>
                    <th>Device Emulated</th>
                    <th>Pages Crawled</th>
                    <th>P1 Broken Links</th>
                    <th>A11y Violations (P2)</th>
                    <th>Technical SEO Metrics</th>
                </tr>
            </thead>
            <tbody>
                ${historyTableRows}
            </tbody>
        </table>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const rows = document.querySelectorAll('.clickable-row');
            rows.forEach(function(row) {
                row.addEventListener('click', function() {
                    const destination = this.getAttribute('data-href');
                    if (destination) { window.location.href = destination; }
                });
            });
        });
    </script>
</body>
</html>`;
  fs.writeFileSync(indexDashboardPath, masterDashboardHtml, "utf8");

  const browserUrl = pathToFileURL(indexDashboardPath).href;
  console.log(`\n📊 Launching Cleaned Light Dashboard View: ${browserUrl}`);

  const command =
    process.platform === "win32"
      ? `start ""`
      : process.platform === "darwin"
        ? "open"
        : "xdg-open";
  exec(`${command} "${browserUrl}"`);
}
