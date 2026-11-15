import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import glob from 'fast-glob';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import config, { getTailwindContent } from '../tailwind.config.js';

const root = fileURLToPath(new URL('../', import.meta.url));

test('visual QA development and production harness builds explicitly include harness Tailwind sources', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(packageJson.scripts['visual-qa:harness:dev'], /VITE_TAILWIND_INCLUDE_VISUAL_QA=true/);
  assert.match(packageJson.scripts['visual-qa:build'], /VITE_TAILWIND_INCLUDE_VISUAL_QA=true/);
});

test('production Tailwind scans product sources but excludes visual QA and test assertions', async () => {
  const files = (await glob(getTailwindContent({ includeVisualQa: false }), { cwd: root }))
    .map((file) => file.replace(/^\.\//, ''));
  assert.ok(files.includes('src/main.tsx'));
  assert.ok(files.includes('src/components/StadiumGuideRuntime.tsx'));
  assert.ok(!files.includes('src/visual-qa/stateAdapters.ts'));
  assert.ok(!files.includes('src/visual-qa/harnessCatalog.ts'));
  assert.deepEqual(files.filter((file) => /\.(?:test|spec)\.[jt]sx?$/.test(file)), []);
});

test('visual QA Tailwind keeps harness styles while still excluding test assertions', async () => {
  const files = (await glob(getTailwindContent({ includeVisualQa: true }), { cwd: root }))
    .map((file) => file.replace(/^\.\//, ''));
  assert.ok(files.includes('src/visual-qa/stateAdapters.ts'));
  assert.ok(files.includes('src/visual-qa/harnessCatalog.ts'));
  assert.deepEqual(files.filter((file) => /\.(?:test|spec)\.[jt]sx?$/.test(file)), []);
});

test('production CSS retains product utilities and omits visual-QA-only utilities', async () => {
  const result = await postcss([tailwind({
    ...config,
    content: getTailwindContent({ includeVisualQa: false }),
  })]).process('@tailwind utilities;', { from: undefined });
  const selectors = new Set();
  result.root.walkRules((rule) => selectors.add(rule.selector));
  assert.ok(selectors.has('.sm\\:size-9'));
  assert.ok(selectors.has('.hover\\:bg-primary\\/90:hover'));
  assert.ok(selectors.has('.rounded-20'));
  assert.ok(![...selectors].some((selector) => selector.includes('568px')));
  assert.ok(![...selectors].some((selector) => selector.includes('visual-qa')));
  assert.ok(!selectors.has('.size-9'));
  assert.ok(!selectors.has('.bg-primary\\/90'));
});

test('visual QA CSS keeps responsive utilities used only by the harness', async () => {
  const result = await postcss([tailwind({
    ...config,
    content: getTailwindContent({ includeVisualQa: true }),
  })]).process('@tailwind utilities;', { from: undefined });
  const selectors = new Set();
  result.root.walkRules((rule) => selectors.add(rule.selector));
  assert.ok([...selectors].some((selector) => selector.includes('568px')));
});
