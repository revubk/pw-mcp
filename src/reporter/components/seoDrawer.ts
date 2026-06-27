function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/`/g, "&#96;");
}

export function compileSeoDrawerHtml(seoDetailsList: string[], seoPassList: string[]): string {
  const safeFailures = Array.isArray(seoDetailsList) ? seoDetailsList : [];
  const safePasses = Array.isArray(seoPassList) ? seoPassList : [];

  let failuresMarkup = `
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; padding: 12px 16px; border-radius: 6px; font-size: 13px; font-weight: 500; margin-bottom: 10px;">
       ✔ Pass — 0 Technical SEO Violations Found on this page node.
    </div>`;

  if (safeFailures.length > 0) {
    let listItems = '';
    for (const failureItem of safeFailures) {
      listItems += `
        <div style="background: #fffbec; border: 1px solid #fde68a; color: #92400e; padding: 10px 14px; border-radius: 6px; font-size: 13px; font-weight: 500; margin-bottom: 8px; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word;">
           ⚠️ [VIOLATION] ${escapeHtml(failureItem)}
        </div>`;
    }
    failuresMarkup = `<div>${listItems}</div>`;
  }

  let passMarkup = `
    <div style="background: #f3f4f6; border: 1px solid #e5e7eb; color: #4b5563; padding: 12px 16px; border-radius: 6px; font-size: 13px; font-weight: 500;">
       No successful checkpoint records returned for this target node routing execution.
    </div>`;

  if (safePasses.length > 0) {
    let listItems = '';
    for (const passedItem of safePasses) {
      listItems += `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; color: #15803d; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; margin-bottom: 6px; display: flex; align-items: flex-start; gap: 8px; word-wrap: break-word; overflow-wrap: break-word; white-space: normal;">
           <span style="color: #16a34a; font-weight: bold; flex-shrink: 0;">✔</span> 
           <span style="line-height: 1.4; color: #15803d;">${escapeHtml(passedItem)}</span>
        </div>`;
    }
    passMarkup = `<div style="max-height: 250px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background: #ffffff;">${listItems}</div>`;
  }

  return `
    <div style="font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Detected Indexing Violations:</div>
    ${failuresMarkup}
    <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #e2e8f0;">
        <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Affirmative Passing Confirmations:</div>
        ${passMarkup}
    </div>`;
}
