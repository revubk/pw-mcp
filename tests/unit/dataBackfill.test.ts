import { test, expect } from "@playwright/test";
import { backfillIncompletePages } from "../../src/utils/pipeline/dataBackfill";
import { PageAuditResult, DeviceFormFactor } from "../../src/types/audit";

test.describe("Data Backfill Utility", () => {
  const mockDevice: DeviceFormFactor = "desktop";

  test("should not modify complete page results", () => {
    const completePage: PageAuditResult = {
      url: "https://example.com/good",
      status: 200,
      a11yErrors: 0,
      seoScore: 98,
      a11yDetails: [],
      seoDetails: [],
      seoPassDetails: [],
      visualResults: { status: "passed" },
    };

    const inputPages = [completePage];
    // We don't need execution summary or interrupt flag for this test case
    backfillIncompletePages([], inputPages, false);

    expect(inputPages.length).toBe(1);
    expect(inputPages[0]).toEqual(completePage);
  });

  test('should backfill pages marked as "Incomplete" in execution summary', () => {
    const urlToBackfill = "https://example.com/slow";

    // Simulate a page that timed out or failed during crawl
    const executionSummaryItem = {
      url: urlToBackfill,
      status: "Incomplete", // Crawler status
      // ... other summary props
    };

    // The main list where partial results might exist
    const pagesList: PageAuditResult[] = [];

    backfillIncompletePages([executionSummaryItem], pagesList, false);

    expect(pagesList.length).toBe(1);
    expect(pagesList[0].url).toBe(urlToBackfill);
    // Expect default values for failed/incomplete audits
    expect(pagesList[0].status).toBe(0); // Placeholder status
    expect(pagesList[0].a11yErrors).toBe(0);
    expect(pagesList[0].seoScore).toBe(0);
    // Ensure arrays are initialized to prevent UI crashes
    expect(Array.isArray(pagesList[0].a11yDetails)).toBe(true);
  });

  test("should mark interrupted pages with a specific status", () => {
    const urlInProgress = "https://example.com/pending";
    const executionSummaryItem = { url: urlInProgress, status: "Crawling" };
    const pagesList: PageAuditResult[] = [];

    // Simulate user pressing Ctrl+C
    backfillIncompletePages([executionSummaryItem], pagesList, true);

    expect(pagesList.length).toBe(1);
    // Expect a custom status indicating it was cut short
    expect(pagesList[0].status).toBe(503); // Service Unavailable / Interrupted
    expect(pagesList[0].seoDetails[0]).toContain("Interrupted");
  });
});
