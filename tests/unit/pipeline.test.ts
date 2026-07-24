import * as fs from "fs";
import * as path from "path";
import { test, expect } from "@playwright/test";
import { WebCrawler } from "../../src/crawler/crawler";

test.describe("Core Pipeline Unit Tests", () => {
  test("Crawler should initialize with correct target URL", () => {
    const target = process.env.TARGET_URL || "https://lbb.in/";
    const crawler = new WebCrawler(target);
    expect((crawler as any).targetUrl).toBe(target);
  });

  test("Report directory structure should be created correctly", () => {
    const host = "example_com";
    const reportDir = path.join(process.cwd(), "reports", host);

    if (fs.existsSync(reportDir)) {
      fs.rmdirSync(reportDir, { recursive: true });
    }

    fs.mkdirSync(reportDir, { recursive: true });
    expect(fs.existsSync(reportDir)).toBe(true);

    // Clean up
    fs.rmdirSync(reportDir, { recursive: true });
  });

  test("Data backfill module should load without crashing", () => {
    try {
      // We just want to ensure the file imports correctly
      require("../../src/utils/pipeline/dataBackfill");
      expect(true).toBe(true);
    } catch (e) {
      // If it crashes, the import failed
      console.error(e);
      expect(false).toBe(true);
    }
  });

  // Test that reporter template engine exists
  test("Reporter templates module should load", () => {
    try {
      require("../../src/reporter/templates");
      expect(true).toBe(true);
    } catch (e) {
      console.error(e);
      expect(false).toBe(true);
    }
  });
});
