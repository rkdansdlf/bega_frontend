#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, webkit } from 'playwright';

import {
  AUTOMATIC_COMPONENT_STATE_SCENARIOS,
} from '../src/visual-qa/harnessCatalog.ts';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const FRONTEND_ROOT = resolve(dirname(SCRIPT_PATH), '..');
const BASE_URL = process.env.VISUAL_QA_HOME_COMPONENTS_BASE_URL ?? 'http://127.0.0.1:5182';
const REPORT_PATH = resolve(
  FRONTEND_ROOT,
  process.env.VISUAL_QA_HOME_COMPONENTS_REPORT ?? 'reports/visual-qa/p2-b-2026-09-09/browser-matrix.json',
);
const SCREENSHOT_ROOT = resolve(
  FRONTEND_ROOT,
  process.env.VISUAL_QA_HOME_COMPONENTS_SCREENSHOTS ?? 'reports/visual-qa/p2-b-2026-09-09/browser-matrix-screenshots',
);

const COMPONENT_IDS = {
  card: 'src/components/home/HomeGameCard.tsx#HomeGameCard',
  panel: 'src/components/home/HomeMatchPanel.tsx#HomeMatchPanel',
};

const hashFile = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');
const hashBytes = (bytes) => createHash('sha256').update(bytes).digest('hex');

const pickScenario = (componentId, predicate) => {
  const candidates = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((scenario) => scenario.componentId === componentId);
  const scenario = candidates.find(predicate);
  if (!scenario) throw new Error(`scenario not found for ${componentId}`);
  return scenario;
};

const representativeScenarios = [
  pickScenario(COMPONENT_IDS.card, ({ states, variants }) => states.data === 'single'
    && states.interactions === 'default' && variants.logo === 'normal' && variants.theme === 'light'),
  pickScenario(COMPONENT_IDS.card, ({ states, variants }) => states.data === 'populated'
    && states.interactions === 'selected' && variants.logo === 'normal' && variants.theme === 'light'),
  pickScenario(COMPONENT_IDS.card, ({ states, variants }) => states.data === 'long-korean'
    && states.interactions === 'keyboard-navigation' && variants.logo === 'address-missing' && variants.theme === 'dark'),
  pickScenario(COMPONENT_IDS.card, ({ states, variants }) => states.data === 'unknown-team'
    && states.interactions === 'default' && variants.logo === 'load-fallback' && variants.theme === 'dark'),
  pickScenario(COMPONENT_IDS.panel, ({ states, variants }) => states.data === 'single'
    && states.system === 'idle' && states.interactions === 'default' && variants.tab === 'regular' && variants.theme === 'light'),
  pickScenario(COMPONENT_IDS.panel, ({ states, variants }) => states.data === 'populated'
    && states.system === 'idle' && states.interactions === 'open' && variants.tab === 'scheduled' && variants.theme === 'dark'),
  pickScenario(COMPONENT_IDS.panel, ({ states, variants }) => states.data === 'single'
    && states.system === 'error-503' && states.interactions === 'retry' && variants.tab === 'regular' && variants.theme === 'light'),
  pickScenario(COMPONENT_IDS.panel, ({ states, variants }) => states.data === 'long-korean'
    && states.system === 'loading' && states.interactions === 'default' && variants.tab === 'scheduled' && variants.theme === 'dark'),
];

const scenarioUrl = (scenario) => {
  const params = new URLSearchParams({ scenario: scenario.id });
  return new URL(`/visual-qa-harness.html?${params}`, BASE_URL).toString();
};

const routePolicy = async (context, origin) => {
  const blocked = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      blocked.push({ url: route.request().url(), reason: url.origin !== origin ? 'external-origin' : 'api-request' });
      await route.abort();
      return;
    }
    await route.continue();
  });
  return blocked;
};

const waitForHarnessReady = async (page, scenario) => {
  await page.waitForFunction((expectedScenarioId) => {
    const harness = window.__BEGA_VISUAL_QA_HARNESS__;
    return harness?.state === 'ready' && harness.scenarioId === expectedScenarioId;
  }, scenario.id, { timeout: 15_000 });
  const surface = page.locator('[data-vqa-harness-surface]').first();
  await surface.waitFor({ state: 'visible', timeout: 15_000 });
  return surface;
};

const applyInteraction = async (page, scenario) => {
  const plan = scenario.interactionPlan;
  if (!plan) return null;
  const target = page.locator(plan.selector).first();
  await target.waitFor({ state: 'visible', timeout: 10_000 });
  if (plan.action === 'press-key') {
    await target.focus();
    await page.keyboard.press(plan.key);
  } else if (plan.action === 'click') {
    await target.click();
  } else {
    throw new Error(`unsupported P2-B interaction action: ${plan.action}`);
  }
  await page.locator(plan.waitForSelector).first().waitFor({ state: 'visible', timeout: 10_000 });
  return {
    action: plan.action,
    selector: plan.selector,
    targetId: plan.targetId,
    waitForSelector: plan.waitForSelector,
    verified: true,
  };
};

const collectGeometry = async (page) => page.evaluate(() => {
  const root = document.documentElement;
  const surface = document.querySelector('[data-vqa-harness-surface]');
  const rect = surface?.getBoundingClientRect();
  return {
    horizontalOverflow: root.scrollWidth > root.clientWidth + 1,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    rootFontSize: getComputedStyle(root).fontSize,
    surface: rect ? {
      width: Number(rect.width.toFixed(2)),
      height: Number(rect.height.toFixed(2)),
    } : null,
  };
});

const runCase = async ({ browser, browserName, scenario, width, zoom }) => {
  const context = await browser.newContext({ viewport: { width, height: 844 } });
  const blocked = await routePolicy(context, new URL(BASE_URL).origin);
  const page = await context.newPage();
  const screenshotDir = resolve(SCREENSHOT_ROOT, browserName);
  await mkdir(screenshotDir, { recursive: true });
  const slug = scenario.id.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(-140);
  const screenshotPath = resolve(screenshotDir, `${slug}-${width}-${zoom * 100}.png`);
  try {
    await page.goto(scenarioUrl(scenario), { waitUntil: 'domcontentloaded' });
    await waitForHarnessReady(page, scenario);
    await page.evaluate((nextZoom) => {
      document.documentElement.style.fontSize = `${16 * nextZoom}px`;
    }, zoom);
    const interaction = await applyInteraction(page, scenario);
    const geometry = await collectGeometry(page);
    if (geometry.horizontalOverflow) throw new Error('horizontal overflow detected in P2-B browser matrix');
    const surface = page.locator('[data-vqa-harness-surface]').first();
    await surface.screenshot({ path: screenshotPath });
    const screenshotBytes = await readFile(screenshotPath);
    return {
      browser: browserName,
      scenarioId: scenario.id,
      componentId: scenario.componentId,
      width,
      requestedZoom: zoom,
      zoomMethod: 'document.documentElement.style.fontSize',
      geometry,
      interaction,
      blockedRequests: blocked,
      screenshot: {
        path: screenshotPath,
        sha256: hashBytes(screenshotBytes),
      },
      status: 'PASS',
    };
  } finally {
    await context.close();
  }
};

const mutationAssertion = async (page, scenario) => {
  const selector = scenario.componentId === COMPONENT_IDS.card
    ? '[data-vqa-harness-surface] > .group'
    : '[data-testid="home-match-priority-panel"]';
  const readState = () => page.evaluate((targetSelector) => ({
    targetVisible: Boolean(document.querySelector(targetSelector)),
  }), selector);
  const original = await readState();
  const originalFailures = original.targetVisible ? [] : ['target-missing'];
  await page.evaluate((targetSelector) => document.querySelector(targetSelector)?.remove(), selector);
  const mutated = await readState();
  const mutationFailures = mutated.targetVisible ? [] : ['target-missing'];
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForHarnessReady(page, scenario);
  const restored = await readState();
  const restoredFailures = restored.targetVisible ? [] : ['target-missing'];
  return {
    selector,
    original: { evidence: original, failures: originalFailures },
    mutated: { evidence: mutated, failures: mutationFailures },
    restored: { evidence: restored, failures: restoredFailures },
    status: originalFailures.length === 0
      && mutationFailures.includes('target-missing')
      && restoredFailures.length === 0
      ? 'PASS'
      : 'FAIL',
  };
};

const runMutation = async (browser, browserName, scenario) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 844 } });
  await routePolicy(context, new URL(BASE_URL).origin);
  const page = await context.newPage();
  try {
    await page.goto(scenarioUrl(scenario), { waitUntil: 'domcontentloaded' });
    await waitForHarnessReady(page, scenario);
    await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
    const result = await mutationAssertion(page, scenario);
    return { browser: browserName, scenarioId: scenario.id, ...result };
  } finally {
    await context.close();
  }
};

const runStateRepeat = async (browser, browserName) => {
  const first = representativeScenarios.find(({ componentId, states, variants }) => (
    componentId === COMPONENT_IDS.card
      && states.data === 'single'
      && states.interactions === 'default'
      && variants.logo === 'normal'
      && variants.theme === 'light'
  ));
  const middle = representativeScenarios.find(({ componentId, states, variants }) => (
    componentId === COMPONENT_IDS.card
      && states.data === 'populated'
      && states.interactions === 'selected'
      && variants.logo === 'normal'
      && variants.theme === 'light'
  ));
  if (!first || !middle) throw new Error('state repeat fixtures are incomplete');
  const context = await browser.newContext({ viewport: { width: 320, height: 844 } });
  await routePolicy(context, new URL(BASE_URL).origin);
  const page = await context.newPage();
  const stateFor = async (scenario) => {
    await page.waitForFunction((expectedScenarioId) => {
      const harness = window.__BEGA_VISUAL_QA_HARNESS__;
      return harness?.state === 'ready' && harness.scenarioId === expectedScenarioId;
    }, scenario.id, { timeout: 15_000 });
    return page.evaluate(() => ({
      scenarioId: window.__BEGA_VISUAL_QA_HARNESS__?.scenarioId ?? null,
      marker: document.querySelector('[data-testid="visual-qa-home-game-selection"]')?.textContent ?? null,
      cardCount: document.querySelectorAll('[data-vqa-harness-surface] > .group').length,
    }));
  };
  try {
    await page.goto(scenarioUrl(first), { waitUntil: 'domcontentloaded' });
    await waitForHarnessReady(page, first);
    const a1 = await stateFor(first);
    await page.evaluate((scenarioId) => window.__BEGA_VISUAL_QA_RENDER_COMPONENT__?.(scenarioId), middle.id);
    await stateFor(middle);
    await page.locator('[role="button"]').first().click();
    await page.locator('[data-testid="visual-qa-home-game-selection"]').first().waitFor({ state: 'visible' });
    const b = await stateFor(middle);
    await page.evaluate((scenarioId) => window.__BEGA_VISUAL_QA_RENDER_COMPONENT__?.(scenarioId), first.id);
    const a2 = await stateFor(first);
    const status = a1.scenarioId === a2.scenarioId
      && a1.cardCount === a2.cardCount
      && a1.marker === '대기 중'
      && a2.marker === '대기 중'
      && b.marker?.includes('선택됨')
      ? 'PASS'
      : 'FAIL';
    return { browser: browserName, sequence: [first.id, middle.id, first.id], a1, b, a2, status };
  } finally {
    await context.close();
  }
};

const runEngine = async (browserType, browserName) => {
  const browser = await browserType.launch({ headless: true });
  const cases = [];
  try {
    for (const scenario of representativeScenarios) {
      for (const width of [320, 390]) {
        for (const zoom of [1, 2]) {
          cases.push(await runCase({ browser, browserName, scenario, width, zoom }));
        }
      }
    }
    const mutationScenarios = representativeScenarios.filter(({ componentId, interactionPlan }) => (
      componentId === COMPONENT_IDS.card && interactionPlan?.targetId === 'prediction-card'
    ) || (
      componentId === COMPONENT_IDS.panel && interactionPlan?.targetId === 'secondary-toggle'
    ));
    const mutations = [];
    for (const scenario of mutationScenarios) mutations.push(await runMutation(browser, browserName, scenario));
    const stateRepeat = await runStateRepeat(browser, browserName);
    return { cases, mutations, stateRepeat };
  } finally {
    await browser.close();
  }
};

const main = async () => {
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await mkdir(SCREENSHOT_ROOT, { recursive: true });
  const [chromiumResult, webkitResult] = await Promise.all([
    runEngine(chromium, 'chromium'),
    runEngine(webkit, 'webkit'),
  ]);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    matrix: { browsers: ['chromium', 'webkit'], widths: [320, 390], zooms: [1, 2], themes: ['light', 'dark'] },
    representativeScenarioCount: representativeScenarios.length,
    contractScenarioCount: {
      [COMPONENT_IDS.card]: AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => componentId === COMPONENT_IDS.card).length,
      [COMPONENT_IDS.panel]: AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter(({ componentId }) => componentId === COMPONENT_IDS.panel).length,
    },
    sourceSnapshots: {
      homeGameCard: await hashFile(resolve(FRONTEND_ROOT, 'src/components/home/HomeGameCard.tsx')),
      homeMatchPanel: await hashFile(resolve(FRONTEND_ROOT, 'src/components/home/HomeMatchPanel.tsx')),
      stateAdapters: await hashFile(resolve(FRONTEND_ROOT, 'src/visual-qa/stateAdapters.ts')),
      stateContract: await hashFile(resolve(FRONTEND_ROOT, 'contracts/visual-qa-component-states-v1.json')),
      validator: await hashFile(SCRIPT_PATH),
    },
    chromium: chromiumResult,
    webkit: webkitResult,
  };
  const allCases = [...chromiumResult.cases, ...webkitResult.cases];
  const allMutations = [...chromiumResult.mutations, ...webkitResult.mutations];
  report.summary = {
    caseCount: allCases.length,
    casePassCount: allCases.filter(({ status }) => status === 'PASS').length,
    mutationCount: allMutations.length,
    mutationPassCount: allMutations.filter(({ status }) => status === 'PASS').length,
    stateRepeatCount: 2,
    stateRepeatPassCount: [chromiumResult.stateRepeat, webkitResult.stateRepeat]
      .filter(({ status }) => status === 'PASS').length,
    screenshotCount: allCases.filter(({ screenshot }) => screenshot?.sha256).length,
    blockedRequestCount: allCases.reduce((total, item) => total + item.blockedRequests.length, 0),
    status: allCases.every(({ status }) => status === 'PASS')
      && allMutations.every(({ status }) => status === 'PASS')
      && chromiumResult.stateRepeat.status === 'PASS'
      && webkitResult.stateRepeat.status === 'PASS'
      ? 'PASS'
      : 'FAIL',
  };
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[visual-qa:home-components] ${report.summary.status} cases=${report.summary.casePassCount}/${report.summary.caseCount} mutations=${report.summary.mutationPassCount}/${report.summary.mutationCount} report=${REPORT_PATH}`);
  if (report.summary.status !== 'PASS') process.exitCode = 1;
};

main().catch((error) => {
  console.error(`[visual-qa:home-components] FAILED ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
