#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

import { collectHomeEvidence, HOME_FLOW_SOURCE, homeAssertions } from './visual-qa-route-flow.integration.mjs';
import { loadPlaywright, settle, stubApi } from './reflow-320-audit.mjs';

const sourcePath = new URL('../src/components/HomeRuntime.tsx', import.meta.url);
const reportPath = process.env.VISUAL_QA_HOME_MUTATION_REPORT
  ?? '/private/tmp/kbo-visual-qa-route-flow/home-mutation.json';

const waitFor = async (page, selector) => {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 10_000 });
};

const runHomeMutationControl = async ({
  baseUrl = process.env.VISUAL_QA_BASE_URL ?? 'http://127.0.0.1:5180',
  width = 320,
  zoom = 2,
} = {}) => {
  const playwright = await loadPlaywright();
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height: 844 } });
  await context.route('**/*', (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin !== new URL(baseUrl).origin) return route.abort();
    return route.fallback();
  });
  await stubApi(context, { allowedOrigin: new URL(baseUrl).origin });
  await context.addInitScript(() => {
    try { window.localStorage.setItem('auth-bootstrap-hint', '1'); } catch { /* hardened context */ }
  });
  const page = await context.newPage();
  try {
    await page.goto(new URL('/home', baseUrl).toString(), { waitUntil: 'commit' });
    await settle(page);
    await page.evaluate((nextZoom) => {
      document.documentElement.style.fontSize = `${16 * nextZoom}px`;
    }, zoom);
    await waitFor(page, HOME_FLOW_SOURCE.selectors.priorityPanel);
    await waitFor(page, HOME_FLOW_SOURCE.selectors.gameCard);

    const originalEvidence = await collectHomeEvidence(page);
    const originalFailures = homeAssertions(originalEvidence);

    await page.evaluate((selector) => {
      const panel = document.querySelector(selector);
      panel?.remove();
    }, HOME_FLOW_SOURCE.selectors.priorityPanel);
    const mutatedEvidence = await collectHomeEvidence(page);
    const mutationFailures = homeAssertions(mutatedEvidence);

    await page.reload({ waitUntil: 'commit' });
    await settle(page);
    await waitFor(page, HOME_FLOW_SOURCE.selectors.priorityPanel);
    await waitFor(page, HOME_FLOW_SOURCE.selectors.gameCard);
    const restoredEvidence = await collectHomeEvidence(page);
    const restoredFailures = homeAssertions(restoredEvidence);

    return {
      status: originalFailures.length === 0
        && mutationFailures.some(({ id }) => id === 'home-priority-panel-missing')
        && restoredFailures.length === 0
        ? 'PASS'
        : 'FAIL',
      mutationKind: 'isolated DOM test copy: removed and restored home-match-priority-panel',
      source: HOME_FLOW_SOURCE,
      browser: 'chromium',
      viewport: { width, height: 844 },
      zoom: {
        requested: zoom,
        method: 'document.documentElement.style.fontSize',
        rootFontSizeAfterPx: await page.evaluate(() => getComputedStyle(document.documentElement).fontSize),
      },
      original: { evidence: originalEvidence, failures: originalFailures },
      mutated: { evidence: mutatedEvidence, failures: mutationFailures },
      restored: { evidence: restoredEvidence, failures: restoredFailures },
    };
  } finally {
    await context.close();
    await browser.close();
  }
};

if (process.argv[1]?.endsWith('visual-qa-home-mutation.integration.mjs')) {
  const sourceHash = createHash('sha256').update(await readFile(sourcePath)).digest('hex');
  runHomeMutationControl()
    .then(async (result) => {
      const report = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        sourceSha256: sourceHash,
        ...result,
      };
      await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      console.log(`[visual-qa:home-mutation] ${result.status} report=${reportPath}`);
      if (result.status !== 'PASS') process.exitCode = 1;
    })
    .catch((error) => {
      console.error(`[visual-qa:home-mutation] FAILED ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    });
}
