import { Page } from 'playwright';
import { runAccessibilityAudit } from '../../auditors/accessibility';
import { runSeoAudit } from '../../auditors/seo';

/**
 * Executes Axe-Core and programmatic Lighthouse audits concurrently to optimize pipeline speeds.
 */
export async function executeParallelAudits(
  page: Page,
  url: string,
  scanA11y: boolean,
  scanSeo: boolean,
  deviceMode: 'desktop' | 'tablet' | 'mobile'
) {
  const tasks: Promise<any>[] = [];
  if (scanA11y) tasks.push(runAccessibilityAudit(page, url));
  if (scanSeo) tasks.push(runSeoAudit(page, url, deviceMode));

  const auditResults = await Promise.all(tasks);

  let resultIndex = 0;
  let a11yErrorsOnPage = 0;
  let pageA11yDetails: any[] = [];
  let seoScoreOnPage = 100;
  let pageSeoDetails: string[] = [];
  let pageSeoPassDetails: string[] = [];

  if (scanA11y) {
    const a11yData = auditResults[resultIndex++];
    a11yErrorsOnPage = a11yData.violationCount;
    pageA11yDetails = a11yData.violations || [];
  } else {
    pageA11yDetails = undefined as any;
  }

  if (scanSeo) {
    const seoData = auditResults[resultIndex];
    seoScoreOnPage = seoData.score;
    pageSeoDetails = seoData.missingDetails || [];
    pageSeoPassDetails = seoData.passingDetails || [];
  } else {
    pageSeoDetails = undefined as any;
    pageSeoPassDetails = undefined as any;
    seoScoreOnPage = 100;
  }

  return {
    a11yErrorsOnPage,
    pageA11yDetails,
    seoScoreOnPage,
    pageSeoDetails,
    pageSeoPassDetails
  };
}
