import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('EmptyState contains unbroken title and description tokens on mobile', async () => {
  const source = await readFile(new URL('./EmptyState.tsx', import.meta.url), 'utf8');

  assert.match(source, /flex w-full max-w-md min-w-0 flex-col items-center/);
  assert.match(source, /text-18 font-bold leading-snug tracking-normal text-current break-all/);
  assert.match(source, /text-15 font-semibold leading-relaxed text-muted-foreground break-all/);
});
