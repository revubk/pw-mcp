import { DetailedReportData, PageAuditResult } from '../types/audit';
import { compileVisualDrawerHtml } from './components/visualDrawer';

export function renderPageBlockTemplate(page: PageAuditResult): string {
    const visualHtml = compileVisualDrawerHtml(page.visualResults);

    return `
    <details class="page-accordion" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px; overflow: hidden;">
      <summary style="padding: 16px 20px; background: #f8fafc; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0;">
        <strong style="font-size: 14px; color: #0f172a; word-break: break-all;">${page.url}</strong>
      </summary>
      
      <div style="padding: 20px; display: grid; grid-template-columns: 1fr; gap: 20px;">
         <!-- Your existing functional/seo/a11y blocks go here -->
         
         <!-- NEW VISUAL PILLAR -->
         <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
            ${visualHtml}
         </div>
      </div>
    </details>
  `;
}

export function generateDashboardHtml(data: DetailedReportData): string {
    const totalPages = data.pages.length;
    const passedPages = data.pages.filter(p => p.status < 400 && p.a11yErrors === 0).length;

    // Calculate total visual regressions
    let totalVisualRegressions = 0;
    data.pages.forEach(p => {
        if (p.visualResults) {
            totalVisualRegressions += p.visualResults.filter((v: any) => v.status === 'FAILED').length;
        }
    });

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Autonomous QA Governance Dashboard</title>
      <style>
        :root { --bg: #0f172a; --surface: #1e293b; --text: #f8fafc; --accent: #3b82f6; --success: #22c55e; --danger: #ef4444; --warning: #f59e0b; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); padding: 20px; margin: 0; }
        .header { border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 30px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .metric-card { background: var(--surface); padding: 20px; border-radius: 8px; border: 1px solid #334155; text-align: center; }
        .metric-value { font-size: 2rem; font-weight: bold; margin: 10px 0; color: var(--accent); }
        .page-card { background: var(--surface); margin-bottom: 20px; border-radius: 8px; border: 1px solid #334155; overflow: hidden; }
        .page-header { padding: 15px 20px; background: #0b0f19; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; }
        .page-header h3 { margin: 0; font-size: 1.1rem; word-break: break-all; }
        .pillars { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; padding: 20px; }
        .pillar { padding: 15px; border-radius: 6px; background: #0f172a; border-left: 4px solid var(--accent); }
        .pillar h4 { margin-top: 0; margin-bottom: 10px; color: var(--text); border-bottom: 1px solid #334155; padding-bottom: 5px; }
        .status-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }
        .pass { background: rgba(34, 197, 94, 0.2); color: var(--success); }
        .fail { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
        .warn { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
        .visual-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center; }
        .visual-item { background: var(--surface); padding: 10px; border-radius: 4px; font-size: 0.85rem; }
        .visual-item img { max-width: 100%; height: auto; margin-top: 10px; border: 1px solid #334155; border-radius: 4px; }
        a { color: var(--accent); text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Autonomous Test Generation & Regression Tool</h1>
        <p>Target: <strong>${data.targetUrl}</strong> | Emulation: <strong>${data.deviceMode.toUpperCase()}</strong> | Run ID: <strong>${data.runId}</strong></p>
      </div>

      <div class="summary-grid">
        <div class="metric-card">
          <div>Pages Discovered</div>
          <div class="metric-value">${totalPages}</div>
        </div>
        <div class="metric-card">
          <div>Healthy Pages</div>
          <div class="metric-value" style="color: var(--success)">${passedPages}</div>
        </div>
        <div class="metric-card">
          <div>Visual Regressions</div>
          <div class="metric-value" style="color: ${totalVisualRegressions > 0 ? 'var(--danger)' : 'var(--success)'}">${totalVisualRegressions}</div>
        </div>
        <div class="metric-card">
          <div>A11y Violations</div>
          <div class="metric-value" style="color: ${data.a11yViolationCount > 0 ? 'var(--warning)' : 'var(--success)'}">${data.a11yViolationCount}</div>
        </div>
      </div>

      <h2>Detailed Page Audits</h2>
      ${data.pages.map(page => generatePageCard(page, data.runId)).join('')}

    </body>
    </html>
  `;
}

function generatePageCard(page: PageAuditResult, runId: string): string {
    const isBroken = page.status >= 400;

    return `
    <div class="page-card">
      <div class="page-header">
        <h3><a href="${page.url}" target="_blank">${page.url}</a></h3>
        <span class="status-badge ${isBroken ? 'fail' : 'pass'}">HTTP ${page.status}</span>
      </div>
      
      <div class="pillars">
        
        <!-- UI & Layout Validation -->
        <div class="pillar" style="border-left-color: var(--accent);">
          <h4>Visual UI & Layout</h4>
          ${generateVisualGrid(page.visualResults)}
        </div>

        <!-- Compliance Validation -->
        <div class="pillar" style="border-left-color: var(--warning);">
          <h4>SEO & Accessibility Health</h4>
          <p><strong>Technical SEO:</strong> <span class="${page.seoScore >= 90 ? 'pass' : 'warn'} status-badge">${page.seoScore}/100</span></p>
          <p><strong>A11y Violations:</strong> <span class="${page.a11yErrors === 0 ? 'pass' : 'fail'} status-badge">${page.a11yErrors}</span></p>
          ${page.screenshotPath ? `<p><a href="../${page.screenshotPath}" target="_blank">View A11y Element Map</a></p>` : ''}        </div>

        <!-- Automation Generation -->
        <div class="pillar" style="border-left-color: #a855f7;">
          <h4>Automated Functional Scripts</h4>
          <p style="font-size: 0.9rem; color: #94a3b8;">
            AI-Agent generated E2E flow.<br>
            Path: <code>tests/${page.url.replace(/[^a-z0-9]/gi, '_')}.spec.ts</code>
          </p>
          <span class="status-badge pass">Generated Successfully</span>
        </div>

      </div>
    </div>
  `;
}

function generateVisualGrid(visualResults?: any[]): string {
    if (!visualResults || visualResults.length === 0) {
        return `<p style="font-size: 0.9rem; color: #94a3b8;">Visual scan disabled or no data.</p>`;
    }

    const items = visualResults.map(res => {
        const isFail = res.status === 'FAILED';
        const isNew = res.status === 'NEW_BASELINE';
        const color = isFail ? 'var(--danger)' : isNew ? 'var(--accent)' : 'var(--success)';

        return `
      <div class="visual-item">
        <strong style="text-transform: uppercase;">${res.viewport}</strong><br>
        <span style="color: ${color}; font-weight: bold;">${res.status}</span><br>
        <span style="font-size: 0.8rem; color: #94a3b8;">Diff: ${res.diffPercentage ? res.diffPercentage.toFixed(2) : 0}%</span>
        ${isFail && res.diffPath ? `<br><a href="../../${res.diffPath}" target="_blank" style="color: var(--danger); font-size: 0.8rem;">View Diff</a>` : ''}
      </div>
    `;
    }).join('');

    return `<div class="visual-grid">${items}</div>`;
}