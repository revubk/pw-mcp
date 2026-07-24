import { DetailedReportData, PageAuditResult } from "../types/audit";
import { compileAccessibilityDrawerHtml } from "./components/a11yDrawer";
import { compileFunctionalDrawerHtml } from "./components/functional";
import { compileSeoDrawerHtml } from "./components/seoDrawer";

export function renderPageBlockTemplate(
  page: PageAuditResult,
  runId: string,
): string {
  const isBroken = page.status >= 400;
  const statusColor = isBroken ? "var(--danger)" : "var(--success)";
  const statusBg = isBroken ? "#fef2f2" : "#f0fdf4";

  const functionalHtml = compileFunctionalDrawerHtml(page);
  const a11yHtml = compileAccessibilityDrawerHtml(page.a11yDetails);

  const seoDetails = Array.isArray(page.seoDetails) ? page.seoDetails : [];
  const seoPassDetails = Array.isArray(page.seoPassDetails)
    ? page.seoPassDetails
    : [];
  const seoHtml = compileSeoDrawerHtml(seoDetails, seoPassDetails);

  const vResult = (page as any).visualResults;

  return `
    <details class="page-accordion">
      <summary class="page-summary">
        <div class="summary-content">
          <span class="accordion-arrow">▶</span>
          <strong class="url-text">${page.url}</strong>
          <span class="status-badge" style="background: ${statusBg}; color: ${statusColor}; border-color: ${statusColor};">
            HTTP ${page.status}
          </span>
        </div>
      </summary>
      
      <div class="page-details-container">
        <details class="sub-accordion">
          <summary class="sub-summary functional-summary">
             <span class="sub-arrow">▶</span> Functional Validation & Component Tests
          </summary>
          <div class="sub-content">
            ${functionalHtml}
            <div class="script-path-box">
              <div class="script-path-title">Generated Test Script Path:</div>
              <code style="color: #9333ea; font-size: 13px; font-weight: 600;">tests/${page.url.replace(/[^a-z0-9]/gi, "_")}.spec.ts</code>
            </div>
          </div>
        </details>

        <details class="sub-accordion">
          <summary class="sub-summary seo-summary">
             <span class="sub-arrow">▶</span> Technical SEO Engine (${page.seoScore}/100)
          </summary>
          <div class="sub-content">
            ${seoHtml}
          </div>
        </details>

        <!-- SUB-ACCORDION 3: Accessibility -->
        <details class="sub-accordion">
          <summary class="sub-summary a11y-summary">
             <span class="sub-arrow">▶</span> Accessibility (WCAG) Analysis - ${page.a11yErrors} Errors
          </summary>
          <div class="sub-content">
            ${page.screenshotPath ? `<a href="./${page.screenshotPath}" target="_blank" class="a11y-tag-btn">🖼️ View Accessibility Heatmap</a>` : ""}
            ${a11yHtml}
          </div>
        </details>

        <details class="sub-accordion">
          <summary class="sub-summary" style="border-left-color: #ec4899;">
             <span class="sub-arrow">▶</span> Visual Layout Engine (Pixel Diff)
          </summary>
          <div class="sub-content">
            ${
              vResult && vResult.status === "failed" && vResult.diffPath
                ? `
              <div style="background: #fdf2f8; border: 1px solid #f472b6; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="color: #be185d; margin-top: 0;">⚠️ Layout Shift Detected</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 16px;">
                  <div>
                    <div style="font-weight: bold; font-size: 12px; margin-bottom: 8px; color: #475569;">BASELINE (EXPECTED)</div>
                    <img src="../../${vResult.expectedPath}" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 4px;" alt="Baseline">
                  </div>
                  <div>
                    <div style="font-weight: bold; font-size: 12px; margin-bottom: 8px; color: #be185d;">ACTUAL (PINK = CHANGES)</div>
                    <img src="../../${vResult.diffPath}" style="width: 100%; border: 1px solid #f472b6; border-radius: 4px; filter: hue-rotate(310deg) saturate(1.5);" alt="Diff">
                  </div>
                </div>
              </div>
            `
                : `
              <div style="text-align: center; padding: 24px; color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
                <strong>✅ Visual Layout Verified / Baseline Established</strong><br>
                <span style="font-size: 13px; color: #166534;">No layout regression found against central baseline storage.</span>
              </div>
            `
            }
          </div>
        </details>
      </div>
    </details>
  `;
}

export function generateDashboardHtml(data: DetailedReportData): string {
  const totalPages = data.pages.length;
  const functionalPages = data.pages.filter((p) => p.status < 400).length;
  const brokenPages = data.pages.filter((p) => p.status >= 400).length;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Autonomous QA Governance Dashboard</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <style>
        :root {
          --bg: #f8fafc;
          --surface: #ffffff;
          --text: #0f172a;
          --text-muted: #64748b;
          --border: #e2e8f0;
          --accent: #2563eb;
          --success: #16a34a;
          --danger: #dc2626;
          --warning: #d97706;
        }
        body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); padding: 40px; margin: 0; line-height: 1.6; }
        .dashboard-container { max-width: 1400px; margin: 0 auto; background: var(--surface); padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid var(--border); }
        .header { border-bottom: 2px solid var(--border); padding-bottom: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end; }
        .header h1 { margin: 0 0 8px 0; font-size: 28px; font-weight: 800; color: #1e293b; }
        .header p { margin: 0; color: var(--text-muted); font-size: 14px; font-weight: 500; }
        
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .metric-card { background: var(--surface); padding: 24px; border-radius: 10px; border: 1px solid var(--border); text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .metric-value { font-size: 2.2rem; font-weight: 800; margin: 8px 0; color: var(--text); }
        .metric-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }

        .charts-container { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 40px; }
        .chart-box { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); display: flex; flex-direction: column; align-items: center; height: 300px; }
        .chart-box h3 { font-size: 14px; color: var(--text-muted); text-transform: uppercase; margin-top: 0; margin-bottom: 15px; letter-spacing: 0.5px; width: 100%; text-align: left; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
        .canvas-wrapper { position: relative; height: 220px; width: 100%; display: flex; justify-content: center; }

        details > summary { list-style: none; cursor: pointer; }
        details > summary::-webkit-details-marker { display: none; }
        .page-accordion { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 16px; overflow: hidden; transition: border-color 0.2s; }
        .page-accordion:hover { border-color: #cbd5e1; }
        .page-accordion[open] { border-color: var(--accent); }
        .page-summary { padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid transparent; }
        .page-accordion[open] .page-summary { border-bottom-color: var(--border); }
        .summary-content { display: flex; align-items: center; gap: 12px; width: 100%; }
        .url-text { font-size: 14px; word-break: break-all; flex-grow: 1; font-weight: 600; color: #334155; }
        .status-badge { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; border: 1px solid; white-space: nowrap; }

        .page-details-container { padding: 24px; display: flex; flex-direction: column; gap: 16px; background: #ffffff; }
        .sub-accordion { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
        .sub-summary { padding: 12px 16px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: #f1f5f9; display: flex; align-items: center; gap: 8px; border-left: 4px solid var(--border); }
        .functional-summary { border-left-color: var(--accent); }
        .seo-summary { border-left-color: var(--warning); }
        .a11y-summary { border-left-color: var(--success); }
        .sub-content { padding: 16px; background: #ffffff; border-top: 1px solid var(--border); }

        .accordion-arrow, .sub-arrow { font-size: 12px; transition: transform 0.2s; color: var(--text-muted); }
        details[open] > summary > .summary-content > .accordion-arrow { transform: rotate(90deg); }
        details[open] > summary > .sub-arrow { transform: rotate(90deg); }

        .script-path-box { margin-top: 16px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid var(--border); }
        .script-path-title { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; }
        .a11y-tag-btn { display: inline-block; background: var(--accent); color: white; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; text-decoration: none; margin-bottom: 12px; }
        
        #backToTop { position: fixed; bottom: 30px; right: 30px; background: var(--accent); color: white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: none; box-shadow: 0 4px 6px rgba(0,0,0,0.2); opacity: 0; transition: opacity 0.3s, transform 0.2s; font-size: 20px; z-index: 1000; pointer-events: none; }
        #backToTop.visible { opacity: 1; pointer-events: auto; }
        #backToTop:hover { transform: translateY(-3px); }

        pre { position: relative; background: #1e293b; color: #f8fafc; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
        .copy-btn { position: absolute; top: 8px; right: 8px; background: #334155; border: 1px solid #475569; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 600; transition: background 0.2s; }
        .copy-btn:hover { background: #475569; }
      </style>
    </head>
    <body>
      <div class="dashboard-container">
        <div class="header">
          <div>
            <h1>Autonomous Test Generation Matrix</h1>
            <p>Target Environment: <strong style="color: var(--text);">${data.targetUrl}</strong> | Emulation Mode: <strong style="color: var(--accent); text-transform: uppercase;">${data.deviceMode}</strong> | Run ID: <strong style="font-family: monospace;">${data.runId}</strong></p>
          </div>
          <a href="index.html" style="color: var(--accent); text-decoration: none; font-weight: 600; font-size: 14px;">← Return to History Hub</a>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Pages Discovered</div>
            <div class="metric-value">${totalPages}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Functional Pages</div>
            <div class="metric-value" style="color: var(--success);">${functionalPages}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Broken / Errors</div>
            <div class="metric-value" style="color: var(--danger);">${brokenPages}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">A11y Violations</div>
            <div class="metric-value" style="color: ${data.a11yViolationCount > 0 ? "var(--warning)" : "var(--success)"};">${data.a11yViolationCount}</div>
          </div>
        </div>

        <!-- ANALYTICS CHARTS SECTION -->
        <div class="charts-container">
          <div class="chart-box">
            <h3>Site Health Ratio</h3>
            <div class="canvas-wrapper">
              <canvas id="healthChart"></canvas>
            </div>
          </div>
          <div class="chart-box">
            <h3>Accessibility Violations per Page</h3>
            <div class="canvas-wrapper">
              <canvas id="a11yChart"></canvas>
            </div>
          </div>
        </div>

        <h3 style="font-size: 16px; color: var(--text); margin-bottom: 20px; border-bottom: 2px solid var(--border); padding-bottom: 8px;">Granular Page Diagnostics</h3>
        
        ${data.pages.map((page) => renderPageBlockTemplate(page, data.runId)).join("")}
      </div>

      <button id="backToTop" title="Go to top">↑</button>

      <script>
        document.addEventListener("DOMContentLoaded", () => {
          const healthCtx = document.getElementById('healthChart').getContext('2d');
          new Chart(healthCtx, {
            type: 'doughnut',
            data: {
              // 🔥 FIX: Labels updated here
              labels: ['Functional Pages', 'Broken/Error Pages'],
              datasets: [{
                // 🔥 FIX: Passed correct variables into Chart.js array
                data: [${functionalPages}, ${brokenPages}],
                backgroundColor: ['#16a34a', '#dc2626'],
                borderWidth: 0
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
            }
          });

          const a11yCtx = document.getElementById('a11yChart').getContext('2d');
          const pageLabels = ${JSON.stringify(data.pages.map((p) => new URL(p.url).pathname || "/"))};
          const a11yData = ${JSON.stringify(data.pages.map((p) => p.a11yErrors))};

          new Chart(a11yCtx, {
            type: 'bar',
            data: {
              labels: pageLabels,
              datasets: [{
                label: 'WCAG Errors',
                data: a11yData,
                backgroundColor: '#d97706',
                borderRadius: 4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { beginAtZero: true, ticks: { precision: 0 } },
                x: { ticks: { font: { size: 10 }, maxRotation: 45 } }
              },
              plugins: { legend: { display: false } }
            }
          });
        });

        const backToTopBtn = document.getElementById("backToTop");
        window.addEventListener("scroll", () => {
          if (window.scrollY > 300) {
            backToTopBtn.classList.add("visible");
          } else {
            backToTopBtn.classList.remove("visible");
          }
        });
        backToTopBtn.addEventListener("click", () => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        document.querySelectorAll('pre').forEach(pre => {
          const btn = document.createElement('button');
          btn.className = 'copy-btn';
          btn.textContent = 'Copy';
          btn.onclick = () => {
            const textToCopy = pre.innerText.replace('Copy', '').trim();
            navigator.clipboard.writeText(textToCopy).then(() => {
              btn.textContent = 'Copied!';
              setTimeout(() => btn.textContent = 'Copy', 2000);
            });
          };
          pre.prepend(btn);
        });
      </script>
    </body>
    </html>
  `;
}
