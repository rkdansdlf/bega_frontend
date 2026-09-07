import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('today count badge exposes deterministic empty, loading, error, and count states', async () => {
  const source = await readFile(new URL('./MateTodayCountBadge.tsx', import.meta.url), 'utf8');

  assert.match(source, /countOverride\?: number/);
  assert.match(source, /stateOverride\?: 'error' \| 'loading'/);
  assert.match(source, /enabled: countOverride === undefined && stateOverride === undefined/);
  assert.match(source, /data-testid="mate-today-count-badge-empty"/);
});

test('today count badge caps large values without covering adjacent mobile controls', async () => {
  const source = await readFile(new URL('./MateTodayCountBadge.tsx', import.meta.url), 'utf8');

  assert.match(source, /count > 99 \? '99\+' : count/);
  assert.match(source, /max-w-\[9rem\]/);
  assert.match(source, /overflow-hidden/);
  assert.match(source, /aria-label=\{`오늘 \$\{count\}건 모집 중`\}/);
});
