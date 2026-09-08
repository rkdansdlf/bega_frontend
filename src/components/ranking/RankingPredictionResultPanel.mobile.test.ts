import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('ranking result rows contain unbroken team names inside the mobile card', async () => {
  const source = await readFile(new URL('./RankingPredictionResultPanel.tsx', import.meta.url), 'utf8');

  assert.match(source, /className={`min-w-0 overflow-hidden flex items-center gap-2\.5 rounded-xl border p-2\.5/);
  assert.match(source, /className="block min-w-0 flex-1 truncate/);
});
