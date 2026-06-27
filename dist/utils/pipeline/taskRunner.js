"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeParallelAudits = executeParallelAudits;
const accessibility_1 = require("../../auditors/accessibility");
const seo_1 = require("../../auditors/seo");
/**
 * Executes Axe-Core and programmatic Lighthouse audits concurrently to optimize pipeline speeds.
 */
async function executeParallelAudits(page, url, scanA11y, scanSeo, deviceMode) {
    const tasks = [];
    if (scanA11y)
        tasks.push((0, accessibility_1.runAccessibilityAudit)(page, url));
    if (scanSeo)
        tasks.push((0, seo_1.runSeoAudit)(page, url, deviceMode));
    const auditResults = await Promise.all(tasks);
    let resultIndex = 0;
    let a11yErrorsOnPage = 0;
    let pageA11yDetails = [];
    let seoScoreOnPage = 100;
    let pageSeoDetails = [];
    let pageSeoPassDetails = [];
    if (scanA11y) {
        const a11yData = auditResults[resultIndex++];
        a11yErrorsOnPage = a11yData.violationCount;
        pageA11yDetails = a11yData.violations || [];
    }
    else {
        pageA11yDetails = undefined;
    }
    if (scanSeo) {
        const seoData = auditResults[resultIndex];
        seoScoreOnPage = seoData.score;
        pageSeoDetails = seoData.missingDetails || [];
        pageSeoPassDetails = seoData.passingDetails || [];
    }
    else {
        pageSeoDetails = undefined;
        pageSeoPassDetails = undefined;
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
