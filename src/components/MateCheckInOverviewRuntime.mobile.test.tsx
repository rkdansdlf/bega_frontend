import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateCheckInOverviewRuntime.tsx', import.meta.url);

test('mate check-in overview owns a contained mobile surface', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-check-in-overview"/);
  assert.match(source, /min-w-0[^"\n]*overflow-x-clip/);
  assert.match(source, /data-testid="mate-check-in-overview-hero"/);
  assert.match(source, /data-testid="checkin-summary-strip"/);
});

test('mate check-in overview wraps pressure copy in every owned text surface', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-check-in-summary-item"/);
  assert.match(source, /data-testid="mate-check-in-summary-item"[^>]+min-w-0[^>]+overflow-hidden/);
  assert.match(source, /data-testid="mate-check-in-pill"/);
  assert.match(source, /data-testid="mate-check-in-pill"[^>]+max-w-full[^>]+\[overflow-wrap:anywhere\]/);
  assert.ok((source.match(/\[overflow-wrap:anywhere\]/g) ?? []).length >= 6);
});

test('mate check-in overview normalizes progress counts before rendering', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /const normalizeMateCount =/);
  assert.match(source, /Number\.isFinite/);
  assert.match(source, /safeCheckedInCount/);
  assert.match(source, /safeTotalParticipants/);
  assert.match(source, /safeRemainingCount/);
  assert.doesNotMatch(source, /value: `\$\{checkedInCount\}\/\$\{totalParticipants\}명`/);
});
