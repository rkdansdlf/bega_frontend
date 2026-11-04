import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AUTOMATIC_COMPONENT_STATE_SCENARIOS } from '../src/visual-qa/harnessCatalog';
import { launchBrowser, installOfflineRoutes, probeIsolatedScenario } from './visual-qa-harness-smoke';

const baseUrl = process.env.VISUAL_QA_HARNESS_BASE_URL ?? 'http://127.0.0.1:5182';
const output = resolve(process.env.VISUAL_QA_REGISTRATION_OUTPUT ?? 'artifacts/release-readiness-20261013/registration/rendered');
const inventoryId = 'src/components/prediction/PredictionGamePowerupInventory.tsx#PredictionGamePowerupInventory';
const panelId = 'src/components/admin/AdminSeatViewsPanel.tsx#AdminSeatViewsPanel';
const scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS.filter((entry) => entry.componentId === inventoryId || (
  entry.componentId === panelId && ['populated', 'null-optional', 'broken-image'].includes(entry.states.data ?? '')
  && entry.states.interactions === 'default' && entry.states.system === 'idle' && entry.variants.filters === 'default'
));
assert.equal(scenarios.length, 9);
await mkdir(output, { recursive: true });
const browser = await launchBrowser();
const results = [];
try {
  const context = await browser.newContext({ viewport: { width: 320, height: 900 }, reducedMotion: 'reduce' });
  await installOfflineRoutes(context, new URL(baseUrl).origin);
  for (const scenario of scenarios) {
    results.push(await probeIsolatedScenario({
      context, baseUrl, scenario, timeoutMs: 60000, screenshotDir: output, captureHeightMode: 'expand-tall-flow',
      preparePage: async (page) => {
        if (scenario.componentId === inventoryId) {
          const expectedCount = scenario.states.data === 'empty' ? 'x0' : 'x2';
          const expectedActive = scenario.states.data === 'populated' && scenario.variants.activeGame === 'current' ? 1 : 0;
          await page.waitForFunction(({ expectedCount, expectedActive }) => (
            document.querySelector('[data-testid="retro-powerup-card-magic_bat"] .retro-powerup-count')?.textContent?.trim() === expectedCount
            && document.querySelectorAll('.retro-powerup-card.is-active').length === expectedActive
          ), { expectedCount, expectedActive }, { timeout: 10000 });
        } else {
          const id = scenario.states.data === 'null-optional' ? 43 : 42;
          await page.waitForFunction(({ fallback, id }) => fallback
            ? Boolean(document.querySelector(`[data-testid="admin-seat-view-photo-fallback-${id}"]`))
            : Array.from(document.querySelectorAll('img')).some((image) => image.alt === `시야뷰 후보 ${id}번` && image.complete && image.naturalWidth > 0),
          { fallback: scenario.states.data !== 'populated', id }, { timeout: 10000 });
        }
      },
    }));
  }
  await context.close();
} finally {
  await browser.close();
}
await writeFile(resolve(output, 'report.json'), JSON.stringify({ baseUrl, total: results.length, passed: results.filter((result) => result.status === 'pass').length, results }, null, 2));
assert.ok(results.every((result) => result.status === 'pass'), JSON.stringify(results.filter((result) => result.status !== 'pass')));
console.log(`Registration rendered evidence: ${results.length}/${results.length} pass`);
