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
          <td data-label="Pages" style="padding: 16px; font-size: 14px; color: #475569;">${h.totalScanned} pages</td>
          <td data-label="Broken" style="padding: 16px; font-size: 14px; color: ${h.brokenCount > 0 ? "#dc2626" : "#475569"}; font-weight: ${h.brokenCount > 0 ? "600" : "normal"};">${h.brokenCount}</td>
          <td data-label="A11y" style="padding: 16px; font-size: 14px; color: ${h.a11yViolations > 0 ? "#dc2626" : "#475569"}; font-weight: ${h.a11yViolations > 0 ? "600" : "normal"};">${h.a11yViolations}</td>
          <td data-label="SEO" style="padding: 16px; font-size: 14px; ${seoAlertColor}">${h.avgSeoScore}/100</td>
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
        :root {
            --bg: #e6f2dd;
            --surface: #ffffff;
            --text: #1f2937;
            --muted: #4b5563;
            --accent: #659287;
            --accent-soft: #88bda4;
            --border: #d9e7d4;
            --success: #2f855a;
            --warning: #d69e2e;
            --danger: #c53030;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            background: linear-gradient(180deg, var(--bg) 0%, #f8fafc 100%);
            color: var(--text);
            padding: 40px;
            margin: 0;
        }

        .wrapper {
            max-width: 1180px;
            margin: 0 auto;
        }

        .hero {
            background: #f2f7ef;
            border: 1px solid rgba(101, 146, 135, 0.28);
            border-radius: 24px;
            padding: 28px 32px;
            margin-bottom: 28px;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
        }

        h1 {
            margin: 0;
            color: var(--text);
            font-size: 32px;
            font-weight: 800;
            letter-spacing: -0.6px;
        }

        .hero p {
            margin: 12px 0 0;
            color: var(--muted);
            font-size: 15px;
            line-height: 1.6;
        }

        .hero strong {
            color: var(--text);
            font-weight: 700;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            background: var(--surface);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
            border: 1px solid rgba(101, 146, 135, 0.18);
        }

        thead tr {
            background: linear-gradient(90deg, var(--accent-soft), #ffffff);
        }

        th {
            color: #2f4858;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            padding: 18px 20px;
            text-align: left;
            border-bottom: 1px solid rgba(101, 146, 135, 0.15);
        }

        td {
            padding: 18px 20px;
            border-bottom: 1px solid rgba(101, 146, 135, 0.10);
            font-size: 14px;
            color: var(--text);
        }

        tbody tr {
            transition: transform 0.2s, background 0.2s;
        }

        .clickable-row {
            cursor: pointer;
        }

        .clickable-row:hover {
            background: rgba(136, 189, 164, 0.16);
            transform: translateY(-1px);
        }

        td:nth-child(3) {
            color: var(--accent);
            font-weight: 700;
        }

        td:nth-child(5), td:nth-child(6), td:nth-child(7) {
            font-weight: 600;
        }

        .status-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 72px;
            padding: 6px 10px;
            border-radius: 999px;
            color: var(--surface);
            font-size: 12px;
            font-weight: 700;
        }

        .status-broken { background: rgba(197, 48, 48, 0.12); color: var(--danger); }
        .status-fixed { background: rgba(47, 133, 90, 0.12); color: var(--success); }

        @media (max-width: 980px) {
            body { padding: 24px; }
            .hero { padding: 24px; }
            th, td { padding: 14px 16px; }
        }

        @media (max-width: 720px) {
            .wrapper { padding: 0 12px; }
            table, thead, tbody, th, td, tr { display: block; }
            thead { display: none; }
            tr { margin-bottom: 18px; border-radius: 18px; overflow: hidden; background: var(--surface); box-shadow: 0 18px 30px rgba(15, 23, 42, 0.06); }
            td { display: flex; justify-content: space-between; padding: 14px 16px; border-bottom: none; }
            td::before { content: attr(data-label); color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 14px; flex: 1; }
            td:last-child { border-bottom: 0; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="hero">
            <h1>History Hub</h1>
            <p>Dashboard target host: <strong>${hostName}</strong></p>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Date & Time</th>
                    <th>Site</th>
                    <th>Device</th>
                    <th>Total Pages</th>
                    <th>Broken Pages</th>
                    <th>A11y Violations</th>
                    <th>SEO Score</th>
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
