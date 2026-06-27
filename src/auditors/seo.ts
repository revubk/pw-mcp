import { Page } from 'playwright';
import lighthouse from 'lighthouse';
import { DeviceFormFactor } from '../types/audit';

export interface SeoAuditResult {
  url: string;
  score: number;
  missingDetails: string[];
  passingDetails: string[];
}

export async function runSeoAudit(page: Page, url: string, deviceMode: DeviceFormFactor): Promise<SeoAuditResult> {
  const missingDetails: string[] = [];
  const passingDetails: string[] = [];
  let score = 100;

  try {
    const browser = page.context().browser();
    if (!browser) throw new Error('Browser context reference unreachable.');

    // Configure specific emulation flags depending on user input selections
    const lighthouseFlags: any = {
      port: 9222,
      onlyCategories: ['seo'],
      output: 'json',
      logLevel: 'error'
    };

    // Construct custom user configurations to override default mobile scaling
    const customConfig: any = {
      extends: 'lighthouse:default',
      settings: {
        onlyCategories: ['seo'],
        formFactor: deviceMode, // Maps 'desktop' | 'mobile' | 'tablet' directly
        // Disable screen emulation to let Lighthouse inherit the active Playwright viewport sizes smoothly
        screenEmulation: {
          disabled: true 
        }
      }
    };

    // Override the user agent for desktop execution profiles
    if (deviceMode === 'desktop') {
      customConfig.settings.emulatedUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
    } else if (deviceMode === 'tablet') {
      customConfig.settings.emulatedUserAgent = 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';
    }

    const runnerResult = await lighthouse(url, lighthouseFlags, customConfig);

    if (runnerResult && runnerResult.lhr) {
      const lhr = runnerResult.lhr;
      score = Math.round((lhr.categories.seo.score || 0) * 100);

      const audits = lhr.audits;
      for (const auditId in audits) {
        const audit = audits[auditId];
        if (audit.score === 1 && audit.title) {
          passingDetails.push(`Verified: ${audit.title}`);
        } else if (audit.score !== 1 && audit.score !== null && audit.title) {
          let failureMessage = `Lighthouse SEO [${audit.title}]: ${audit.description}`;
          if (audit.displayValue) failureMessage += ` (Detected: ${audit.displayValue})`;
          missingDetails.push(failureMessage);
        }
      }
    }
  } catch (error: any) {
    score = 0;
    missingDetails.push(`Lighthouse Engine Failure: ${error.message}`);
  }

  return { url, score, missingDetails, passingDetails };
}
