import * as dotenv from "dotenv";
import { runTerminalWizard } from "./utils/wizard";
import { executeSiteAudit } from "./utils/orchestrator";

dotenv.config();

async function bootstrapApplication(): Promise<void> {
  try {
    const config = await runTerminalWizard();

    await executeSiteAudit(
      config.finalUrl,
      config.runA11y,
      config.runSeo,
      config.runVisual,
      config.isHeadless,
      config.chosenDevice,
      config.pageCap,
      config.runMcpAgent,
    );
  } catch (error) {
    console.error("System bootstrap engine failed to initialize:", error);
    process.exit(1);
  }
}

bootstrapApplication();
