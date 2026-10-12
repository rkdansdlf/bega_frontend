import test from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';

import { profileQueryKeys } from '../hooks/profileQueryKeys';
import { getMatePartyQueryOptions, getMatePartyListQueryOptions, getMatePartyCheckInsQueryOptions } from '../hooks/mateQueryOptions';
import { clearSessionScopedQueries, queryClient as sharedQueryClient } from '../lib/queryClient';
import { useNotificationStore } from '../store/notificationStore';
import { PRIVATE_QUERY_KEYS } from './privateQueryKeys';
import type { ViewerQueryScope } from './viewerQueryScope';

const viewerA: ViewerQueryScope = { viewerId: 101, sessionEpoch: 4 };
const viewerB: ViewerQueryScope = { viewerId: 202, sessionEpoch: 6 };

test('viewer-dependent profile and user-list keys isolate users and auth sessions', () => {
  const queryClient = new QueryClient();
  const keyA = profileQueryKeys.publicProfile('@fixture-private', viewerA);
  const keyB = profileQueryKeys.publicProfile('@fixture-private', viewerB);

  queryClient.setQueryData(keyA, { bio: 'A-only' });

  assert.deepEqual(queryClient.getQueryData(keyA), { bio: 'A-only' });
  assert.equal(queryClient.getQueryData(keyB), undefined);
  assert.notDeepEqual(
    profileQueryKeys.userList('me', 'followers', viewerA),
    profileQueryKeys.userList('me', 'followers', viewerB),
  );
  assert.notDeepEqual(
    profileQueryKeys.publicProfile('@fixture-private', { ...viewerA, sessionEpoch: 5 }),
    keyA,
  );
  queryClient.clear();
});

test('mate favorite, party detail and host check-in keys are viewer scoped', () => {
  const queryClient = new QueryClient();
  const listA = getMatePartyListQueryOptions({}, viewerA).queryKey;
  const listB = getMatePartyListQueryOptions({}, viewerB).queryKey;
  const detailA = getMatePartyQueryOptions(11, viewerA).queryKey;
  const detailB = getMatePartyQueryOptions(11, viewerB).queryKey;
  const checkInsA = getMatePartyCheckInsQueryOptions(11, viewerA).queryKey;
  const checkInsB = getMatePartyCheckInsQueryOptions(11, viewerB).queryKey;

  queryClient.setQueryData(listA, [{ id: 11, favorited: true }]);
  queryClient.setQueryData(detailA, { id: 11, favorited: true });
  queryClient.setQueryData(checkInsA, [{ userHandle: 'host-a' }]);

  assert.equal(queryClient.getQueryData(listB), undefined);
  assert.equal(queryClient.getQueryData(detailB), undefined);
  assert.equal(queryClient.getQueryData(checkInsB), undefined);
  queryClient.clear();
});

test('session cleanup removes viewer-scoped profile, follower and mate caches from the shared QueryClient', () => {
  const keys = [
    profileQueryKeys.publicProfile('@fixture-private', viewerA),
    profileQueryKeys.followCounts('@fixture-private', viewerA),
    profileQueryKeys.userList('me', 'followers', viewerA),
    getMatePartyListQueryOptions({}, viewerA).queryKey,
    getMatePartyQueryOptions(11, viewerA).queryKey,
    getMatePartyCheckInsQueryOptions(11, viewerA).queryKey,
  ];
  keys.forEach((key) => sharedQueryClient.setQueryData(key, { private: true }));

  clearSessionScopedQueries();

  keys.forEach((key) => assert.equal(sharedQueryClient.getQueryData(key), undefined));
});

test('private account, diary, DM and personal-stat keys isolate viewer and session epochs', () => {
  const queryClient = new QueryClient();
  const keyPairs = [
    [PRIVATE_QUERY_KEYS.connectedProviders(viewerA), PRIVATE_QUERY_KEYS.connectedProviders(viewerB)],
    [PRIVATE_QUERY_KEYS.accountSessions(viewerA), PRIVATE_QUERY_KEYS.accountSessions(viewerB)],
    [PRIVATE_QUERY_KEYS.accountSecurityEvents(viewerA), PRIVATE_QUERY_KEYS.accountSecurityEvents(viewerB)],
    [PRIVATE_QUERY_KEYS.diaries(viewerA), PRIVATE_QUERY_KEYS.diaries(viewerB)],
    [PRIVATE_QUERY_KEYS.diaryStatistics(viewerA), PRIVATE_QUERY_KEYS.diaryStatistics(viewerB)],
    [PRIVATE_QUERY_KEYS.blockedUsers(viewerA), PRIVATE_QUERY_KEYS.blockedUsers(viewerB)],
    [PRIVATE_QUERY_KEYS.powerupInventory(viewerA), PRIVATE_QUERY_KEYS.powerupInventory(viewerB)],
    [PRIVATE_QUERY_KEYS.activePowerups(viewerA), PRIVATE_QUERY_KEYS.activePowerups(viewerB)],
    [PRIVATE_QUERY_KEYS.leaderboardMe(viewerA), PRIVATE_QUERY_KEYS.leaderboardMe(viewerB)],
    [PRIVATE_QUERY_KEYS.predictionStats(viewerA), PRIVATE_QUERY_KEYS.predictionStats(viewerB)],
    [PRIVATE_QUERY_KEYS.dmInbox(viewerA), PRIVATE_QUERY_KEYS.dmInbox(viewerB)],
    [PRIVATE_QUERY_KEYS.dmRoomBootstrap('@fixture', viewerA), PRIVATE_QUERY_KEYS.dmRoomBootstrap('@fixture', viewerB)],
    [PRIVATE_QUERY_KEYS.dmMessages(77, viewerA), PRIVATE_QUERY_KEYS.dmMessages(77, viewerB)],
    [PRIVATE_QUERY_KEYS.cheerBookmarks(viewerA), PRIVATE_QUERY_KEYS.cheerBookmarks(viewerB)],
    [PRIVATE_QUERY_KEYS.cheerMyPosts({ size: 10 }, viewerA), PRIVATE_QUERY_KEYS.cheerMyPosts({ size: 10 }, viewerB)],
  ] as const;

  keyPairs.forEach(([keyA, keyB]) => {
    queryClient.setQueryData(keyA, { owner: 'A' });
    assert.deepEqual(queryClient.getQueryData(keyA), { owner: 'A' });
    assert.equal(queryClient.getQueryData(keyB), undefined);
  });
  assert.notDeepEqual(
    PRIVATE_QUERY_KEYS.dmMessages(77, viewerA),
    PRIVATE_QUERY_KEYS.dmMessages(77, { ...viewerA, sessionEpoch: viewerA.sessionEpoch + 1 }),
  );
});

test('session cleanup removes private query families and resets account-owned notification state', () => {
  const keys = [
    PRIVATE_QUERY_KEYS.connectedProviders(viewerA),
    PRIVATE_QUERY_KEYS.accountSessions(viewerA),
    PRIVATE_QUERY_KEYS.accountSecurityEvents(viewerA),
    PRIVATE_QUERY_KEYS.diaries(viewerA),
    PRIVATE_QUERY_KEYS.diaryStatistics(viewerA),
    PRIVATE_QUERY_KEYS.blockedUsers(viewerA),
    PRIVATE_QUERY_KEYS.powerupInventory(viewerA),
    PRIVATE_QUERY_KEYS.activePowerups(viewerA),
    PRIVATE_QUERY_KEYS.leaderboardMe(viewerA),
    PRIVATE_QUERY_KEYS.predictionStats(viewerA),
    PRIVATE_QUERY_KEYS.dmInbox(viewerA),
    PRIVATE_QUERY_KEYS.dmRoomBootstrap('@fixture', viewerA),
    PRIVATE_QUERY_KEYS.dmMessages(77, viewerA),
    PRIVATE_QUERY_KEYS.cheerBookmarks(viewerA),
    PRIVATE_QUERY_KEYS.cheerMyPosts({ size: 10 }, viewerA),
  ];
  keys.forEach((key) => sharedQueryClient.setQueryData(key, { owner: 'A' }));
  useNotificationStore.getState().setNotifications([{
    id: 901,
    type: 'POST_COMMENT',
    title: 'private A notification',
    message: 'synthetic',
    relatedId: 1,
    isRead: false,
    createdAt: '2026-09-29T00:00:00.000Z',
  }]);

  clearSessionScopedQueries();

  keys.forEach((key) => assert.equal(sharedQueryClient.getQueryData(key), undefined));
  assert.deepEqual(useNotificationStore.getState().notifications, []);
});

test('a delayed viewer A query completion cannot repopulate cleared cache or overwrite viewer B', async () => {
  const keyA = getMatePartyQueryOptions(11, viewerA).queryKey;
  const keyB = getMatePartyQueryOptions(11, viewerB).queryKey;
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
  let resolveViewerA!: (value: { id: number; owner: string }) => void;
  const pendingViewerA = queryClient.fetchQuery({
    queryKey: keyA,
    queryFn: () => new Promise<{ id: number; owner: string }>((resolve) => {
      resolveViewerA = resolve;
    }),
  });
  const cancelledViewerA = assert.rejects(pendingViewerA);

  await Promise.resolve();
  assert.equal(typeof resolveViewerA, 'function');

  await queryClient.cancelQueries({ queryKey: ['mate'] });
  queryClient.removeQueries({ queryKey: ['mate'] });
  queryClient.setQueryData(keyB, { id: 11, owner: 'viewer-b' });
  resolveViewerA({ id: 11, owner: 'viewer-a' });

  await cancelledViewerA;
  assert.equal(queryClient.getQueryData(keyA), undefined);
  assert.deepEqual(queryClient.getQueryData(keyB), { id: 11, owner: 'viewer-b' });
  queryClient.clear();
});
