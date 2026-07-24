import axios from "axios";
import * as fs from "fs";
import * as path from "path";

interface DomElementNode {
  tagName: string;
  text?: string;
  id?: string;
  className?: string;
  placeholder?: string;
  name?: string;
  type?: string;
  href?: string;
  aria?: string;
  "data-testid"?: string;
  value?: string;
  cssPath?: string;
}

async function extractVerifiedDomSchema(page: any): Promise<DomElementNode[]> {
  try {
    const rawElements: DomElementNode[] = await page.evaluate(() => {
      const selectors = [
        "main button",
        "main input",
        "main select",
        "main textarea",
        "main a[href]",
        '[role="button"]',
        "button",
        "a[href]",
        "input",
        "select",
        "textarea",
        "[role]",
      ].join(",");

      const nodes = Array.from(document.querySelectorAll(selectors));

      function cssPath(el: Element) {
        if (!(el instanceof Element)) return "";
        const parts: string[] = [];
        let node = el as Element;
        while (
          node &&
          node.nodeType === 1 &&
          node.tagName.toLowerCase() !== "html"
        ) {
          let part = node.tagName.toLowerCase();
          if (node.id) {
            part += `#${node.id}`;
            parts.unshift(part);
            break;
          }
          const cls =
            node.className && typeof node.className === "string"
              ? node.className.trim().split(/\s+/)[0]
              : "";
          if (cls) part += `.${cls}`;
          const parent = node.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children).filter(
              (c) => c.tagName === node.tagName,
            );
            if (siblings.length > 1) {
              const idx = siblings.indexOf(node) + 1;
              part += `:nth-of-type(${idx})`;
            }
          }
          parts.unshift(part);
          node = node.parentElement as Element;
        }
        return parts.join(" > ");
      }

      return nodes
        .map((el) => {
          const ariaLabel =
            el.getAttribute &&
            (el.getAttribute("aria-label") ||
              el.getAttribute("aria-labelledby"));
          const label = ((): string | null => {
            try {
              if (el instanceof HTMLElement) {
                const labelled = (el as HTMLElement).getAttribute(
                  "aria-labelledby",
                );
                if (labelled) {
                  const ref = document.getElementById(labelled);
                  if (ref)
                    return ref.textContent?.trim().substring(0, 60) || null;
                }
              }
            } catch (e) {}
            return null;
          })();

          const value = (el as HTMLInputElement).value || "";
          const datasetTest =
            (el as HTMLElement).dataset?.testid ||
            el.getAttribute("data-testid") ||
            "";

          const nodeData: any = { tagName: el.tagName.toLowerCase() };

          const text = el.textContent?.trim().substring(0, 80);
          if (text) nodeData.text = text;
          if (el.id) nodeData.id = el.id;
          if (el.className)
            nodeData.className = el.className
              .toString()
              .trim()
              .substring(0, 80);

          const placeholder = el.getAttribute && el.getAttribute("placeholder");
          if (placeholder) nodeData.placeholder = placeholder;

          const name = el.getAttribute && el.getAttribute("name");
          if (name) nodeData.name = name;

          const type = el.getAttribute && el.getAttribute("type");
          if (type) nodeData.type = type;

          const href = el.getAttribute && el.getAttribute("href");
          if (href) nodeData.href = href;

          const finalAria = ariaLabel || label;
          if (finalAria) nodeData.aria = finalAria;

          if (datasetTest) nodeData["data-testid"] = datasetTest;
          if (value) nodeData.value = value;

          const path = cssPath(el);
          if (path) nodeData.cssPath = path;

          return nodeData;
        })
        .slice(0, 45);
    });
    return rawElements;
  } catch (err) {
    console.warn("⚠️ [MCP Agent] Failed to extract DOM schema:", err);
    return [];
  }
}

export async function executeAutonomousMcpAgent(
  page: any,
  url: string,
): Promise<string | null> {
  const lmStudioUrl =
    process.env.LM_STUDIO_URL || "http://localhost:1234/v1/chat/completions";
  const modelName = process.env.LM_STUDIO_MODEL || "qwen2.5-coder-7b-instruct";

  const verifiedSchema = await extractVerifiedDomSchema(page);
  if (verifiedSchema.length === 0) {
    console.log(
      "   ⚠️ [MCP Agent] No interactive elements found in DOM. Skipping validation script.",
    );
    return null;
  }

  let blueprintPrompt = "";
  const blueprintPath = path.join(process.cwd(), "mcp_prompt_blueprint.txt");
  if (fs.existsSync(blueprintPath)) {
    blueprintPrompt = fs.readFileSync(blueprintPath, "utf8");
  }

  const constrainedSystemPrompt = `${blueprintPrompt}

  CRITICAL INSTRUCTION: You are provided with a JSON list of VERIFIED elements currently in the DOM. You are forbidden from targeting any element NOT on this list. Generate a compact smoke-suite for the page rather than a random selector dump. Prefer accessible locators such as getByRole, getByLabel, getByPlaceholder, and getByText. For generic pages, verify a visible heading, one meaningful link or button, and one content section. If a form exists, verify the field and submit action in a simple realistic flow. Avoid brittle CSS class selectors unless no better option exists. Output only raw Playwright statements that are stable and useful for functional, UI, and accessibility smoke coverage.`;

  const userPayload = `Target URL: ${url}
  
  VERIFIED DOM CONTENT ELEMENTS PRESENT ON PAGE (Schema for Validation):
  ${JSON.stringify(verifiedSchema, null, 2)}`;

  try {
    console.log(
      `   🧠 [Local AI] Querying model (${modelName}) for per-element validation script...`,
    );

    const response = await axios.post(
      lmStudioUrl,
      {
        model: modelName,
        messages: [
          { role: "system", content: constrainedSystemPrompt },
          { role: "user", content: userPayload },
        ],
        temperature: 0.1,
        max_tokens: 1536,
      },
      { timeout: 180000 },
    );

    const rawContent = response.data.choices[0]?.message?.content || "";
    const cleanedStatements = rawContent
      .replace(/```typescript/g, "")
      .replace(/```ts/g, "")
      .replace(/```/g, "")
      .trim();

    if (!cleanedStatements) {
      console.log(
        "   ⚠️ [MCP Agent] Model returned empty interaction statements.",
      );
      return null;
    }

    const testFileContent = `import { test, expect } from '@playwright/test';

test('Autonomous Element Validation — Route: ${url}', async ({ page }) => {
  await page.goto('${url}', { waitUntil: 'networkidle' });
  
  // AI Generated Element-by-Element Validation Tests based on Verified Schema
  ${cleanedStatements}
});
`;

    const safeFilename = url.replace(/[^a-z0-9]/gi, "_").toLowerCase();

    const testsDir = path.join(process.cwd(), "tests", "mcp");
    if (!fs.existsSync(testsDir)) {
      fs.mkdirSync(testsDir, { recursive: true });
    }

    const scriptPath = path.join(testsDir, `${safeFilename}.spec.ts`);
    fs.writeFileSync(scriptPath, testFileContent, "utf8");

    return scriptPath;
  } catch (error: any) {
    const aiErrorMessage =
      error.response?.data?.error?.message || error.message;

    console.error(
      `   ❌ [MCP Agent Error] Failed to generate script for ${url}:`,
      aiErrorMessage,
    );
    return null;
  }
}
