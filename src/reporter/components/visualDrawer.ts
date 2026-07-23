export function compileVisualDrawerHtml(visualResults: any[] | undefined): string {
  if (!visualResults || visualResults.length === 0) {
    return `
      <div style="background: #f3f4f6; border: 1px solid #e5e7eb; color: #4b5563; padding: 12px 16px; border-radius: 6px; font-size: 13px; font-weight: 500;">
         ℹ️ Visual regression scan was disabled or no baseline comparisons were executed for this node.
      </div>`;
  }

  let gridItems = '';

  for (const res of visualResults) {
    const isFail = res.status === 'FAILED';
    const isNew = res.status === 'NEW_BASELINE';
    
    // Assign colors based on status
    const bgColor = isFail ? '#fef2f2' : isNew ? '#eff6ff' : '#f0fdf4';
    const borderColor = isFail ? '#fecaca' : isNew ? '#bfdbfe' : '#bbf7d0';
    const textColor = isFail ? '#dc2626' : isNew ? '#2563eb' : '#16a34a';

    gridItems += `
      <div style="background: ${bgColor}; border: 1px solid ${borderColor}; padding: 12px; border-radius: 6px; text-align: center;">
        <h4 style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #475569;">${res.viewport}</h4>
        <div style="font-weight: 700; font-size: 14px; color: ${textColor}; margin-bottom: 4px;">${res.status}</div>
        <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">Pixel Diff: ${res.diffPercentage ? res.diffPercentage.toFixed(2) : 0}%</div>
        ${isFail && res.diffPath ? `<a href="../../${res.diffPath}" target="_blank" style="display: inline-block; font-size: 11px; font-weight: 600; color: #ffffff; background: #dc2626; padding: 4px 8px; border-radius: 4px; text-decoration: none;">View Layout Shift</a>` : ''}
      </div>
    `;
  }

  return `
    <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">Multi-Viewport Layout Diagnostics:</div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
      ${gridItems}
    </div>`;
}