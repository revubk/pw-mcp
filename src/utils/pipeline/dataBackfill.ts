import { PageAuditResult } from '../../types/audit';

export function backfillIncompletePages(
  executionSummary: any[],
  structuredPagesList: PageAuditResult[],
  wasInterrupted: boolean
): void {
  executionSummary.forEach(crawledPage => {
    const activeMatch = structuredPagesList.find(p => p.url === crawledPage.url);
    if (!activeMatch) {
      const isResponseError = crawledPage.statusCode >= 400;
      
      structuredPagesList.push({
        url: crawledPage.url,
        status: crawledPage.statusCode,
        a11yErrors: 0,
        seoScore: 0,
        a11yDetails: wasInterrupted ? (undefined as any) : [],
        seoDetails: wasInterrupted 
          ? ['[Run Interrupted] Process terminated manually before compilation completed.']
          : isResponseError 
            ? [`Functional Failure: Server responded with error code [HTTP ${crawledPage.statusCode}].`]
            : ['Functional Error: Route map dropped before validation tasks finished.'],
        seoPassDetails: wasInterrupted ? (undefined as any) : []
      });
    } else {
      activeMatch.screenshotPath = crawledPage.screenshotPath;
    }
  });
}
