import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { resolveTimeoutScale, scaleTimeout } from './browserTestTimeouts';

const frontendRoot = fileURLToPath(new URL('../../', import.meta.url));
const sourceRoot = join(frontendRoot, 'src');

// GlobalErrorDialog keeps its own scale (GLOBAL_ERROR_DIALOG_TEST_TIMEOUT_SCALE, default 3).
const ownScaleFiles = new Set(['src/components/GlobalErrorDialog.mobile.test.tsx']);
// Waits that prove something does NOT appear: scaling them only makes a passing run slower.
const negativeProbeTimeouts = new Set(['2_000']);

const listTestFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  if (entry.isDirectory()) return listTestFiles(path);
  return /\.test\.tsx?$/.test(entry.name) ? [path] : [];
});

const playwrightTestFiles = () => listTestFiles(sourceRoot)
  .map((path) => ({ path, name: relative(frontendRoot, path), source: readFileSync(path, 'utf8') }))
  .filter(({ name, source }) => (
    name !== relative(frontendRoot, fileURLToPath(import.meta.url))
      && !ownScaleFiles.has(name)
      && /from 'playwright'/.test(source)
  ));

test('timeout scale falls back to 1 for anything that is not a positive number', () => {
  for (const raw of [undefined, '', 'abc', '0', '-2', 'NaN', 'Infinity']) {
    assert.equal(resolveTimeoutScale(raw), 1, `scale for ${String(raw)}`);
  }
  assert.equal(resolveTimeoutScale('3'), 3);
  assert.equal(resolveTimeoutScale('0.5'), 0.5);
});

test('timeouts scale by rounding to whole milliseconds', () => {
  assert.equal(scaleTimeout(30_000, 3), 90_000);
  assert.equal(scaleTimeout(15_000, 1), 15_000);
  assert.equal(scaleTimeout(1_001, 0.5), 501);
});

test('real-browser tests create pages through the scaled helpers and scale every positive wait', () => {
  const files = playwrightTestFiles();
  assert.ok(files.length >= 15, `expected the real-browser test files to be found, got ${files.length}`);

  for (const { name, source } of files) {
    assert.doesNotMatch(source, /\bbrowser\.newPage\(/, `${name} must use newScaledPage(browser) so page defaults are scaled`);
    if (/\.newContext\(/.test(source)) {
      assert.match(source, /applyTimeoutScale\(/, `${name} creates a context and must call applyTimeoutScale(context)`);
    }
    for (const match of source.matchAll(/timeout: (\d[\d_]*)/g)) {
      assert.ok(
        negativeProbeTimeouts.has(match[1]),
        `${name} has an unscaled timeout: ${match[1]}; wrap it in scaledTimeout() (or allow it as a negative probe)`,
      );
    }
  }
});

test('Cypress config scales command, request and response timeouts from KBO_CYPRESS_TIMEOUT_SCALE', () => {
  const readTimeouts = (scale: string | undefined) => {
    const env = { ...process.env };
    delete env.KBO_CYPRESS_TIMEOUT_SCALE;
    if (scale !== undefined) env.KBO_CYPRESS_TIMEOUT_SCALE = scale;
    const output = execFileSync(process.execPath, [
      '--import',
      'tsx',
      '--input-type=module',
      '-e',
      "const { default: config } = await import('./cypress.config.ts'); const { defaultCommandTimeout, requestTimeout, responseTimeout } = config.e2e; console.log(JSON.stringify({ defaultCommandTimeout, requestTimeout, responseTimeout }));",
    ], { cwd: frontendRoot, env, encoding: 'utf8' });
    return JSON.parse(output.trim().split('\n').at(-1) ?? '{}');
  };

  const original = { defaultCommandTimeout: 10_000, requestTimeout: 10_000, responseTimeout: 30_000 };
  assert.deepEqual(readTimeouts(undefined), original, 'unset keeps the original limits');
  assert.deepEqual(readTimeouts('garbage'), original, 'invalid values keep the original limits');
  assert.deepEqual(readTimeouts('2'), { defaultCommandTimeout: 20_000, requestTimeout: 20_000, responseTimeout: 60_000 });
});
