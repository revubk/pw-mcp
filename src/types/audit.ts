export interface A11yErrorDetail {
  id: string;
  impact: string;
  description: string;
  help: string;
  targetSelector: string;
  htmlSnippet: string;
  elementText: string;
}

export interface PageAuditResult {
  url: string;
  status: number;
  a11yErrors: number;
  seoScore: number;
  screenshotPath?: string;
  a11yDetails: A11yErrorDetail[];
  seoDetails: string[];
  seoPassDetails: string[]; 
}

export interface RunHistoryRecord {
  runId: string;
  timestamp: string;
  targetUrl: string;
  deviceMode: DeviceFormFactor
  totalScanned: number;
  brokenCount: number;
  a11yViolations: number;
  avgSeoScore: number;
  reportFilename: string;
}

export type DeviceFormFactor = 'desktop' | 'tablet' | 'mobile';

export interface DetailedReportData {
  runId: string;
  targetUrl: string;
  timestamp: string;
  deviceMode: DeviceFormFactor;
  brokenCount: number;
  a11yViolationCount: number;
  pages: PageAuditResult[];
  incompletePages: string[];
}

export interface WizardAnswers {
  finalUrl: string;
  runA11y: boolean;
  runSeo: boolean;
  isHeadless: boolean;
  chosenDevice: 'desktop' | 'tablet' | 'mobile';
  pageCap: number;
}


export interface CrawlEngineResult {
  url: string;
  statusCode: number;
  isBroken: boolean;
  screenshotPath?: string;
}
