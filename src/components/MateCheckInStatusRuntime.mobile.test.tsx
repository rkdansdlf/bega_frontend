import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateCheckInStatusRuntime.tsx', import.meta.url);

test('mate check-in status owns a contained mobile surface', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-check-in-status"/);
  assert.match(source, /min-w-0[^"\n]*overflow-x-clip/);
  assert.doesNotMatch(source, /min-w-full/);
  assert.ok((source.match(/\[overflow-wrap:anywhere\]/g) ?? []).length >= 7);
});

test('mate check-in status exposes stable touch-sized action targets', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-check-in-status-check-in"/);
  assert.match(source, /data-testid="mate-check-in-status-complete"/);
  assert.ok((source.match(/size="touch"/g) ?? []).length >= 2);
});

test('mate check-in status normalizes every numeric field before rendering', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /const normalizeStatusCount =/);
  assert.match(source, /safeCheckedInCount/);
  assert.match(source, /safeTotalParticipants/);
  assert.match(source, /safeRemainingCount/);
  assert.match(source, /safeProgressValue/);
});

test('progress bar fails closed for non-finite values and exposes its semantics', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /Number\.isFinite\(value\)/);
  assert.match(source, /data-testid="mate-check-in-progress-bar"/);
  assert.match(source, /role="progressbar"/);
  assert.match(source, /aria-valuemin=\{0\}/);
  assert.match(source, /aria-valuemax=\{100\}/);
  assert.match(source, /aria-valuenow=\{safeValue\}/);
});
