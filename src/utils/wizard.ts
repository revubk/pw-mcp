import inquirer from 'inquirer';
import { DeviceFormFactor } from '../types/audit';

export interface WizardAnswers {
  finalUrl: string;
  runA11y: boolean;
  runSeo: boolean;
  isHeadless: boolean;
  chosenDevice: DeviceFormFactor;
  pageCap: number;
}

/**
 * Core Interactive Selection Wizard Prompt.
 * Gathers target application endpoints, browser visibility modes, and device emulation criteria.
 */
export async function runTerminalWizard(): Promise<WizardAnswers> {
  console.log('==================================================');
  console.log('       Welcome to the Site Auditor Crawler        ');
  console.log('==================================================\n');

  const envUrl = process.env.TARGET_URL || 'https://example.com';

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'urlSource',
      message: 'Select the target website environment source:',
      choices: [
        { name: `Use default from .env file (${envUrl})`, value: 'ENV' },
        { name: 'Type a custom website URL manually', value: 'MANUAL' }
      ]
    },
    {
      type: 'input',
      name: 'customUrl',
      message: 'Enter the full website URL:',
      when: (hash) => hash.urlSource === 'MANUAL',
      validate: (input) => {
        try { 
          new URL(input); 
          return true; 
        } catch (_) { 
          return 'Please enter a valid absolute URL string (starting with http:// or https://).'; 
        }
      }
    },
    {
      type: 'list',
      name: 'browserMode',
      message: 'Choose browser visibility mode:',
      choices: [
        { name: 'Headless Mode (Fast, runs silently in background)', value: true },
        { name: 'Headed Mode (Opens visible Playwright UI browser window)', value: false }
      ]
    },
    {
      type: 'list',
      name: 'deviceFormFactor',
      message: 'Select the target device layout context simulation to emulate:',
      choices: [
        { name: '🖥️  Desktop Screen Environment (1280x800 Layout)', value: 'desktop' },
        { name: '📱 Mobile Phone Device Context (375x667 Screen Grid)', value: 'mobile' },
        { name: '📟 Tablet Hardware Device Context (768x1024 Layout)', value: 'tablet' }
      ]
    },
    {
      type: 'list',
      name: 'capProfile',
      message: 'Select the maximum crawler page limits boundary profile:',
      choices: [
        { name: 'Standard Limit (Max 15 Pages)', value: 'STANDARD' },
        { name: 'Scan All (Unlimited Deep Crawl)', value: 'ALL' },
        { name: 'Custom Cap (Specify unique boundary number)', value: 'CUSTOM' }
      ]
    },
    {
      type: 'input',
      name: 'customCapNumber',
      message: 'Enter the maximum page limit number threshold (e.g., 25):',
      when: (hash) => hash.capProfile === 'CUSTOM',
      validate: (input) => {
        const parsedValue = parseInt(input, 10);
        if (isNaN(parsedValue) || parsedValue <= 0) {
          return 'Please enter a valid positive integer boundary limit greater than 0.';
        }
        return true;
      }
    },
    {
      type: 'checkbox',
      name: 'auditTiers',
      message: 'Select the metrics you want to evaluate on this run:',
      choices: [
        { name: 'Functional Checks (P1 Broken Links/Crashes)', value: 'FUNC', disabled: 'Always Enabled' },
        { name: 'Accessibility Compliance (Axe-Core P2)', value: 'A11Y', checked: true },
        { name: 'Technical SEO Metadata Checklist (Lighthouse Core P2)', value: 'SEO', checked: true }
      ]
    }
  ]);

  const finalUrl = answers.urlSource === 'ENV' ? envUrl : answers.customUrl;
  const runA11y = answers.auditTiers.includes('A11Y');
  const runSeo = answers.auditTiers.includes('SEO');
  const isHeadless = answers.browserMode;
  const chosenDevice = answers.deviceFormFactor as DeviceFormFactor;

  let pageCap = 15;
  if (answers.capProfile === 'ALL') {
    pageCap = 99999; 
  } else if (answers.capProfile === 'CUSTOM') {
    pageCap = parseInt(answers.customCapNumber, 10);
  }

  return {
    finalUrl,
    runA11y,
    runSeo,
    isHeadless,
    chosenDevice,
    pageCap
  };
}
