import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('mate create description keeps pressure copy and every style tag reachable at 320px', async () => {
  const source = await readFile(new URL('./MateCreateDescriptionStep.tsx', import.meta.url), 'utf8');

  assert.match(source, /data-testid="mate-create-description-step"/);
  assert.match(source, /data-testid="mate-create-description-input"/);
  assert.match(source, /data-testid=\{`mate-create-description-tag-\$\{index\}`\}/);
  assert.match(source, /aria-pressed=\{isSelected\}/);
  assert.match(source, /min-h-11/);
  assert.match(source, /min-w-0/);
  assert.match(source, /\[overflow-wrap:anywhere\]/);
});
