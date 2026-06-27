import { A11yErrorDetail } from '../../types/audit';

export function renderA11yViolationCard(err: A11yErrorDetail, occurrenceIndex: number): string {
  const cleanSelector = (err.targetSelector && err.targetSelector !== 'undefined') 
    ? err.targetSelector 
    : 'Global Layout Template Frame / Scope';

  const categoryColorsPalette = ['#d97706', '#2563eb', '#7c3aed', '#059669', '#db2777', '#0891b2', '#ea580c'];
  
  let hashValue = 0;
  for (let i = 0; i < err.id.length; i++) {
    hashValue = err.id.charCodeAt(i) + ((hashValue << 5) - hashValue);
  }
  const targetedColorIndex = Math.abs(hashValue) % categoryColorsPalette.length;
  const synchronizedCategoryColor = categoryColorsPalette[targetedColorIndex];

  return `
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.01); border-left: 4px solid ${synchronizedCategoryColor};">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; color: #475569;">${err.impact}</span>
          <strong style="color: #0f172a; font-size: 13px;">Rule Break ID: <span style="color: ${synchronizedCategoryColor}">${err.id}</span></strong>
        </div>
        <!-- 🔥 SYNCHRONIZED COLOR KEY SYSTEM ID BADGE -->
        <span style="background: ${synchronizedCategoryColor}; color: #ffffff; font-family: monospace; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 4px;">${err.id} #${occurrenceIndex}</span>
      </div>
      <p style="font-size: 13px; color: #334155; margin: 0 0 6px 0; line-height: 1.5; font-weight: 500;">${err.description}</p>
      <div style="font-size: 13px; color: #059669; font-weight: 600; margin-bottom: 10px;">💡 Remediation Step: ${err.help}</div>
      
      <div style="display: grid; grid-template-columns: 100px 1fr; gap: 6px; font-size: 12px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px;">
        <div style="color: #64748b; font-weight: 600;">Text Label:</div>
        <div style="color: #0f172a; font-weight: 500;">"${err.elementText || 'Empty Element / Graphic'}"</div>
        <div style="color: #64748b; font-weight: 600;">CSS Selector:</div>
        <div style="color: #1e293b; font-family: monospace; font-size: 11px; word-break: break-all; font-weight: 500;">${cleanSelector}</div>
      </div>

      ${err.htmlSnippet && err.htmlSnippet !== 'N/A' ? `
      <div style="margin-bottom: 4px;">
        <pre style="margin: 0; background: #0f172a; color: #38bdf8; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 11px; overflow-x: auto; line-height: 1.4;">${escapeHtml(err.htmlSnippet)}</pre>
      </div>` : ''}
    </div>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
