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
}
async function extractVerifiedDomSchema(page: any): Promise<DomElementNode[]> {
  try {
    const rawElements: DomElementNode[] = await page.evaluate(() => {
      const selectors =
        'main button, main input, main select, main textarea, main a[href], [role="button"]';
      const nodes = Array.from(document.querySelectorAll(selectors));

      return nodes
        .map((el) => ({
          tagName: el.tagName.toLowerCase(),
          text: el.textContent?.trim().substring(0, 30) || "",
          id: el.id || "",
          className: el.className?.toString().substring(0, 30) || "",
          placeholder: el.getAttribute("placeholder") || "",
          name: el.getAttribute("name") || "",
          type: el.getAttribute("type") || "",
          href: el.getAttribute("href") || "",
        }))
        .slice(0, 25);
    });
    return rawElements;
  } catch (err) {
    console.warn("⚠️ [MCP Agent] Failed to extract DOM schema cleanly:", err);
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
      "   ⚠️ [MCP Agent] No interactive content elements found in DOM. Skipping per-element validation script.",
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
    console.error(
      `   ❌ [MCP Agent Error] Failed to generate script for ${url}:`,
      error.message,
    );
    return null;
  }
}
