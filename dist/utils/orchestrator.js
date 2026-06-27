"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeSiteAudit = executeSiteAudit;
const crawler_1 = require("../crawler/crawler");
const accessibility_1 = require("../auditors/accessibility");
const seo_1 = require("../auditors/seo");
const reporter_1 = require("../reporter/reporter");
const path = __importStar(require("path"));
async function executeSiteAudit(targetSite, scanA11y, scanSeo, headless, deviceMode, pageCapValue) {
    const runId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const hostName = new URL(targetSite).hostname.replace(/[^a-z0-9]/gi, '_');
    console.log('\n========================================================================');
    console.log(`🚀 AUTOMATED RELEASE AUDIT PIPELINE INITIALIZED [RUN ID: ${runId}]`);
    console.log(`🎯 Target Platform  : ${targetSite}`);
    console.log(`📱 Device Emulation : ${deviceMode.toUpperCase()}`);
    console.log(`⚙️  Inspection Tiers : P1 (Functional Stability) | A11y: ${scanA11y ? 'ON' : 'OFF'} | SEO: ${scanSeo ? 'ON' : 'OFF'}`);
    console.log('========================================================================\n');
    const crawler = new crawler_1.WebCrawler(targetSite);
    const structuredPagesList = [];
    let aggregateA11yIssues = 0;
    let wasInterrupted = false;
    const handleInterrupt = () => {
        if (!wasInterrupted) {
            console.log('\n\n⚠️  [USER TERMINATION] Compiling structural metrics data...');
            wasInterrupted = true;
            crawler.stopGracefully();
        }
    };
    process.on('SIGINT', handleInterrupt);
    let executionSummary = [];
    try {
        executionSummary = await crawler.startCrawl(headless, runId, deviceMode, pageCapValue, async (page, url, statusCode, currentProgress, calculatedTotal) => {
            let a11yErrorsOnPage = 0;
            let seoScoreOnPage = 100;
            let pageA11yDetails = [];
            let pageSeoDetails = [];
            let pageSeoPassDetails = [];
            let screenshotPath = undefined;
            if (statusCode < 400) {
                const tasks = [];
                if (scanA11y)
                    tasks.push((0, accessibility_1.runAccessibilityAudit)(page, url));
                if (scanSeo)
                    tasks.push((0, seo_1.runSeoAudit)(page, url, deviceMode));
                const auditResults = await Promise.all(tasks);
                let resultIndex = 0;
                if (scanA11y) {
                    const a11yData = auditResults[resultIndex++];
                    a11yErrorsOnPage = a11yData.violationCount;
                    pageA11yDetails = a11yData.violations || [];
                    aggregateA11yIssues += a11yErrorsOnPage;
                    if (a11yErrorsOnPage > 0) {
                        const categoryColorsPalette = ['#d97706', '#2563eb', '#7c3aed', '#059669', '#db2777', '#0891b2', '#ea580c'];
                        const uniqueCategoryColorMap = {};
                        const categoryCounterRegistry = {};
                        let assignedColorsCount = 0;
                        for (const error of pageA11yDetails) {
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
                                            if (htmlEl.parentElement) {
                                                htmlEl.parentElement.appendChild(badge);
                                            }
                                            else {
                                                htmlEl.appendChild(badge);
                                            }
                                        }, { ruleId, color: activeCategoryColor, index: activeOccurrenceIndex });
                                    }
                                }
                                catch (_) { }
                            }
                        }
                        // 🔥 FIX 1: Add a mandatory browser execution paint pause to ensure all lower tags load completely
                        await page.waitForTimeout(1000);
                        const fileSafeName = url.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 40);
                        const imgFilename = `screenshots/map_${runId}_${fileSafeName}.png`;
                        const fullImgPath = path.join(process.cwd(), 'reports', hostName, imgFilename);
                        // 🔥 FIX 2: Set animations state to idle before capturing the image file
                        await page.screenshot({ path: fullImgPath, fullPage: true, animations: 'disabled' });
                        screenshotPath = imgFilename;
                    }
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
            }
            else {
                pageSeoDetails = [`Functional Failure Node: Server error [HTTP ${statusCode}].`];
                pageA11yDetails = [];
                pageSeoPassDetails = [];
            }
            const statusIndicator = statusCode >= 400 ? '❌ FAIL' : '✅ PASS';
            const a11yIndicator = scanA11y ? (a11yErrorsOnPage > 0 ? `⚠️ ${a11yErrorsOnPage} Flags` : 'Clear') : 'Disabled';
            const seoIndicator = scanSeo ? (seoScoreOnPage === 100 ? 'Optimal' : `⚠️ ${seoScoreOnPage}/100`) : 'Disabled';
            console.log(`[Running: ${currentProgress}/${calculatedTotal}] ${statusIndicator} | HTTP ${statusCode} | Accessibility: ${a11yIndicator} | SEO: ${seoIndicator}`);
            console.log(`   🔗 Path: ${url}\n`);
            structuredPagesList.push({
                url,
                status: statusCode,
                a11yErrors: a11yErrorsOnPage,
                seoScore: seoScoreOnPage,
                a11yDetails: pageA11yDetails,
                seoDetails: pageSeoDetails,
                seoPassDetails: pageSeoPassDetails,
                screenshotPath
            });
            return { a11yErrors: a11yErrorsOnPage, seoScore: seoScoreOnPage };
        });
    }
    catch (err) {
        console.error('Pipeline exception:', err);
    }
    finally {
        process.off('SIGINT', handleInterrupt);
    }
    executionSummary.forEach(crawledPage => {
        const activeMatch = structuredPagesList.find(p => p.url === crawledPage.url);
        if (!activeMatch) {
            structuredPagesList.push({
                url: crawledPage.url,
                status: crawledPage.statusCode,
                a11yErrors: 0,
                seoScore: 0,
                a11yDetails: wasInterrupted ? undefined : [],
                seoDetails: wasInterrupted ? ['[Run Interrupted] Manual termination.'] : ['Functional Error.'],
                seoPassDetails: wasInterrupted ? undefined : []
            });
        }
        else if (!activeMatch.screenshotPath && crawledPage.screenshotPath) {
            activeMatch.screenshotPath = crawledPage.screenshotPath;
        }
    });
    const detailedPayload = {
        runId,
        targetUrl: targetSite,
        timestamp: new Date().toLocaleString(),
        deviceMode: deviceMode,
        brokenCount: structuredPagesList.filter(r => r.status >= 400).length,
        a11yViolationCount: aggregateA11yIssues,
        pages: structuredPagesList,
        incompletePages: crawler.queue
    };
    (0, reporter_1.generateHistoricReportsHub)(detailedPayload);
}
