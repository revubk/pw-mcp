import { test, expect } from "@playwright/test";
import {
  generateDashboardHtml,
  renderPageBlockTemplate,
} from "../../src/reporter/templates";
import { DetailedReportData, PageAuditResult } from "../../src/types/audit";

test.describe("Dashboard Reporter Logic", () => {
  test("Reporter should surface visual failures even when no diff image is attached", () => {
    const pageData: PageAuditResult = {
      url: "https://lbb.in/",
      status: 200,
      a11yErrors: 0,
      seoScore: 100,
      a11yDetails: [],
      seoDetails: [],
      seoPassDetails: [],
      visualResults: { status: "failed" },
    };

    const htmlOutput = renderPageBlockTemplate(pageData, "TEST2");

    expect(htmlOutput).toContain("Layout Shift Detected");
    expect(htmlOutput).not.toContain(
      "Visual Layout Verified / Baseline Established",
    );
  });

  test("Dashboard should accurately categorize functional vs broken pages regardless of A11y errors", () => {
    const mockData: DetailedReportData = {
      runId: "TEST1",
      targetUrl: process.env.TARGET_URLS || "https://lbb.in/",
      timestamp: new Date().toLocaleString(),
      deviceMode: "desktop",
      brokenCount: 0,
      a11yViolationCount: 209,
      incompletePages: [],
      pages: [
        {
          url: process.env.TARGET_URLS || "https://lbb.in/",
          status: 200,
          a11yErrors: 209, // High errors (previously caused it to drop out of 'Healthy')
          seoScore: 90,
          a11yDetails: [],
          seoDetails: [],
          seoPassDetails: [],
          visualResults: { status: "passed" },
        },
      ],
    };

    const htmlOutput = generateDashboardHtml(mockData);

    expect(htmlOutput).toContain('<div class="metric-value">1</div>'); // Pages Discovered

    expect(htmlOutput).toContain(
      '<div class="metric-value" style="color: var(--success);">1</div>',
    ); // Functional
    expect(htmlOutput).toContain(
      '<div class="metric-value" style="color: var(--danger);">0</div>',
    ); // Broken

    expect(htmlOutput).toContain("data: [1, 0]");
  });
});
