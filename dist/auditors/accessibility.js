"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAccessibilityAudit = runAccessibilityAudit;
const playwright_1 = require("@axe-core/playwright");
async function runAccessibilityAudit(page, url) {
    try {
        const results = await new playwright_1.AxeBuilder({ page }).analyze();
        const enrichedViolations = [];
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
                }
                catch (_) { }
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
    }
    catch (error) {
        return { url, violationCount: 0, violations: [] };
    }
}
