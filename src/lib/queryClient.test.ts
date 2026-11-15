import test from 'node:test';
import assert from 'node:assert/strict';

import { clearSessionScopedQueries, queryClient } from './queryClient';

test('session cleanup removes viewer-specific cheer feed and detail caches', (t) => {
  t.after(() => queryClient.clear());

  const feedKey = ['cheer-posts', 'all', 'all', 'default'];
  const detailKey = ['cheer-post', 45];
  const searchKey = ['cheer', 'search', { q: 'team' }];
  const unrelatedKey = ['public-game-schedule', '2026-10-15'];

  queryClient.setQueryData(feedKey, { pages: [{ posts: [{ isOwner: true, liked: true }] }] });
  queryClient.setQueryData(detailKey, { isOwner: true, liked: true });
  queryClient.setQueryData(searchKey, { pages: [{ posts: [{ isOwner: true }] }] });
  queryClient.setQueryData(unrelatedKey, { games: [] });

  clearSessionScopedQueries();

  assert.equal(queryClient.getQueryData(feedKey), undefined);
  assert.equal(queryClient.getQueryData(detailKey), undefined);
  assert.equal(queryClient.getQueryData(searchKey), undefined);
  assert.deepEqual(queryClient.getQueryData(unrelatedKey), { games: [] });
});

test('session cleanup does not restore an in-flight cheer response from the prior viewer', async (t) => {
  t.after(() => queryClient.clear());

  const delayedKey = ['cheer', 'posts', { userId: 606, page: 0 }];
  let resolvePriorViewer: ((value: { owner: string }) => void) | undefined;
  const pending = queryClient.fetchQuery({
    queryKey: delayedKey,
    queryFn: () => new Promise<{ owner: string }>((resolve) => {
      resolvePriorViewer = resolve;
    }),
    staleTime: 0,
    gcTime: 0,
  }).catch(() => undefined);

  await Promise.resolve();
  assert.equal(typeof resolvePriorViewer, 'function');

  clearSessionScopedQueries();
  resolvePriorViewer?.({ owner: 'viewer-a' });
  await pending;

  assert.equal(queryClient.getQueryData(delayedKey), undefined);
});
