import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateCheckInContentRuntime.tsx', import.meta.url);

test('mate check-in content exposes every lazy boundary only outside production', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /MateCheckInContentVisualQaStateOverride/);
  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  for (const phase of ['overviewPhase', 'statusPhase', 'rosterPhase', 'actionPhase']) {
    assert.match(source, new RegExp(phase));
  }
});

test('mate check-in content keeps every lazy fallback visible and announced', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  for (const testId of [
    'mate-check-in-overview-fallback',
    'mate-check-in-status-fallback',
    'mate-check-in-roster-fallback',
    'mate-check-in-action-fallback',
  ]) {
    assert.match(source, new RegExp(`data-testid="${testId}"`));
  }
  assert.ok((source.match(/role="status"/g) ?? []).length >= 4);
  assert.ok((source.match(/aria-busy="true"/g) ?? []).length >= 4);
  assert.doesNotMatch(source, /<Suspense fallback=\{null\}>/);
});

test('mate check-in content contains mobile errors and exposes a touch-sized retry', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-check-in-content"/);
  assert.match(source, /min-w-0[^"\n]*overflow-x-clip/);
  assert.match(source, /data-testid="mate-check-in-status-error"/);
  assert.match(source, /\[overflow-wrap:anywhere\]/);
  assert.match(source, /data-testid="mate-check-in-status-retry"/);
  assert.match(source, /data-testid="mate-check-in-status-retry"[\s\S]{0,300}?size="touch"/);
});

test('mate check-in action fallback preserves compact mobile action geometry', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /mateMobileBarClass/);
  assert.match(source, /grid-cols-2/);
  assert.ok((source.match(/h-11/g) ?? []).length >= 2);
});

