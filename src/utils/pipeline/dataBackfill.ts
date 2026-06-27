import { PageAuditResult } from '../../types/audit';

/**
 * Processes fault-tolerant, configuration-aware backfills for incomplete or aborted runs.
 */
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
          ? ['[Run Interrupted] Process terminated manually before Lighthouse analysis could execute.']
          : isResponseError 
            ? [`Functional Failure: Web engine received error code [HTTP ${crawledPage.statusCode}]. Compliance tasks aborted.`]
            : ['Functional Error: Route map dropped before validation tasks finished execution.'],
        seoPassDetails: wasInterrupted ? (undefined as any) : []
      });
    } else {
      activeMatch.screenshotPath = crawledPage.screenshotPath;
      
      if (wasInterrupted) {
        if (activeMatch.seoScore === 100 && activeMatch.seoPassDetails.length === 0) {
          activeMatch.seoDetails = ['[Run Interrupted] Execution halted during live page inspection.'];
          activeMatch.seoPassDetails = undefined as any;
          activeMatch.a11yDetails = undefined as any;
        }
      }
    }
  });
}
