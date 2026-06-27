"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backfillIncompletePages = backfillIncompletePages;
function backfillIncompletePages(executionSummary, structuredPagesList, wasInterrupted) {
    executionSummary.forEach(crawledPage => {
        const activeMatch = structuredPagesList.find(p => p.url === crawledPage.url);
        if (!activeMatch) {
            const isResponseError = crawledPage.statusCode >= 400;
            structuredPagesList.push({
                url: crawledPage.url,
                status: crawledPage.statusCode,
                a11yErrors: 0,
                seoScore: 0,
                a11yDetails: wasInterrupted ? undefined : [],
                seoDetails: wasInterrupted
                    ? ['[Run Interrupted] Process terminated manually before compilation completed.']
                    : isResponseError
                        ? [`Functional Failure: Server responded with error code [HTTP ${crawledPage.statusCode}].`]
                        : ['Functional Error: Route map dropped before validation tasks finished.'],
                seoPassDetails: wasInterrupted ? undefined : []
            });
        }
        else {
            activeMatch.screenshotPath = crawledPage.screenshotPath;
        }
    });
}
