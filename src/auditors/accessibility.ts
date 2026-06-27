import { Page } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { A11yErrorDetail } from '../types/audit';

export interface AccessibilityAuditResult {
  url: string;
  violationCount: number;
  violations: A11yErrorDetail[];
}

export async function runAccessibilityAudit(page: Page, url: string): Promise<AccessibilityAuditResult> {
  try {
    const results = await new AxeBuilder({ page }).analyze();
    const enrichedViolations: A11yErrorDetail[] = [];
    
    for (const violation of results.violations) {
      for (const node of violation.nodes) {
        const selector = node.target.join(' > ');
        let htmlSnippet = node.html || 'HTML wrapper unmappable';
        let elementText = 'N/A';

        try {
          const elementLocator = page.locator(selector).first();
          if (await elementLocator.count() > 0) {
            elementText = await elementLocator.innerText();
            if (!elementText || elementText.trim().length === 0) {
              elementText = await elementLocator.getAttribute('aria-label') || 'Empty Label';
            }
          }
        } catch (_) {}

        enrichedViolations.push({
          id: violation.id,
          impact: violation.impact || 'serious',
          description: violation.description,
          help: violation.help,
          targetSelector: selector,
          htmlSnippet: htmlSnippet.substring(0, 300),
          elementText: elementText.trim().substring(0, 100) || 'None'
        });
      }
    }

    return {
      url,
      violationCount: enrichedViolations.length,
      violations: enrichedViolations
    };
  } catch (error) {
    return { url, violationCount: 0, violations: [] };
  }
}
