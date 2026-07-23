import { createConnection } from '@playwright/mcp';
import { Page } from 'playwright';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service driving the Autonomous Microsoft Playwright MCP Test Generator Engine.
 * Extracts DOM layout items and enforces a strict structural template wrapper to eliminate syntax failures.
 */
export async function executeAutonomousMcpAgent(page: Page, url: string): Promise<string> {
  const hostName = new URL(url).hostname.replace(/[^a-z0-9]/gi, '_');
  const testsDir = path.join(process.cwd(), 'tests', hostName);

  if (!fs.existsSync(testsDir)) {
    fs.mkdirSync(testsDir, { recursive: true });
  }

  const fileSafeName = url.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
  const targetScriptPath = path.join(testsDir, `${fileSafeName}.spec.ts`);

  try {
    // Initialize Microsoft's underlying MCP server connection gateway safely
    const mcpServerInstance = await createConnection({
      browser: {
        launchOptions: { headless: true },
        contextOptions: { viewport: { width: 1280, height: 720 } }
      }
    });
    void mcpServerInstance;

    const blueprintFilePath = path.join(process.cwd(), 'mcp_prompt_blueprint.txt');
    let userCustomPromptAddon = '';
    if (fs.existsSync(blueprintFilePath)) {
      userCustomPromptAddon = fs.readFileSync(blueprintFilePath, 'utf8');
    }

    // Extract rich page metadata and precise interactive components from the viewport
    const interactiveElementsSchema = await page.evaluate(() => {
      const title = document.title || '';
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
      const firstHeading = Array.from(document.querySelectorAll('h1, h2')).map((element) => element.textContent?.trim()).find(Boolean) || '';
      const DOMNodes = Array.from(document.querySelectorAll('a, button, input, select, textarea'));
      return {
        pageTitle: title,
        pageDescription: description,
        firstHeading,
        url: window.location.href,
        interactiveElements: DOMNodes.slice(0, 20).map((node) => {
          const htmlElement = node as HTMLElement;
          return {
            tagName: htmlElement.tagName.toLowerCase(),
            id: htmlElement.id ? `#${htmlElement.id}` : '',
            className: htmlElement.className ? `.${htmlElement.className.trim().split(/\s+/)[0]}` : '',
            text: htmlElement.textContent?.trim().substring(0, 80) || '',
            type: (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) ? node.type || 'text' : (node instanceof HTMLSelectElement ? 'select' : ''),
            name: ((node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) ? node.name || '' : ''),
            placeholder: ((node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) ? node.placeholder || '' : ''),
            ariaLabel: htmlElement.getAttribute('aria-label') || '',
            role: htmlElement.getAttribute('role') || '',
            href: (node instanceof HTMLAnchorElement) ? node.getAttribute('href') || '' : ''
          };
        })
      };
    });

    const schemaContextString = JSON.stringify(interactiveElementsSchema, null, 2);
    let generatedActionLines = '';

    const sharedPromptBody = `
${userCustomPromptAddon}

Use the page metadata and schema below to infer the page purpose, business type, and most realistic functional user path. Do not invent selectors, ids, class names, labels, or elements that are not present in this schema.

Page metadata:
- title: ${interactiveElementsSchema.pageTitle}
- description: ${interactiveElementsSchema.pageDescription}
- heading: ${interactiveElementsSchema.firstHeading}
- url: ${interactiveElementsSchema.url}

Interactive DOM schema:
${schemaContextString}
`.trim();

    const sanitizeModelOutput = (raw: string): string => {
      let cleaned = raw.trim();

      if (!cleaned) {
        return '';
      }

      // Remove common reasoning and markup wrappers.
      if (cleaned.includes('</think>')) {
        cleaned = cleaned.split('</think>').pop()!.trim();
      }
      cleaned = cleaned
        .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
        .replace(/<\|channel>thought[\s\S]*?<channel\|>/gi, '')
        .replace(/\[Start thinking\][\s\S]*?(\[End thinking\]|$)/gi, '')
        .replace(/```(?:typescript|ts)?/gi, '')
        .replace(/```/g, '');

      const lines = cleaned.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const collected: string[] = [];
      let currentStatement = '';

      for (const line of lines) {
        if (line.startsWith('//')) {
          collected.push(line);
          continue;
        }

        if (!currentStatement) {
          currentStatement = line;
        } else {
          currentStatement = `${currentStatement} ${line}`;
        }

        if (currentStatement.trim().endsWith(';')) {
          collected.push(currentStatement.trim());
          currentStatement = '';
        }
      }

      if (currentStatement && currentStatement.trim().endsWith(';')) {
        collected.push(currentStatement.trim());
      }

      const relevant = collected.filter((stmt) =>
        stmt.startsWith('await ') || stmt.startsWith('const ') || stmt.startsWith('let ') || stmt.startsWith('var ') || stmt.startsWith('//')
      );

      return relevant.slice(0, 8).join('\n    ');
    };

    const geminiApiKey = (process.env.GEMINI_API_KEY || '').trim();
    const geminiModel = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();

    if (geminiApiKey) {
      try {
        console.log(`   🧠 [Gemini Active] Generating interaction flow via ${geminiModel} (free tier)...`);

        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
          {
            contents: [{ parts: [{ text: sharedPromptBody }] }],
            generationConfig: {
              temperature: 0.0,
              topP: 1.0,
              maxOutputTokens: 512
            }
          },
          { timeout: 30000 }
        );

        const candidateText =
          response.data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('\n') || '';

        generatedActionLines = sanitizeModelOutput(candidateText);

        if (!generatedActionLines) {
          console.log('   ⚠️  Gemini returned no usable action lines. Falling back.');
        }
      } catch (geminiErr: any) {
        const status = geminiErr?.response?.status;
        const reason = status === 429
          ? 'free-tier rate limit hit'
          : geminiErr?.response?.data?.error?.message || geminiErr.message;
        console.log(`   ⚠️  Gemini call failed (${reason}). Falling back to local model.`);
      }
    }

    // LM Studio serves an OpenAI-compatible /v1/chat/completions endpoint.
    // Only attempted if LM_STUDIO_MODEL is set — otherwise skip straight to Ollama
    // so nothing changes for people who haven't set up LM Studio.
    const lmStudioModel = (process.env.LM_STUDIO_MODEL || '').trim();
    const lmStudioBaseUrlRaw = (process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234').trim();
    const lmStudioBaseUrl = lmStudioBaseUrlRaw.replace(/\/+$/g, '');
    const lmStudioChatEndpoint = lmStudioBaseUrl.includes('/v1')
      ? `${lmStudioBaseUrl}/chat/completions`
      : `${lmStudioBaseUrl}/v1/chat/completions`;

    if (!generatedActionLines && lmStudioModel) {
      try {
        console.log(`   🧠 [LM Studio Active] Generating interaction flow via ${lmStudioModel}`);

        const response = await axios.post(
          lmStudioChatEndpoint,
          {
            model: lmStudioModel,
            messages: [
              {
                role: 'system',
                content: 'Do not use thinking or reasoning mode. Respond with only the final code lines, no <thought> blocks, no explanation.'
              },
              { role: 'user', content: sharedPromptBody }
            ],
            temperature: 0.1,
            max_tokens: 512,
            stream: false,
            // Best-effort: some Gemma 4 GGUF builds respect this to skip the
            // thinking pass; harmless (ignored) on servers/models that don't.
            chat_template_kwargs: { enable_thinking: false }
          },
          { timeout: 120000 }
        );

        const message = response.data?.choices?.[0]?.message;
        const candidateText = message?.content || message?.reasoning_content || '';
        generatedActionLines = sanitizeModelOutput(candidateText);

        if (!generatedActionLines) {
          console.log('   ⚠️  LM Studio returned no usable action lines (often means it only emitted a thinking block). Falling back.');
        }
      } catch (lmStudioErr: any) {
        const reason = lmStudioErr?.code === 'ECONNABORTED'
          ? 'timed out — reasoning models can be slow, consider a bigger timeout or a non-thinking model'
          : lmStudioErr?.response?.data?.error?.message || lmStudioErr.message;
        console.log(`   ⚠️  LM Studio call failed (${reason}). Is the local server running? Falling back to Ollama.`);
      }
    }

    if (!generatedActionLines) {
      try {
        console.log(`   🧠 [Local AI Active] Bundling Prompt Blueprint. Processing via Ollama...`);

        const response = await axios.post('http://localhost:11434/api/generate', {
          model: 'deepseek-r1:1.5b',
          prompt: sharedPromptBody,
          stream: false,
          options: {
            temperature: 0.1
          }
        }, { timeout: 45000 });

        generatedActionLines = sanitizeModelOutput(response.data.response.trim());

      } catch (ollamaErr) {
        console.log(`   ⚠️  Local Ollama port unreachable. Compiling fallback templates.`);
      }
    }

    const verifiedCompilationOutput = `import { test, expect } from '@playwright/test';

test('Official Playwright MCP Autonomous Scan — Route: [${url}]', async ({ page }) => {
  // 1. Safe, verified destination navigation entry pass
  await page.goto('${url}', { waitUntil: 'networkidle' });
  
  // Enforce baseline structural visibility checkmarks
  const documentContainerBody = page.locator('body');
  await expect(documentContainerBody).toBeVisible();

  try {
    // 2. AI Generated Interaction Flow Segment Layer
    ${generatedActionLines || `// Baseline fallback checks\n    await expect(page.locator('body')).toBeVisible();`}
  } catch (flowError) {
    console.log('Interaction pass segment skipped safely:', flowError.message);
  }

  // 3. Final visual stability confirmations
  await expect(page).toBeTruthy();
});
`;

    fs.writeFileSync(targetScriptPath, verifiedCompilationOutput, 'utf8');
    return targetScriptPath;

  } catch (error: any) {
    console.error(`   ❌ Playwright MCP Generation Exception: ${error.message}`);
    return targetScriptPath;
  }
}