import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { CrawlEngineResult } from '../types/audit';

export class WebCrawler {
  public visitedUrls: Set<string> = new Set();
  public queue: string[] = [];
  private baseUrl: string;
  private browser: Browser | null = null;
  private isForceStopped: boolean = false;

  constructor(startUrl: string) {
    this.baseUrl = new URL(startUrl).origin;
    this.queue.push(startUrl);
    
    const hostName = new URL(startUrl).hostname.replace(/[^a-z0-9]/gi, '_');
    const screenshotDir = path.join(process.cwd(), 'reports', hostName, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  }

  public stopGracefully(): void {
    this.isForceStopped = true;
  }

    public async startCrawl(
    headless: boolean, 
    runId: string,
    deviceMode: 'desktop' | 'tablet' | 'mobile',
    pageCapLimit: number, // 🔥 Pass limits ceiling parameters downstream
    onPageDiscover: (page: Page, url: string, statusCode: number, currentProgress: number, calculatedTotal: number) => Promise<{ a11yErrors: number; seoScore: number }>
  ): Promise<CrawlEngineResult[]> {
    let currentHeadlessMode = headless;
    const hostName = new URL(this.baseUrl).hostname.replace(/[^a-z0-9]/gi, '_');
    const results: CrawlEngineResult[] = [];

    this.browser = await chromium.launch({ 
      headless: currentHeadlessMode, 
      slowMo: currentHeadlessMode ? 0 : 300,
      args: ['--remote-debugging-port=9222'] 
    });
    
    let viewportSize = { width: 1280, height: 800 };
    if (deviceMode === 'tablet') viewportSize = { width: 768, height: 1024 };
    else if (deviceMode === 'mobile') viewportSize = { width: 375, height: 667 };

    let context = await this.browser.newContext({ viewport: viewportSize });

    // 🔥 LOOP CEILING GUARD: Evaluate active constraints on each round
    while (this.queue.length > 0 && !this.isForceStopped) {
      
      const currentUrl = this.queue.shift()!;
      const cleanCurrentUrl = currentUrl.split('#')[0];
      
      if (this.visitedUrls.has(cleanCurrentUrl)) continue;

      // Check if continuing this cycle breaches the chosen page boundary limit
      if (this.visitedUrls.size >= pageCapLimit) {
        console.log(`\n🛑 LIMIT REACHED: Crawler hit the selected maximum boundary limit of ${pageCapLimit} pages. Wrapping execution parameters cleanly...`);
        break; // Break loop execution cleanly
      }

      this.visitedUrls.add(cleanCurrentUrl);
      const currentProgressNumber = this.visitedUrls.size;
    
      const calculatedTotalVolume = this.visitedUrls.size + this.queue.length;

      const page = await context.newPage();

      try {
        const response = await page.goto(cleanCurrentUrl, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForLoadState('load');
        await page.waitForTimeout(500);

        const status = response ? response.status() : 500;
        const isBroken = status >= 400;

        const auditMetrics = await onPageDiscover(page, cleanCurrentUrl, status, currentProgressNumber, calculatedTotalVolume);

        let screenshotFilename: string | undefined = undefined;
        if (isBroken || auditMetrics.a11yErrors > 0) {
          const fileSafeName = cleanCurrentUrl.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
          screenshotFilename = `screenshots/fail_${runId}_${fileSafeName}.png`;
          const fullPath = path.join(process.cwd(), 'reports', hostName, screenshotFilename);
          await page.screenshot({ path: fullPath, fullPage: true });
        }

        results.push({ url: cleanCurrentUrl, statusCode: status, isBroken, screenshotPath: screenshotFilename });

        if (!isBroken) {
          const anchorLocators = page.locator('a[href]');
          const count = await anchorLocators.count();

          for (let i = 0; i < count; i++) {
            const href = await anchorLocators.nth(i).getAttribute('href');
            if (href) {
              try {
                const absoluteUrl = new URL(href, cleanCurrentUrl).href;
                const cleanAbsoluteUrl = absoluteUrl.split('#')[0];

                if (cleanAbsoluteUrl.startsWith(this.baseUrl) && !this.visitedUrls.has(cleanAbsoluteUrl) && !this.queue.includes(cleanAbsoluteUrl)) {
                  this.queue.push(cleanAbsoluteUrl);
                }
              } catch (_) {}
            }
          }
        }
      } catch (error) {
        const fileSafeName = cleanCurrentUrl.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
        const screenshotFilename = `screenshots/fail_${runId}_${fileSafeName}.png`;
        const fullPath = path.join(process.cwd(), 'reports', hostName, screenshotFilename);
        try { await page.screenshot({ path: fullPath, fullPage: true }); } catch (_) {}

        results.push({ url: cleanCurrentUrl, statusCode: 500, isBroken: true, screenshotPath: screenshotFilename });
      } finally {
        await page.close();
      }
    }

    await this.browser.close();
    return results;
  }
}
