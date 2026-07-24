# Autonomous QA Governance Dashboard (PW-MCP)

## Overview

This project is an **Autonomous Test Generation and Regression Pipeline** built with TypeScript, Node.js, and Playwright. It combines traditional web crawling and static auditing (Accessibility/SEO) with an AI-driven Model Context Protocol (MCP) agent that writes execution tests on the fly. Finally, it uses a strict visual regression engine to catch pixel-level layout shifts, outputting all data to a custom, offline HTML dashboard.

---

## 🏗️ System Architecture & Data Flow

The system executes in a strict sequential pipeline orchestrated by `src/utils/orchestrator.ts`:

1.  **Crawler (`src/crawler/crawler.ts`):** Navigates the target site, respects page caps, and discovers internal links.
2.  **Parallel Auditors (`src/utils/pipeline/taskRunner.ts`):**
    - **A11y Engine:** Scans for WCAG violations and generates visual heatmaps (`map_*.png`) for failing pages.
    - **SEO Engine:** Analyzes DOM metadata and structural SEO metrics.
3.  **Autonomous MCP Agent (`src/utils/pipeline/mcpClient.ts`):**
    - Extracts a verified JSON schema of interactive DOM elements.
    - Sends the schema to a local LLM (via LM Studio/Qwen) with a strict prompt blueprint (`mcp_prompt_blueprint.txt`).
    - Compiles independent, isolated Playwright `.spec.ts` validation tests for each element.
    - Saves generated tests to `tests/mcp/`.
4.  **Data Backfill (`src/utils/pipeline/dataBackfill.ts`):** Ensures incomplete, timed-out, or interrupted pages are assigned fallback data (e.g., Status `0` or `503`) so the reporting engine does not crash.
5.  **Visual Engine (`tests/visual/visual.spec.ts`):** A native Playwright test suite that runs post-crawl to execute strict pixel-by-pixel comparisons against centralized baselines.
6.  **Reporter (`src/reporter/templates.ts`):** Compiles the pipeline array into a rich HTML dashboard injected with Chart.js for data visualization.

---

## 📂 Directory Structure

To help Copilot understand file routing, here is the strict directory structure:

```text
pw-mcp/
├── .github/workflows/          # CI/CD pipelines (ci.yml for unit tests)
├── reports/                    # Generated output
│   ├── baselines/              # Centralized visual regression baseline images
│   ├── visual_bridge.json      # Bridge file passing Playwright results to the HTML reporter
│   ├── last_crawled_urls.json  # URLs passed from the crawler to the visual engine
│   └── [hostname]/             # Host-specific reports (HTML dashboards, a11y screenshots)
├── src/                        # Core Application Logic
│   ├── auditors/               # A11y and SEO static analysis tools
│   ├── crawler/                # Web crawling logic
│   ├── reporter/               # Dashboard templates and HTML generation
│   ├── types/                  # Strict TypeScript interfaces (e.g., audit.ts)
│   └── utils/
│       ├── orchestrator.ts     # Main pipeline controller
│       └── pipeline/           # Sub-routines (mcpClient, dataBackfill, taskRunner)
├── tests/                      # Playwright Test Suites
│   ├── unit/                   # Unit tests for backend logic (pipeline, reporter, backfill)
│   ├── visual/                 # Visual regression suite (visual.spec.ts)
│   └── mcp/                    # LLM-generated element validation scripts
├── mcp_prompt_blueprint.txt    # System instructions for the autonomous LLM agent
├── playwright.config.ts        # Playwright config (testMatch: "**/*.{spec,test}.ts")
└── package.json                # Project dependencies and npm scripts
```
