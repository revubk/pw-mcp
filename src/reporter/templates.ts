import { DetailedReportData, PageAuditResult } from "../types/audit";
import { compileAccessibilityDrawerHtml } from "./components/a11yDrawer";
import { compileFunctionalDrawerHtml } from "./components/functional";
import { compileSeoDrawerHtml } from "./components/seoDrawer";

export function renderPageBlockTemplate(
  page: PageAuditResult,
  runId: string,
  playwrightReportPath?: string | null,
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

  const reportLinkHref = playwrightReportPath
    ? `${playwrightReportPath}#?q=${encodeURIComponent(`s:failed ${page.url}`)}`
    : undefined;
  const reportLinkHtml = reportLinkHref
    ? `
          <div class="link-copy-row">
            <a href="${reportLinkHref}" target="_blank" class="link-copy-link">Open Native Playwright Visual Report for this page</a>
            <button type="button" class="link-copy-btn" data-copy-text="${reportLinkHref}" aria-label="Copy report link to clipboard">Copy</button>
          </div>`
    : "";

  const vResult = (page as any).visualResults;
  const visualStatus = vResult?.status;
  const hasVisualFailure = visualStatus === "failed";
  const hasVisualNewBaseline = visualStatus === "new_baseline";
  const hasVisualDiffAssets = Boolean(
    vResult?.expectedPath || vResult?.diffPath,
  );

  const functionalFailure = page.status >= 400;
  const seoFailure = page.seoScore < 100;
  const a11yFailure = page.a11yErrors > 0;

  return `
    <details class="page-accordion">
      <summary class="page-summary">
        <div class="summary-content">
          <span class="accordion-arrow">▶</span>
          <strong class="url-text">${page.url}</strong>
          <button type="button" class="page-url-copy-btn" data-page-url="${page.url}" aria-label="Copy page URL">Copy URL</button>
          <span class="status-badge" style="background: ${statusBg}; color: ${statusColor}; border-color: ${statusColor};">
            HTTP ${page.status}
          </span>
        </div>
      </summary>
      
      <div class="page-details-container">
        <details class="sub-accordion">
          <summary class="sub-summary functional-summary ${functionalFailure ? "issue-summary" : ""}">
             <span class="sub-arrow">▶</span>Broken Link Test
          </summary>
          <div class="sub-content">
            ${functionalHtml}
            <div class="script-path-box">
              <div class="script-path-title">Generated Test Script Path:</div>
              <code style="color: #9333ea; font-size: 13px; font-weight: 600;">tests/mcp/${page.url.replace(/[^a-z0-9]/gi, "_")}.spec.ts</code>
            </div>
          </div>
        </details>

        <details class="sub-accordion">
          <summary class="sub-summary seo-summary ${seoFailure ? "issue-summary" : ""}">
             <span class="sub-arrow">▶</span> SEO Checks (${page.seoScore}/100)
          </summary>
          <div class="sub-content">
            ${seoHtml}
          </div>
        </details>

        <details class="sub-accordion">
          <summary class="sub-summary a11y-summary ${a11yFailure ? "issue-summary" : ""}">
             <span class="sub-arrow">▶</span> Accessibility (WCAG) Checks - ${page.a11yErrors} Errors
          </summary>
          <div class="sub-content">
            ${page.screenshotPath ? `<a href="./${page.screenshotPath}" target="_blank" class="a11y-tag-btn">🖼️ View Accessibility Heatmap</a>` : ""}
            ${a11yHtml}
          </div>
        </details>

        <details class="sub-accordion">
          <summary class="sub-summary" style="border-left-color: #ec4899;">
             <span class="sub-arrow">▶</span> Visual Diff Test
          </summary>
          <div class="sub-content">
            ${
              hasVisualFailure
                ? `
              <div style="background: #fdf2f8; border: 1px solid #f472b6; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="color: #be185d; margin-top: 0;">⚠️ Layout Shift Detected</h4>
                <p style="margin: 8px 0 0; color: #9f1239; font-size: 13px;">The visual diff engine reported a regression for this page.</p>
                ${
                  hasVisualDiffAssets
                    ? `
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 16px;">
                    <div>
                      <div style="font-weight: bold; font-size: 12px; margin-bottom: 8px; color: #475569;">BASELINE (EXPECTED)</div>
                      <img src="${vResult.expectedPath}" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 4px;" alt="Baseline">
                    </div>
                    <div>
                      <div style="font-weight: bold; font-size: 12px; margin-bottom: 8px; color: #be185d;">ACTUAL (PINK = CHANGES)</div>
                      <img src="${vResult.diffPath}" style="width: 100%; border: 1px solid #f472b6; border-radius: 4px; filter: hue-rotate(310deg) saturate(1.5);" alt="Diff">
                    </div>
                  </div>
                  ${reportLinkHtml}
                `
                    : `
                  <div style="margin-top: 16px; padding: 12px; background: #fff7ed; border: 1px solid #fdba74; border-radius: 6px; color: #9a2c00; font-size: 13px;">
                    Diff images were not attached for this run, so only the failure status is available in the report.
                  </div>
                  ${reportLinkHtml}
                `
                }
              </div>
            `
                : hasVisualNewBaseline
                  ? `
              <div style="text-align: center; padding: 24px; color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;">
                <strong>🆕 Visual Baseline Created</strong><br>
                <span style="font-size: 13px; color: #1e3a8a;">This page did not have an existing baseline. Current image is saved as the Baseline.</span>
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
          --bg: #e6f2dd;
          --surface: #ffffff;
          --text: #1f2937;
          --text-muted: #4b5563;
          --border: #d9e7d4;
          --accent: #659287;
          --accent-soft: #88bda4;
          --accent-strong: #3d6d5b;
          --success: #2f855a;
          --danger: #c53030;
          --warning: #d69e2e;
        }
        body { font-family: system-ui, -apple-system, sans-serif; background: linear-gradient(180deg, var(--bg) 0%, #f8fafc 100%); color: var(--text); padding: 40px; margin: 0; line-height: 1.6; }
        .dashboard-container { max-width: 1400px; margin: 0 auto; background: rgba(255,255,255,0.94); padding: 40px; border-radius: 24px; box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08); border: 1px solid rgba(101, 146, 135, 0.18); }
        .header { border-bottom: 1px solid rgba(101, 146, 135, 0.18); padding-bottom: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
        .header h1 { margin: 0 0 8px 0; font-size: 30px; font-weight: 800; color: var(--text); }
        .header p { margin: 0; color: var(--text-muted); font-size: 14px; font-weight: 500; }
        
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 40px; }
        .metric-card { background: rgba(134, 185, 163, 0.18); padding: 18px 18px 16px; border-radius: 18px; border: 1px solid rgba(134, 185, 163, 0.24); text-align: center; box-shadow: 0 10px 20px rgba(101, 146, 135, 0.08); min-height: 120px; display: flex; flex-direction: column; justify-content: center; }
        .metric-value { font-size: 2rem; font-weight: 800; margin: 6px 0; color: var(--text); }
        .metric-label { font-size: 9px; color: #4f6b5e; text-transform: uppercase; font-weight: 700; letter-spacing: 0.65px; margin-bottom: 8px; }

        .charts-container { display: grid; grid-template-columns: repeat(2, minmax(280px, 1fr)); gap: 24px; margin-bottom: 40px; }
        .chart-box { background: rgba(255,255,255,0.95); border: 1px solid rgba(101, 146, 135, 0.18); border-radius: 20px; padding: 22px 20px 18px; box-shadow: 0 12px 28px rgba(101, 146, 135, 0.07); display: flex; flex-direction: column; align-items: stretch; min-height: 330px; }
        .chart-box h3 { font-size: 13px; color: #2f4858; text-transform: uppercase; margin-top: 0; margin-bottom: 18px; letter-spacing: 0.6px; width: 100%; text-align: left; border-bottom: 1px solid rgba(101, 146, 135, 0.18); padding-bottom: 12px; }
        .canvas-wrapper { position: relative; height: 240px; width: 100%; display: flex; justify-content: center; }
        .canvas-wrapper { position: relative; height: 220px; width: 100%; display: flex; justify-content: center; }

        details > summary { list-style: none; cursor: pointer; }
        details > summary::-webkit-details-marker { display: none; }
        .page-accordion { background: rgba(101, 146, 135, 0.08); border: 1px solid rgba(101, 146, 135, 0.14); border-radius: 16px; margin-bottom: 16px; overflow: hidden; transition: border-color 0.2s, background 0.2s; }
        .page-accordion:hover { border-color: rgba(101, 146, 135, 0.24); background: rgba(101, 146, 135, 0.10); }
        .page-accordion[open] { border-color: rgba(101, 146, 135, 0.32); }
        .page-summary { padding: 16px 20px; background: rgba(255,255,255,0.92); border-bottom: 1px solid transparent; }
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
        .issue-summary { background: #fee2e2; border-color: #fca5a5 !important; }
        .issue-summary .sub-arrow { color: #991b1b; }
        .sub-content { padding: 16px; background: #ffffff; border-top: 1px solid var(--border); }
        .sub-accordion .seo-summary + .sub-content,
        .sub-accordion .a11y-summary + .sub-content {
          max-height: 320px;
          overflow-y: auto;
          padding-right: 18px;
        }
        .sub-accordion .seo-summary + .sub-content::-webkit-scrollbar,
        .sub-accordion .a11y-summary + .sub-content::-webkit-scrollbar {
          width: 10px;
        }
        .sub-accordion .seo-summary + .sub-content::-webkit-scrollbar-thumb,
        .sub-accordion .a11y-summary + .sub-content::-webkit-scrollbar-thumb {
          background: rgba(37, 99, 235, 0.18);
          border-radius: 999px;
        }
        .sub-accordion .seo-summary + .sub-content::-webkit-scrollbar-track,
        .sub-accordion .a11y-summary + .sub-content::-webkit-scrollbar-track {
          background: rgba(148, 163, 184, 0.08);
        }

        .accordion-arrow, .sub-arrow { font-size: 12px; transition: transform 0.2s; color: var(--text-muted); }
        details[open] > summary > .summary-content > .accordion-arrow { transform: rotate(90deg); }
        details[open] > summary > .sub-arrow { transform: rotate(90deg); }

        .script-path-box { margin-top: 16px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid var(--border); }
        .script-path-title { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; }
        .a11y-tag-btn { display: inline-block; background: var(--accent); color: white; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: bold; text-decoration: none; margin-bottom: 12px; }
        .link-copy-row { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
        .link-copy-link { color: var(--accent-strong); font-weight: 700; text-decoration: underline; }
        .link-copy-btn, .page-url-copy-btn { background: var(--accent); color: white; border: none; padding: 6px 12px; border-radius: 999px; font-size: 12px; cursor: pointer; font-weight: 700; transition: background 0.2s, transform 0.2s; }
        .link-copy-btn:hover, .page-url-copy-btn:hover { background: #4f7f6c; transform: translateY(-1px); }
        
        #backToTop { position: fixed; bottom: 30px; right: 30px; background: var(--accent); color: white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: none; box-shadow: 0 4px 6px rgba(0,0,0,0.2); opacity: 0; transition: opacity 0.3s, transform 0.2s; font-size: 20px; z-index: 1000; pointer-events: none; }
        #backToTop.visible { opacity: 1; pointer-events: auto; }
        #backToTop:hover { transform: translateY(-3px); }

        pre { position: relative; background: #1e293b; color: #f8fafc; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
        .copy-btn { position: absolute; top: 8px; right: 8px; background: #334155; border: 1px solid #475569; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 600; transition: background 0.2s; }
        .copy-btn:hover { background: #475569; }
        .link-copy-row { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
        .link-copy-link { color: var(--accent-strong); font-weight: 700; text-decoration: underline; }
        .link-copy-btn, .page-url-copy-btn { background: var(--accent); color: white; border: none; padding: 6px 12px; border-radius: 999px; font-size: 12px; cursor: pointer; font-weight: 700; transition: background 0.2s, transform 0.2s; }
        .link-copy-btn:hover, .page-url-copy-btn:hover { background: #4f7f6c; transform: translateY(-1px); }
      </style>
    </head>
    <body>
      <div class="dashboard-container">
        <div class="header">
          <div>
            <h1>Page Report</h1>
            <p>Site : <strong style="color: var(--text);">${data.targetUrl}</strong> | Device Layout : <strong style="color: var(--accent); text-transform: uppercase;">${data.deviceMode}</strong> | Run ID: <strong style="font-family: monospace;">${data.runId}</strong></p>
          </div>
          <a href="index.html" style="color: var(--accent); text-decoration: none; font-weight: 600; font-size: 14px;">← Return to History Hub</a>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Total Pages</div>
            <div class="metric-value">${totalPages}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Working Pages</div>
            <div class="metric-value" style="color: var(--success);">${functionalPages}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Broken Pages</div>
            <div class="metric-value" style="color: var(--danger);">${brokenPages}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Total A11y Violations</div>
            <div class="metric-value" style="color: ${data.a11yViolationCount > 0 ? "var(--warning)" : "var(--success)"};">${data.a11yViolationCount}</div>
          </div>
        </div>

        <!-- ANALYTICS CHARTS SECTION -->
        <div class="charts-container">
          <div class="chart-box">
            <h3>Pages Status</h3>
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

        <h3 style="font-size: 16px; color: var(--text); margin-bottom: 20px; border-bottom: 2px solid var(--border); padding-bottom: 8px;">Page-Wise Details</h3>
        
        ${data.pages.map((page) => renderPageBlockTemplate(page, data.runId, data.playwrightReportPath)).join("")}
      </div>

      <button id="backToTop" title="Go to top">↑</button>

      <script>
        document.addEventListener("DOMContentLoaded", () => {
          const healthCtx = document.getElementById('healthChart').getContext('2d');
          new Chart(healthCtx, {
            type: 'doughnut',
            data: {
              labels: ['Working Pages', 'Broken/Error Pages'],
              datasets: [{
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
          const pageLabels = ${JSON.stringify(
            data.pages.map((p) => {
              try {
                const u = new URL(p.url);
                return `${u.pathname}${u.search}` || "/";
              } catch {
                return p.url;
              }
            }),
          )};
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

        document.querySelectorAll('.link-copy-btn').forEach((button) => {
          button.addEventListener('click', () => {
            const copyText = button.getAttribute('data-copy-text') || '';
            navigator.clipboard.writeText(copyText).then(() => {
              const previousText = button.textContent;
              button.textContent = 'Copied!';
              setTimeout(() => {
                button.textContent = previousText;
              }, 2000);
            });
          });
        });

        document.querySelectorAll('.page-url-copy-btn').forEach((button) => {
          button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const copyText = button.getAttribute('data-page-url') || '';
            navigator.clipboard.writeText(copyText).then(() => {
              const previousText = button.textContent;
              button.textContent = 'Copied!';
              setTimeout(() => {
                button.textContent = previousText;
              }, 2000);
            });
          });
        });
      </script>
    </body>
    </html>
  `;
}
