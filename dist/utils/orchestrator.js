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
const reporter_1 = require("../reporter/reporter");
const taskRunner_1 = require("./pipeline/taskRunner");
const dataBackfill_1 = require("./pipeline/dataBackfill");
const canvasInject_1 = require("./pipeline/canvasInject");
const mcpClient_1 = require("./pipeline/mcpClient");
const path = __importStar(require("path"));
/**
 * Main Central Orchestrator.
 * Routes traffic to isolated single-responsibility pipeline modules.
 */
async function executeSiteAudit(targetSite, scanA11y, scanSeo, headless, deviceMode, pageCapValue, runMcpAgent) {
    const runId = Math.random().toString(36).substring(2, 7).toUpperCase();
    const hostName = new URL(targetSite).hostname.replace(/[^a-z0-9]/gi, '_');
    console.log('\n========================================================================');
    console.log(`🚀 AUTOMATED AUDIT PIPELINE ENGINE INITIALIZED [RUN ID: ${runId}]`);
    console.log(`🎯 Target Platform  : ${targetSite}`);
    console.log(`📱 Device Emulation : ${deviceMode.toUpperCase()}`);
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
                // 1. Invoke Decoupled Parallel Task Auditor Component
                const audits = await (0, taskRunner_1.executeParallelAudits)(page, url, scanA11y, scanSeo, deviceMode);
                a11yErrorsOnPage = audits.a11yErrorsOnPage;
                pageA11yDetails = audits.pageA11yDetails;
                seoScoreOnPage = audits.seoScoreOnPage;
                pageSeoDetails = audits.pageSeoDetails;
                pageSeoPassDetails = audits.pageSeoPassDetails;
                aggregateA11yIssues += a11yErrorsOnPage;
                // 2. Invoke Decoupled Background Playwright MCP Automation Channel Component
                if (runMcpAgent) {
                    console.log(`🤖 [MCP AGENT] Spawning background automation script compiler for: ${url}`);
                    const activeScriptFile = await (0, mcpClient_1.executeAutonomousMcpAgent)(url);
                    console.log(`   💾 Automated test compiled and saved cleanly to: ${activeScriptFile}`);
                }
                // 3. Invoke Decoupled Canvas Color Tagging Component
                if (scanA11y && a11yErrorsOnPage > 0) {
                    await (0, canvasInject_1.injectVisualColorsChart)(page, pageA11yDetails);
                    await page.waitForTimeout(1000); // Stable paint layout grace period pause
                    const fileSafeName = url.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 40);
                    const imgFilename = `screenshots/map_${runId}_${fileSafeName}.png`;
                    const fullImgPath = path.join(process.cwd(), 'reports', hostName, imgFilename);
                    await page.screenshot({ path: fullImgPath, fullPage: true, animations: 'disabled' });
                    screenshotPath = imgFilename;
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
        console.error('Pipeline orchestrator root exception:', err);
    }
    finally {
        process.off('SIGINT', handleInterrupt);
    }
    // 4. Invoke Decoupled Fault-Tolerant State Recovery Component
    (0, dataBackfill_1.backfillIncompletePages)(executionSummary, structuredPagesList, wasInterrupted);
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
