# Automated Web Accessibility, SEO, and Core Functional Audit Crawler (Minor Project)

An automated web crawler engine built to eliminate manual website regression testing bottlenecks. The application crawls full target web domains to catch high-priority structural bugs, track digital compliance metrics, and automatically deliver an instant deployment decision before software updates reach live users.

## 📌 Real-World Problem Statement
In modern web development, websites change daily. Manual regression testing is slow, expensive, and prone to human oversight. Traditional QA teams spend hundreds of hours manually checking for broken links, verifying alternate image text labels for screen readers, and checking page layout metadata. This bottleneck delays software shipping schedules. 

This project solves the issue by deploying a fast, automated browser engine that completely maps a website's layout within minutes. It automatically categorizes errors into clear priority tiers and outputs a mathematical "Go/No-Go" gate verdict, enabling teams to catch defects immediately and release software updates with confidence.

---

## 🛠️ Automated Testing Architecture

The system splits testing parameters into two distinct operational tiers to guide business rollout decisions:

### 🔴 Priority 1 (P1): Critical Functional Health
* **Broken Page Tracing**: Intercepts active network paths to catch `404 Not Found` or `500 Server Error` browser failures.
* **Navigation Failures**: Logs application structural routing loops or page crashes.

### 🟡 Priority 2 (P2): Compliance & Discoverability
* **Accessibility Inspections (Axe-Core)**: Programmatically scans the DOM tree to locate digital accessibility barriers (WCAG rules compliance) impacting users with visual or physical impairments.
* **Technical SEO Audits (Lighthouse Core Rules)**: Validates document headers, viewport responsiveness patterns, and presence of essential page metadata descriptions for search engines.

---

## 🧩 Tech Stack
* **Language Runtime**: TypeScript (Node.js ecosystem)
* **Automation Driver**: Playwright (Headless multi-browser simulation)
* **Compliance Rules Engine**: `@axe-core/playwright`
* **Development IDE**: Visual Studio Code

---

## 📂 Project Structure
```text
site-auditor-crawler/
├── src/
│   ├── crawler/
│   │   └── crawler.ts       # Crawling engine & internal link BFS explorer
│   ├── auditors/
│   │   ├── accessibility.ts # Automated Axe-core accessibility scanners
│   │   └── seo.ts           # Page layout metadata verification modules
│   └── index.ts             # Orchestration logic & Go/No-Go threshold analyzer
├── package.json             # Dependencies configuration files
├── tsconfig.json            # TypeScript build rules definition
└── README.md                # Project documentation manual
```

---

## 🚀 Getting Started & Local Demo Setup

### Prerequisites
Make sure you have [Node.js](https://nodejs.org) (v18 or higher) installed on your computer.

### 1. Clone & Install Dependencies
Navigate into your project folder and run the installation script:
```bash
npm install
```

### 2. Install Playwright Browsers
Download the optimized local browser engine binaries required for headless execution:
```bash
npx playwright install chromium
```

### 3. Run the Automated Suite
Compile the TypeScript code and execute the live crawler scanner against your target test page:
```bash
npm start
```

---

## 📊 Sample Dashboard Output Matrix
When run, the tool outputs real-time monitoring statistics directly to your execution console:

```text
🚀 Starting Automated Site Audit for: https://example.com

🔎 Auditing: https://example.com
🔎 Auditing: https://example.comabout
🔎 Auditing: https://example.comservices/pricing

======================================
       FINAL RELEASE AUDIT REPORT      
======================================
• Total Pages Scanned  : 14
• Broken Pages (P1)   : 0
• Accessibility Bugs  : 3

✅ STATUS: GO. Website meets core stability requirements.
```

---

## 🎓 Academic Learning Outcomes
* **Advanced Web Scraping Mechanics**: Implementing non-cyclic graph travel logic (Breadth-First Search) inside dynamic page runtimes.
* **Modern Web Standards Execution**: Translating standard WCAG laws into clear programmatic validation scripts.
* **Quality Assurance Gate Design**: Building data-driven conditional execution scripts that map test outcomes directly to corporate deployment workflows.
