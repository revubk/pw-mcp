import { PageAuditResult } from "../../src/types/audit";

export function backfillIncompletePages(
  executionSummary: any[],
  structuredPagesList: PageAuditResult[],
  wasInterrupted: boolean,
): void {
  if (!executionSummary || !Array.isArray(executionSummary)) return;

  executionSummary.forEach((item) => {
    const alreadyAudited = structuredPagesList.find((p) => p.url === item.url);

    if (!alreadyAudited) {
      structuredPagesList.push({
        url: item.url,
        // Assign 503 if user aborted, 0 if it just failed to load
        status: wasInterrupted ? 503 : 0,
        a11yErrors: 0,
        seoScore: 0,
        a11yDetails: [],
        seoDetails: wasInterrupted
          ? ["Interrupted: Run aborted manually."]
          : ["Failed to completely load or audit page."],
        seoPassDetails: [],
        visualResults: { status: "passed" },
      });
    }
  });
}
