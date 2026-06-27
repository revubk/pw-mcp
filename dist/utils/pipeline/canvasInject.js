"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectVisualColorsChart = injectVisualColorsChart;
async function injectVisualColorsChart(page, violations) {
    const categoryColorsPalette = ['#d97706', '#2563eb', '#7c3aed', '#059669', '#db2777', '#0891b2', '#ea580c'];
    const uniqueCategoryColorMap = {};
    const categoryCounterRegistry = {};
    let assignedColorsCount = 0;
    for (const error of violations) {
        const sel = error.targetSelector;
        const ruleId = error.id;
        if (sel && sel !== 'html' && sel !== 'body' && sel !== 'main') {
            if (!uniqueCategoryColorMap[ruleId]) {
                uniqueCategoryColorMap[ruleId] = categoryColorsPalette[assignedColorsCount % categoryColorsPalette.length];
                assignedColorsCount++;
            }
            if (!categoryCounterRegistry[ruleId]) {
                categoryCounterRegistry[ruleId] = 0;
            }
            categoryCounterRegistry[ruleId]++;
            const activeCategoryColor = uniqueCategoryColorMap[ruleId];
            const activeOccurrenceIndex = categoryCounterRegistry[ruleId];
            try {
                const elementLocator = page.locator(sel).first();
                if (await elementLocator.count() > 0) {
                    await elementLocator.evaluate((el, config) => {
                        const htmlEl = el;
                        htmlEl.style.outline = `2px solid ${config.color}`;
                        htmlEl.style.outlineOffset = '1px';
                        htmlEl.style.position = 'relative';
                        const badge = document.createElement('div');
                        badge.innerText = `${config.ruleId} #${config.index}`;
                        badge.style.position = 'absolute';
                        badge.style.top = '-12px';
                        badge.style.left = '-2px';
                        badge.style.backgroundColor = config.color;
                        badge.style.color = '#ffffff';
                        badge.style.fontFamily = 'monospace';
                        badge.style.fontSize = '10px';
                        badge.style.fontWeight = 'bold';
                        badge.style.padding = '1px 5px';
                        badge.style.borderRadius = '3px';
                        badge.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
                        badge.style.zIndex = '99999';
                        badge.style.pointerEvents = 'none';
                        badge.style.whiteSpace = 'nowrap';
                        if (htmlEl.parentElement)
                            htmlEl.parentElement.appendChild(badge);
                        else
                            htmlEl.appendChild(badge);
                    }, { ruleId, color: activeCategoryColor, index: activeOccurrenceIndex });
                }
            }
            catch (_) { }
        }
    }
}
