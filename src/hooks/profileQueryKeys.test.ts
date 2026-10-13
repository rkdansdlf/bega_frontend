import test from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';

import { invalidatePublicProfileQuery, profileQueryKeys } from './profileQueryKeys';
import type { ViewerQueryScope } from '../utils/viewerQueryScope';

const viewerA: ViewerQueryScope = { viewerId: 101, sessionEpoch: 4 };
const viewerB: ViewerQueryScope = { viewerId: 202, sessionEpoch: 6 };

test('profile save invalidates the owner profile for the current viewer only', async () => {
  const queryClient = new QueryClient();
  const viewerAKey = profileQueryKeys.publicProfile('@owner', viewerA);
  const viewerBKey = profileQueryKeys.publicProfile('@owner', viewerB);
  queryClient.setQueryData(viewerAKey, { name: 'Before save' });
  queryClient.setQueryData(viewerBKey, { name: 'Other viewer cache' });

  await invalidatePublicProfileQuery(queryClient, 'owner', viewerA);

  assert.equal(queryClient.getQueryState(viewerAKey)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(viewerBKey)?.isInvalidated, false);
  queryClient.clear();
});

test('profile save skips public profile invalidation when the owner handle is absent', () => {
  const queryClient = new QueryClient();

  assert.equal(invalidatePublicProfileQuery(queryClient, undefined, viewerA), undefined);
  queryClient.clear();
});
