import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

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

/**
 * Helper to extract interactive elements from the Playwright page and 
 * filter out non-existent elements so the LLM never hallucinates.
 */
async function extractVerifiedDomSchema(page: any): Promise<DomElementNode[]> {
  try {
    const rawElements: DomElementNode[] = await page.evaluate(() => {
      const selectors = 'button, input, select, textarea, a[href], [role="button"], [role="tab"]';
      const nodes = Array.from(document.querySelectorAll(selectors));
      
      return nodes.map(el => ({
        tagName: el.tagName.toLowerCase(),
        text: el.textContent?.trim().substring(0, 40) || '',
        id: el.id || '',
        className: el.className?.toString().substring(0, 50) || '',
        placeholder: el.getAttribute('placeholder') || '',
        name: el.getAttribute('name') || '',
        type: el.getAttribute('type') || '',
        href: el.getAttribute('href') || ''
      })).slice(0, 30); // Cap to avoid token bloat
    });

    return rawElements;
  } catch (err) {
    console.warn('⚠️ [MCP Agent] Failed to extract DOM schema cleanly:', err);
    return [];
  }
}

/**
 * Load historical knowledge ledger for this URL (Self-healing feedback loop)
 */
function getPageKnowledge(url: string): string {
  const ledgerPath = path.join(process.cwd(), 'reports', 'knowledge_ledger.json');
  if (fs.existsSync(ledgerPath)) {
    try {
      const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
      return ledger[url] ? `Learned Behavior/Fixes from past runs: ${ledger[url]}` : '';
    } catch (e) {}
  }
  return '';
}

/**
 * Save runtime feedback back into the knowledge ledger
 */
export function updatePageKnowledge(url: string, executionStatus: 'passed' | 'failed', errorMessage?: string) {
  const ledgerPath = path.join(process.cwd(), 'reports', 'knowledge_ledger.json');
  let ledger: Record<string, string> = {};
  
  if (fs.existsSync(ledgerPath)) {
    try {
      ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    } catch (e) {}
  }

  if (executionStatus === 'failed' && errorMessage) {
    if (errorMessage.includes('Search') || errorMessage.includes('timeout')) {
      ledger[url] = 'Warning: This page lacks an explicit search button. Use page.keyboard.press("Enter") instead of clicking a submit button.';
    } else {
      ledger[url] = `Previous execution encountered error: ${errorMessage.substring(0, 100)}`;
    }
  } else {
    ledger[url] = 'Verified: Previous interaction script executed successfully with current selectors.';
  }

  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
}

/**
 * Main Autonomous MCP Agent Execution Pipeline
 */
export async function executeAutonomousMcpAgent(page: any, url: string): Promise<string | null> {
  const lmStudioUrl = process.env.LM_STUDIO_URL || 'http://localhost:1234/v1/chat/completions';
  const modelName = process.env.LM_STUDIO_MODEL || 'qwen2.5-coder-7b-instruct';

  // 1. Extract real DOM schema so we only use elements that actually exist
  const verifiedSchema = await extractVerifiedDomSchema(page);
  if (verifiedSchema.length === 0) {
    console.log('   ⚠️ [MCP Agent] No interactive elements found in DOM. Skipping script generation.');
    return null;
  }

  // 2. Pull historic knowledge ledger for this page
  const pageKnowledge = getPageKnowledge(url);

  // 3. Load blueprint rules
  let blueprintPrompt = '';
  const blueprintPath = path.join(process.cwd(), 'mcp_prompt_blueprint.txt');
  if (fs.existsSync(blueprintPath)) {
    blueprintPrompt = fs.readFileSync(blueprintPath, 'utf8');
  }

  const constrainedSystemPrompt = `${blueprintPrompt}
  
  CRITICAL CONSTRAINT: You are provided with a VERIFIED DOM SCHEMA below. You are strictly forbidden from interacting with any element type, placeholder, or role that is NOT present in this schema. If a search bar exists without a button, use keyboard enter.
  
  ${pageKnowledge}`;

  const userPayload = `Target URL: ${url}
  
  VERIFIED DOM SCHEMA ELEMENTS PRESENT ON PAGE:
  ${JSON.stringify(verifiedSchema, null, 2)}`;

  try {
    console.log(`   🧠 [Local AI] Querying model (${modelName}) with verified DOM schema...`);
    
    const response = await axios.post(
      lmStudioUrl,
      {
        model: modelName,
        messages: [
          { role: 'system', content: constrainedSystemPrompt },
          { role: 'user', content: userPayload }
        ],
        temperature: 0.1,
        max_tokens: 1024
      },
      { timeout: 180000 } // 3-minute timeout safety net
    );

    const rawContent = response.data.choices[0]?.message?.content || '';
    const cleanedStatements = rawContent
      .replace(/```typescript/g, '')
      .replace(/```ts/g, '')
      .replace(/```/g, '')
      .trim();

    if (!cleanedStatements) {
      console.log('   ⚠️ [MCP Agent] Model returned empty interaction statements.');
      return null;
    }

    // 4. Compile into a strict, clean Playwright test file (WITHOUT try/catch hiding errors)
    const testFileContent = `import { test, expect } from '@playwright/test';

test('Autonomous Verified Test — Route: ${url}', async ({ page }) => {
  await page.goto('${url}', { waitUntil: 'networkidle' });
  await expect(page.locator('body')).toBeVisible();

  // AI Generated Verified Workflow Statements
  ${cleanedStatements}
});
`;

    const safeFilename = url.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const testsDir = path.join(process.cwd(), 'tests', new URL(url).hostname.replace(/[^a-z0-9]/gi, '_'));
    
    if (!fs.existsSync(testsDir)) {
      fs.mkdirSync(testsDir, { recursive: true });
    }

    const scriptPath = path.join(testsDir, `${safeFilename}.spec.ts`);
    fs.writeFileSync(scriptPath, testFileContent, 'utf8');

    return scriptPath;

  } catch (error: any) {
    console.error(`   ❌ [MCP Agent Error] Failed to generate script for ${url}:`, error.message);
    return null;
  }
}