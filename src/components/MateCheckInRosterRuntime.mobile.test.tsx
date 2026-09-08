import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateCheckInRosterRuntime.tsx', import.meta.url);

test('mate check-in roster stacks identity and status before mobile badges truncate', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.ok((source.match(/flex flex-col items-start gap-3/g) ?? []).length >= 3);
  assert.ok((source.match(/sm:flex-row sm:items-center sm:justify-between/g) ?? []).length >= 3);
  assert.ok((source.match(/className="shrink-0"/g) ?? []).length >= 3);
  assert.match(source, /\[overflow-wrap:anywhere\]/);
});

test('mate check-in roster keeps its mobile chat action touch-sized', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-check-in-roster-chat"/);
  assert.match(source, /data-testid="mate-check-in-roster-chat"[\s\S]{0,300}?size="touch"/);
});

test('mate check-in roster owns a contained surface and pressure-safe empty state', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-check-in-roster"/);
  assert.match(source, /data-testid="mate-check-in-roster-empty"/);
  assert.match(source, /data-testid="mate-check-in-roster-empty"[^>]+min-w-0[^>]+overflow-hidden/);
  assert.ok((source.match(/\[overflow-wrap:anywhere\]/g) ?? []).length >= 6);
});

test('mate check-in roster normalizes its remaining count before rendering', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /const normalizeRosterCount =/);
  assert.match(source, /Number\.isFinite/);
  assert.match(source, /safeRemainingCount/);
  assert.doesNotMatch(source, /대기 중인 참여자 \{remainingCount\}명/);
});
