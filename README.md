# pw-mcp — Automated Accessibility, SEO, and Functional Audit Crawler

Lightweight TypeScript crawler that scans a target website to detect critical functional failures, accessibility regressions (Axe), and basic SEO issues. Designed as a developer tool to generate site-wide audit reports and a deployable "Go/No-Go" decision signal.

## Key Features

- Site crawl with internal link discovery (BFS) and duplicate suppression
- P1 functional checks: broken pages, HTTP errors, navigation failures
- P2 compliance checks: automated Axe accessibility scans and SEO metadata validations
- Report generation using templates in `src/reporter` and reusable UI components
- Pluggable auditors in `src/auditors` for extensibility

## Project layout

```
pw-mcp/
├── src/
│   ├── auditors/        # accessibility, seo, visual auditors
│   ├── crawler/         # crawl engine and link discovery
│   ├── reporter/        # report templates and components
│   ├── types/           # shared types and interfaces
│   └── utils/           # orchestrator, wizard, pipeline helpers
├── tests/               # sample projects / integration test pages
├── package.json
├── tsconfig.json
└── README.md
```

## Tech stack

- TypeScript (Node 18+)
- Playwright for browser automation
- @axe-core/playwright for accessibility checks

## Quickstart

1. Install dependencies:

```bash
npm install
```

2. Install Playwright browsers (Chromium recommended):

```bash
npx playwright install chromium
```

3. (Optional) Set a default target URL via env var:

```bash
export TARGET_URL="https://example.com"
```

4. Run the crawler (example):

```bash
npm start
```

The CLI will guide you through a small wizard (target URL source, headless/headed, device emulation, page cap, and which audit tiers to run).

### Output locations

After a run completes, HTML reports are written under:

- `reports/<target-host>/index.html` (dashboard history)
- `reports/<target-host>/report_<RUN_ID>.html` (per-run details)
- `reports/<target-host>/history_database.json` (run history)

## Configuration notes

- `TARGET_URL` is read by `src/utils/wizard.ts` as the default when choosing “Use default from .env file”.
- Page cap is controlled by the wizard (“Standard Limit (Max 15 Pages)”, “Scan All”, or a custom number).

Check `package.json` for available scripts.

## AI-generated Playwright test flows (MCP + Gemini)

`src/utils/pipeline/mcpClient.ts` uses Microsoft's Playwright MCP server to extract the interactive
DOM schema of each crawled page, then sends that schema (plus the instructions in
`mcp_prompt_blueprint.txt`) to an LLM to generate a short, realistic interaction sequence
(fill/click/assert) that gets spliced into an auto-generated `*.spec.ts` file under `tests/<host>/`.

**Model priority:**

1. **Gemini (free tier)** — used automatically if `GEMINI_API_KEY` is set.
2. **LM Studio** (local, OpenAI-compatible server) — used if `LM_STUDIO_MODEL` is set and Gemini
   isn't configured (or its call fails).
3. **Local Ollama** (`deepseek-r1:1.5b` on `http://localhost:11434`) — final local fallback if
   neither of the above is set up or reachable.
4. **Static fallback template** — used if no AI backend produces usable output.

### Setup — Gemini

1. Get a free Gemini API key from Google AI Studio (aistudio.google.com/apikey).
2. Add it to your `.env` file (create one at the repo root if it doesn't exist):
   ```bash
   GEMINI_API_KEY="your-key-here"
   # Optional — defaults to gemini-2.0-flash, which is on the free tier
   GEMINI_MODEL="gemini-2.0-flash"
   ```
3. Run the crawler as usual (`npm start`). You'll see `🧠 [Gemini Active]` in the logs when it's
   being used, or a fallback notice if the key is missing/rate-limited.

### Setup — LM Studio (e.g. running a Gemma model locally)

1. In LM Studio, download a Gemma model (e.g. `gemma-2-9b-it` or a smaller quantized variant) and
   load it.
2. Go to the **Local Server** tab (the `<->` icon) and click **Start Server**. Note the exact model
   identifier shown there — that's what you'll set below, and it must match exactly.
3. Add to your `.env`:
   ```bash
   LM_STUDIO_MODEL="gemma-2-9b-it"   # use the exact identifier LM Studio shows
   LM_STUDIO_BASE_URL="http://localhost:1234/v1"   # default LM Studio port; change if you customized it
   ```
4. Leave `GEMINI_API_KEY` unset (or blank) so the code falls through to LM Studio. If both are set,
   Gemini wins — LM Studio only activates when Gemini isn't configured or its call fails.
5. Run `npm start`. You'll see `🧠 [LM Studio Active]` in the logs when it's being used.

**Notes on quality:** Gemma models (especially smaller/quantized ones under ~9B) are noticeably
weaker at strictly following the "output only these Playwright lines, nothing else" instruction than
Gemini or larger cloud models. The code's sanitizer strips markdown fences and prose, but if you see
empty or malformed generations, try a larger Gemma variant, lower the temperature further, or check
LM Studio's console to confirm the server actually received the request (a firewall or wrong port is
the most common failure mode — you'll see a "call failed" log line with the reason if so).

### Tuning accuracy

The actual generation rules live in `mcp_prompt_blueprint.txt` at the repo root — edit that file to
change how the model selects selectors, orders interactions, or how many statements it emits. It's
loaded fresh on every run, so no rebuild is needed. Keep in mind the model only ever receives the
top 10 interactive elements (`a, button, input, select`) found in the viewport, so if a flow isn't
being generated correctly, check whether the target element is actually in that captured schema
first.

**Free-tier limits:** Gemini's free tier is rate-limited per minute and per day (check Google's
current published limits). If you're crawling many pages quickly, expect occasional `429` fallbacks
to Ollama — this is handled automatically and won't fail the crawl.

## Contributing

- Add new auditors under `src/auditors` and register them with the orchestrator in `src/index.ts`.
- Keep reports and UI components in `src/reporter` for consistent output.

## Notes

- This repo is intended as a developer-facing tool for CI / pre-release checks. Integrate results into CI pipelines or extend output formats as needed.

---

File: `README.md` — updated to reflect repository purpose and structure.
