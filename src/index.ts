import * as dotenv from 'dotenv';
// 🔥 FIX: Restored correct reusable module imports from your wizard and orchestrator utilities
import { runTerminalWizard } from './utils/wizard';
import { executeSiteAudit } from './utils/orchestrator';

// Initialize environmental configurations
dotenv.config();

/**
 * Core Application Bootstrap Entry Point.
 * Hooks the interactive wizard configuration selections straight into the audit engine runner thread.
 */
async function bootstrapApplication(): Promise<void> {
  try {
    // 1. 🔥 FIX: Directly invoke the reusable terminal menu wizard function cleanly
    const config = await runTerminalWizard();
    
    // 2. Pass parameters down to the core orchestrator pipeline engine
    await executeSiteAudit(
      config.finalUrl,
      config.runA11y,
      config.runSeo,
      config.isHeadless,
      config.chosenDevice,
      config.pageCap
    );
  } catch (error) {
    console.error('System bootstrap engine failed to initialize:', error);
    process.exit(1);
  }
}

// Fire application launch cycle execution
bootstrapApplication();
