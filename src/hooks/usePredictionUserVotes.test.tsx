import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  clearPredictionUserVoteCacheForTests,
  getPredictionUserVoteCacheSizeForTests,
  usePredictionUserVotes,
} from './usePredictionUserVotes';

test('usePredictionUserVotes prunes expired batch entries before caching another game set', async (t) => {
  clearPredictionUserVoteCacheForTests();
  t.after(clearPredictionUserVoteCacheForTests);

  let now = 1_800_000_000_000;
  let requestCount = 0;
  t.mock.method(Date, 'now', () => now);
  t.mock.method(globalThis, 'fetch', async () => {
    requestCount += 1;
    return new Response(JSON.stringify({ entries: [] }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  let fetchAndCacheUserVotes: ReturnType<typeof usePredictionUserVotes>['fetchAndCacheUserVotes'] | undefined;
  function Probe() {
    fetchAndCacheUserVotes = usePredictionUserVotes({ userId: 'test-user' }).fetchAndCacheUserVotes;
    return React.createElement('div');
  }
  renderToString(React.createElement(Probe));

  const fetchVotes = fetchAndCacheUserVotes;
  assert.ok(fetchVotes);
  await fetchVotes(['test-game-1'], 'first-batch');
  assert.equal(getPredictionUserVoteCacheSizeForTests(), 1);

  now += 30_000;
  await fetchVotes(['test-game-2'], 'second-batch');

  assert.equal(requestCount, 2);
  assert.equal(getPredictionUserVoteCacheSizeForTests(), 1);
});
