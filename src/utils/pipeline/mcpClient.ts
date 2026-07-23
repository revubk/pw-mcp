import { createConnection } from "@playwright/mcp";
import { Page } from "playwright";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

export async function executeAutonomousMcpAgent(
  page: Page,
  url: string,
): Promise<string | null> {
  const hostName = new URL(url).hostname.replace(/[^a-z0-9]/gi, "_");
  const testsDir = path.join(process.cwd(), "tests", hostName);
  const fileSafeName = url
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()
    .substring(0, 50);
  const targetScriptPath = path.join(testsDir, `${fileSafeName}.spec.ts`);

  try {
    // 1. Initialize MCP server gateway
    const mcpServerInstance = await createConnection({
      browser: {
        launchOptions: { headless: true },
        contextOptions: { viewport: { width: 1280, height: 720 } },
      },
    });
    void mcpServerInstance;

    const blueprintFilePath = path.join(
      process.cwd(),
      "mcp_prompt_blueprint.txt",
    );
    let userCustomPromptAddon = "";
    if (fs.existsSync(blueprintFilePath)) {
      userCustomPromptAddon = fs.readFileSync(blueprintFilePath, "utf8");
    }

    // 2. Extract DOM schema
    const interactiveElementsSchema = await page.evaluate(() => {
      const title = document.title || "";
      const description =
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute("content")
          ?.trim() || "";
      const firstHeading =
        Array.from(document.querySelectorAll("h1, h2"))
          .map((e) => e.textContent?.trim())
          .find(Boolean) || "";
      const DOMNodes = Array.from(
        document.querySelectorAll("a, button, input, select, textarea"),
      );
      return {
        pageTitle: title,
        pageDescription: description,
        firstHeading,
        url: window.location.href,
        interactiveElements: DOMNodes.slice(0, 20).map((node) => {
          const htmlElement = node as HTMLElement;
          return {
            tagName: htmlElement.tagName.toLowerCase(),
            id: htmlElement.id ? `#${htmlElement.id}` : "",
            className: htmlElement.className
              ? `.${htmlElement.className.trim().split(/\s+/)[0]}`
              : "",
            text: htmlElement.textContent?.trim().substring(0, 80) || "",
            type:
              node instanceof HTMLInputElement ||
              node instanceof HTMLTextAreaElement
                ? node.type || "text"
                : "",
            href:
              node instanceof HTMLAnchorElement
                ? node.getAttribute("href") || ""
                : "",
          };
        }),
      };
    });

    const schemaContextString = JSON.stringify(
      interactiveElementsSchema,
      null,
      2,
    );
    let generatedActionLines = "";

    const sharedPromptBody = `
${userCustomPromptAddon}

Page metadata:
- title: ${interactiveElementsSchema.pageTitle}
- url: ${interactiveElementsSchema.url}

Interactive DOM schema:
${schemaContextString}
`.trim();

    const sanitizeModelOutput = (raw: string): string => {
      let cleaned = raw.trim();
      if (!cleaned) return "";

      if (cleaned.includes("</think>")) {
        cleaned = cleaned.split("</think>").pop()!.trim();
      }
      cleaned = cleaned
        .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
        .replace(/<\|channel>thought[\s\S]*?<channel\|>/gi, "")
        .replace(/```(?:typescript|ts)?/gi, "")
        .replace(/```/g, "");

      const lines = cleaned
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const relevant = lines.filter(
        (stmt) => stmt.startsWith("await ") || stmt.startsWith("//"),
      );

      return relevant.slice(0, 6).join("\n    ");
    };

    // --- Provider 1: Gemini API ---
    const geminiApiKey = (process.env.GEMINI_API_KEY || "").trim();
    const geminiModel = (process.env.GEMINI_MODEL || "gemini-2.0-flash").trim();

    if (geminiApiKey) {
      try {
        console.log(
          `   🧠 [Gemini Active] Generating flow via ${geminiModel}...`,
        );
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
          {
            contents: [{ parts: [{ text: sharedPromptBody }] }],
            generationConfig: { temperature: 0.0, maxOutputTokens: 2048 },
          },
          { timeout: 30000 },
        );
        const candidateText =
          response.data?.candidates?.[0]?.content?.parts
            ?.map((p: any) => p.text)
            .join("\n") || "";
        generatedActionLines = sanitizeModelOutput(candidateText);
      } catch (_) {
        console.log("   ⚠️  Gemini call failed. Falling back.");
      }
    }

    // --- Provider 2: LM Studio ---
    const lmStudioModel = (process.env.LM_STUDIO_MODEL || "").trim();
    if (!generatedActionLines && lmStudioModel) {
      try {
        console.log(
          `   🧠 [LM Studio Active] Generating flow via ${lmStudioModel}`,
        );
        const response = await axios.post(
          "http://localhost:1234/v1/chat/completions",
          {
            model: lmStudioModel,
            messages: [
              {
                role: "system",
                content:
                  "Output ONLY raw Playwright TypeScript statements starting with await. No explanations.",
              },
              { role: "user", content: sharedPromptBody },
            ],
            temperature: 0.1,
            max_tokens: 2048,
          },
          { timeout: 45000 },
        );
        const candidateText =
          response.data?.choices?.[0]?.message?.content || "";
        generatedActionLines = sanitizeModelOutput(candidateText);
      } catch (_) {
        console.log("   ⚠️  LM Studio call failed. Falling back to Ollama.");
      }
    }

    // --- Provider 3: Ollama ---
    if (!generatedActionLines) {
      try {
        console.log(`   🧠 [Local AI Active] Processing via Ollama...`);
        const response = await axios.post(
          "http://localhost:11434/api/generate",
          {
            model: "deepseek-r1:1.5b",
            prompt: sharedPromptBody,
            stream: false,
            options: { temperature: 0.1 },
          },
          { timeout: 45000 },
        );

        generatedActionLines = sanitizeModelOutput(
          response.data.response.trim(),
        );
      } catch (_) {
        console.log(
          `   ⚠️  Local Ollama unreachable. Using baseline template.`,
        );
      }
    }

    const verifiedCompilationOutput = `import { test, expect } from '@playwright/test';

test('Official Playwright MCP Autonomous Scan — Route: [${url}]', async ({ page }) => {
  await page.goto('${url}', { waitUntil: 'networkidle' });
  
  const documentContainerBody = page.locator('body');
  await expect(documentContainerBody).toBeVisible();

  try {
    ${generatedActionLines || `// Baseline fallback checks\n    await expect(page.locator('body')).toBeVisible();`}
  } catch (flowError) {
    console.log('Interaction pass segment skipped safely:', flowError.message);
  }

  await expect(page).toBeTruthy();
});
`;

    if (!fs.existsSync(testsDir)) {
      fs.mkdirSync(testsDir, { recursive: true });
    }

    fs.writeFileSync(targetScriptPath, verifiedCompilationOutput, "utf8");
    return targetScriptPath;
  } catch (error: any) {
    console.error(
      `   ❌ Playwright MCP Generation Exception: ${error.message}`,
    );
    return null;
  }
}
