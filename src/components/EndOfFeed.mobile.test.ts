import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('EndOfFeed keeps its mobile action accessible in both themes', async () => {
  const source = await readFile(new URL('./EndOfFeed.tsx', import.meta.url), 'utf8');

  assert.match(source, /data-testid="end-of-feed"/);
  assert.match(source, /dark:bg-slate-800/);
  assert.match(source, /dark:text-slate-100/);
  assert.match(source, /data-testid="end-of-feed-top"/);
  assert.match(source, /min-h-11 min-w-11/);
  assert.match(source, /focus-visible:ring-2/);
});
