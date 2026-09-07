import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('mate create match keeps every result and manual control reachable at 320px', async () => {
  const source = await readFile(new URL('./MateCreateMatchStep.tsx', import.meta.url), 'utf8');

  assert.match(source, /data-testid="mate-create-match-step"/);
  assert.match(source, /data-testid="mate-create-match-date"/);
  assert.match(source, /data-testid="mate-create-match-retry"/);
  assert.match(source, /data-testid=\{`mate-create-match-option-\$\{index\}`\}/);
  assert.match(source, /aria-pressed=\{isSelected\}/);
  assert.match(source, /formData\.gameTime === match\.gameTime/);
  assert.match(source, /formData\.stadium === match\.stadium/);
  assert.match(source, /data-testid="mate-create-match-manual"/);
  assert.match(source, /min-h-11/);
  assert.match(source, /min-w-0/);
  assert.match(source, /\[overflow-wrap:anywhere\]/);
});
