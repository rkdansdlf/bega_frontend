import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('editable ranking rows wrap controls without hiding the team name on mobile', async () => {
  const source = await readFile(new URL('./RankingItem.tsx', import.meta.url), 'utf8');

  assert.match(source, /className="flex flex-wrap items-center gap-2\.5 sm:gap-3"/);
  assert.match(source, /className="flex min-w-24 flex-1 items-center gap-2\.5 sm:min-w-0 sm:gap-3"/);
  assert.match(source, /className="ml-auto flex shrink-0 items-center gap-1"/);
});
