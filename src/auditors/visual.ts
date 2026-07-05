import { Page } from 'playwright';
import { Eyes, Target, Configuration, VisualGridRunner } from '@applitools/eyes-playwright';

const gridRunner = new VisualGridRunner({ testConcurrency: 5 });

/**
 * Executes an Applitools Visual AI check and returns the live web dashboard review link.
 */
export async function runVisualAiAudit(page: Page, url: string, runId: string): Promise<string | undefined> {
  const apiKey = (process.env.APPLITOOLS_API_KEY || '').trim();
  if (!apiKey || apiKey === '0xH100OXFCBbYzBwb3VF1Mp1qlkY342nOKWql90UXmIlg110') {
    return undefined;
  }

  const eyes = new Eyes(gridRunner);
  const config = new Configuration();
  
  config.setApiKey(apiKey);
  config.setAppName('Automated Autonomous QA Agent');
  config.setBatch({ name: `Crawl Audit Run Matrix #${runId}` });
  eyes.setConfiguration(config);

  try {
    console.log(`👁️  [VISUAL AI] Opening checkmarks baseline tunnel for: ${url}`);
    
    await eyes.open(
      page,
      'Automated Autonomous QA Agent',
      `Route: ${url}`,
      { width: 1280, height: 720 }
    );

    await eyes.check(`Page Snapshot View`, Target.window().fully());
    
    // 🔥 FIX: Close the session and capture the results object from the server response
    const results = await eyes.close(false);
    
    // Extract the absolute cloud web URL path linking to the visual dashboard diff view
    if (results && results.getUrl) {
      return results.getUrl();
    }
    return undefined;
  } catch (error: any) {
    console.log(`   ⚠️  Visual AI session encountered an exception: ${error.message}`);
    await eyes.abort();
    return undefined;
  }
}

export async function closeVisualAiAuditorPool(): Promise<void> {
  if ((process.env.APPLITOOLS_API_KEY || '').trim().length > 0) {
    await gridRunner.getAllTestResults(false).catch(() => {});
  }
}
