import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(new URL('./HomeSecondaryPanels.tsx', import.meta.url), 'utf8');

test('home calendar dialog preserves the full 320px grid width and scrolls at low height', async () => {
  const source = await readSource();

  assert.match(source, /fixed inset-0 z-\[80\] overflow-y-auto bg-black\/50 px-0 sm:px-4/);
  assert.match(source, /flex min-h-full items-start justify-center py-2 sm:items-center sm:py-6/);
  assert.match(source, /max-h-\[calc\(100dvh-1rem\)\][^"']*overflow-y-auto/);
  assert.match(source, /w-full max-w-lg[^"']*p-0[^"']*sm:p-6/);
  assert.doesNotMatch(source, /max-w-\[calc\(100%-2rem\)\]/);
});

test('home calendar dialog spaces its header without narrowing the calendar grid', async () => {
  const source = await readSource();

  assert.match(source, /px-4 pt-4 sm:p-0/);
  assert.match(source, /className="mb-2 mx-auto rounded-md border"/);
});
