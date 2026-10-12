import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import glob from 'fast-glob';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import config from '../tailwind.config.js';

const root = fileURLToPath(new URL('../', import.meta.url));

test('Tailwind scans product and visual QA sources, but not test assertions', async () => {
  const files = (await glob(config.content, { cwd: root })).map((file) => file.replace(/^\.\//, ''));
  assert.ok(files.includes('src/main.tsx'));
  assert.ok(files.includes('src/components/StadiumGuideRuntime.tsx'));
  assert.ok(files.includes('src/visual-qa/stateAdapters.ts'));
  assert.ok(files.includes('src/visual-qa/harnessCatalog.ts'));
  assert.deepEqual(files.filter((file) => /\.(?:test|spec)\.[jt]sx?$/.test(file)), []);
});

test('Tailwind keeps product responsive utilities without test-only base variants', async () => {
  const result = await postcss([tailwind(config)]).process('@tailwind utilities;', { from: undefined });
  const selectors = new Set();
  result.root.walkRules((rule) => selectors.add(rule.selector));
  assert.ok(selectors.has('.sm\\:size-9'));
  assert.ok(selectors.has('.hover\\:bg-primary\\/90:hover'));
  assert.ok(selectors.has('.rounded-20'));
  assert.ok(!selectors.has('.size-9'));
  assert.ok(!selectors.has('.bg-primary\\/90'));
});
