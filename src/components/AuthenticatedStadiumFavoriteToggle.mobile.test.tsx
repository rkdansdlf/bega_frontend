import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('stadium favorite toggle exposes deterministic query and mutation states', async () => {
  const source = await readFile(new URL('./AuthenticatedStadiumFavoriteToggle.tsx', import.meta.url), 'utf8');

  assert.match(source, /favoriteIdsOverride\?: readonly string\[\]/);
  assert.match(source, /stateOverride\?: 'error' \| 'loading'/);
  assert.match(source, /isPendingOverride\?: boolean/);
  assert.match(source, /enabled: favoriteIdsOverride === undefined && stateOverride === undefined/);
});

test('stadium favorite toggle keeps a 44px mobile target and visible keyboard focus', async () => {
  const source = await readFile(new URL('./AuthenticatedStadiumFavoriteToggle.tsx', import.meta.url), 'utf8');

  assert.match(source, /min-h-11 min-w-11/);
  assert.match(source, /focus-visible:ring-2/);
  assert.match(source, /data-testid=\{testId\}/);
  assert.match(source, /aria-pressed=\{isFavorite\}/);
});
