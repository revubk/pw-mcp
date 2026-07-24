import { DetailedReportData, PageAuditResult } from '../types/audit';
import { compileAccessibilityDrawerHtml } from './components/a11yDrawer';
import { compileFunctionalDrawerHtml } from './components/functional';
import { compileSeoDrawerHtml } from './components/seoDrawer';

export function renderPageBlockTemplate(page: PageAuditResult, runId: string): string {
  const isBroken = page.status >= 400;
  const statusColor = isBroken ? 'var(--danger)' : 'var(--success)';
  const statusBg = isBroken ? '#fef2f2' : '#f0fdf4';

  const functionalHtml = compileFunctionalDrawerHtml(page);
  const a11yHtml = compileAccessibilityDrawerHtml(page.a11yDetails);

  const seoDetails = Array.isArray(page.seoDetails) ? page.seoDetails : [];
  const seoPassDetails = Array.isArray(page.seoPassDetails) ? page.seoPassDetails : [];
  const seoHtml = compileSeoDrawerHtml(seoDetails, seoPassDetails);

  // Extract visual status
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

        <!-- SUB-ACCORDION 1: Functional -->
        <details class="sub-accordion">
          <summary class="sub-summary functional-summary">
             <span class="sub-arrow">▶</span> Functional Handshake & AI Automation
          </summary>
          <div class="sub-content">
            ${functionalHtml}
            <div class="script-path-box">
              <div class="script-path-title">AI Script Generation Path:</div>
              <code style="color: #a855f7; font-size: 13px; font-weight: 600;">tests/${page.url.replace(/[^a-z0-9]/gi, '_')}.spec.ts</code>
            </div>
          </div>
        </details>

        <!-- SUB-ACCORDION 2: SEO -->
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
            ${page.screenshotPath ? `<a href="./${page.screenshotPath}" target="_blank" class="a11y-tag-btn">🖼️ View A11y Tagging Map</a>` : ''}
            ${a11yHtml}
          </div>
        </details>

        <!-- SUB-ACCORDION 4: Visual Layout Engine -->
        <details class="sub-accordion">
          <summary class="sub-summary" style="border-left-color: #ec4899;">
             <span class="sub-arrow">▶</span> Visual Layout Engine (Pixel Diff)
          </summary>
          <div class="sub-content">
            ${vResult && vResult.status === 'failed' && vResult.diffPath ? `
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
                
                <div style="margin-top: 20px; text-align: center;">
                  <a href="../../playwright-report/index.html" target="_blank" style="background: #ec4899; color: white; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 700; text-decoration: none; display: inline-block; transition: background 0.2s;">
                    🔍 Open Playwright Slider Report
                  </a>
                </div>
              </div>
            ` : `
              <div style="text-align: center; padding: 30px; color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
                <strong>✅ Visual Layout Verified / Baseline Established</strong><br>
                <span style="font-size: 13px; color: #166534;">No layout shifts detected against the baseline (or a new baseline was successfully captured).</span>
              </div>
            `}
          </div>
        </details>
      </div>
    </details>
  `;
}

export function generateDashboardHtml(data: DetailedReportData): string {
  const totalPages = data.pages.length;
  const passedPages = data.pages.filter(p => p.status < 400 && p.a11yErrors === 0).length;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Autonomous QA Governance Dashboard</title>
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
        .header h1 { margin: 0 0 8px 0; font-size: 26px; font-weight: 800; }
        .header p { margin: 0; color: var(--text-muted); font-size: 14px; font-weight: 500; }
        
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .metric-card { background: var(--surface); padding: 24px; border-radius: 10px; border: 1px solid var(--border); text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .metric-value { font-size: 2.5rem; font-weight: 800; margin: 12px 0; color: var(--text); }
        .metric-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
        
        details > summary { list-style: none; cursor: pointer; }
        details > summary::-webkit-details-marker { display: none; }
        .page-accordion { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: border-color 0.2s; }
        .page-accordion:hover { border-color: #cbd5e1; }
        .page-accordion[open] { border-color: var(--accent); }
        .page-summary { padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid transparent; }
        .page-accordion[open] .page-summary { border-bottom-color: var(--border); }
        .summary-content { display: flex; align-items: center; gap: 12px; width: 100%; }
        .url-text { font-size: 14px; word-break: break-all; flex-grow: 1; }
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

        <div class="summary-grid">
          <div class="metric-card">
            <div class="metric-label">Pages Discovered</div>
            <div class="metric-value">${totalPages}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Healthy Pages</div>
            <div class="metric-value" style="color: var(--success)">${passedPages}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">A11y Violations</div>
            <div class="metric-value" style="color: ${data.a11yViolationCount > 0 ? 'var(--warning)' : 'var(--text)'}">${data.a11yViolationCount}</div>
          </div>
        </div>

        <h3 style="font-size: 16px; color: var(--text); margin-bottom: 20px; border-bottom: 2px solid var(--border); padding-bottom: 8px; display: inline-block;">Granular Page Diagnostics</h3>
        
        ${data.pages.map(page => renderPageBlockTemplate(page, data.runId)).join('')}
      </div>

      <button id="backToTop" title="Go to top">↑</button>

      <script>
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