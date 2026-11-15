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

test('an invalidated old request cannot remove a replacement in-flight batch', async (t) => {
  clearPredictionUserVoteCacheForTests();
  t.after(clearPredictionUserVoteCacheForTests);

  const resolveRequests: Array<(response: Response) => void> = [];
  t.mock.method(globalThis, 'fetch', () => new Promise<Response>((resolve) => {
    resolveRequests.push(resolve);
  }));

  let fetchAndCacheUserVotes: ReturnType<typeof usePredictionUserVotes>['fetchAndCacheUserVotes'] | undefined;
  function Probe() {
    fetchAndCacheUserVotes = usePredictionUserVotes({ userId: 'race-user' }).fetchAndCacheUserVotes;
    return React.createElement('div');
  }
  renderToString(React.createElement(Probe));

  const fetchVotes = fetchAndCacheUserVotes;
  assert.ok(fetchVotes);
  const pending: Promise<void>[] = [];
  const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
  const response = () => new Response(JSON.stringify({ entries: [] }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });

  try {
    const oldRequest = fetchVotes(['race-game'], 'same-batch');
    pending.push(oldRequest);
    await flush();
    assert.equal(resolveRequests.length, 1);

    clearPredictionUserVoteCacheForTests();
    const replacementRequest = fetchVotes(['race-game'], 'same-batch');
    pending.push(replacementRequest);
    await flush();
    assert.equal(resolveRequests.length, 2);

    resolveRequests[0](response());
    await oldRequest;

    const joinedRequest = fetchVotes(['race-game'], 'same-batch');
    pending.push(joinedRequest);
    await flush();

    assert.equal(resolveRequests.length, 2);
    resolveRequests[1](response());
    await Promise.all([replacementRequest, joinedRequest]);
  } finally {
    resolveRequests.forEach((resolve) => resolve(response()));
    await Promise.allSettled(pending);
  }
});
