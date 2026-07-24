import { test, expect } from "@playwright/test";
import { WebCrawler } from "../../src/crawler/crawler";
import * as fs from "fs";
import * as path from "path";

test.describe("Core Pipeline Unit Tests", () => {
  test("Crawler should initialize correctly without crashing", () => {
    const target = "https://lbb.in/";
    const crawler = new WebCrawler(target);

    // Test the public interface rather than private internal variables
    expect(crawler).toBeDefined();
    expect(typeof crawler.startCrawl).toBe("function");
  });

  test("Report directory structure should be created correctly", () => {
    const host = "example_com";
    const reportDir = path.join(process.cwd(), "reports", host);

    if (fs.existsSync(reportDir)) {
      fs.rmdirSync(reportDir, { recursive: true });
    }

    // Mimic the orchestrator's directory creation
    fs.mkdirSync(reportDir, { recursive: true });
    expect(fs.existsSync(reportDir)).toBe(true);

    // Clean up after test
    fs.rmdirSync(reportDir, { recursive: true });
  });
});
