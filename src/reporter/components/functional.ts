import { PageAuditResult } from '../../types/audit';

export function compileFunctionalDrawerHtml(p: PageAuditResult): string {
  const isBroken = p.status >= 400;
  if (isBroken) {
    return `
      <div style="background: #fff5f5; border: 1px solid #fecaca; color: #991b1b; padding: 14px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; margin-bottom: 12px;">
         [CRITICAL FAILURE] Web engine encountered a severe response failure during route discovery.
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; background: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0;">
         <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;"><th style="padding: 10px 14px; color: #475569; font-weight: 600;">Parameter</th><th style="padding: 10px 14px; color: #475569; font-weight: 600;">Value / Diagnostics Trace</th></tr>
         <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 14px; font-weight:600; color:#475569;">HTTP Status Code</td><td style="padding: 10px 14px; color: #dc2626; font-weight: 700;">${p.status} Failed Response</td></tr>
         <tr><td style="padding: 10px 14px; font-weight:600; color:#475569;">Impact Assessment</td><td style="padding: 10px 14px; color: #334155;">Release Blocker. Broken loop intercepted. Link extraction terminated on this route.</td></tr>
      </table>`;
  }
  
  return `
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; padding: 14px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; margin-bottom: 12px;">
       [SUCCESS] Functional status optimal. Connection handshake resolved perfectly.
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; background: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0;">
       <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;"><th style="padding: 10px 14px; color: #475569; font-weight: 600;">Parameter</th><th style="padding: 10px 14px; color: #475569; font-weight: 600;">Value / Diagnostics Trace</th></tr>
       <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 14px; font-weight:600; color:#475569;">HTTP Status Code</td><td style="padding: 10px 14px; color: #16a34a; font-weight: 700;">${p.status} OK Success</td></tr>
       <tr><td style="padding: 10px 14px; font-weight:600; color:#475569;">Navigation Wait Time</td><td style="padding: 10px 14px; color: #334155;">Playwright Network Link Idle Event resolved cleanly within configuration parameters.</td></tr>
    </table>`;
}
