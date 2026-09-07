import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('NotFound keeps both mobile actions reachable with visible keyboard focus', async () => {
  const source = await readFile(new URL('./NotFound.tsx', import.meta.url), 'utf8');

  assert.match(source, /data-testid="not-found-page"/);
  assert.match(source, /data-testid="not-found-home"/);
  assert.match(source, /data-testid="not-found-back"/);
  assert.match(source, /min-h-11/);
  assert.match(source, /focus-visible:outline/);
  assert.match(source, /\[overflow-wrap:anywhere\]/);
});
