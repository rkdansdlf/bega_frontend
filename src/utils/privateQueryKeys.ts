import { getViewerQueryScope, viewerScopedQueryKey } from './viewerQueryScope';
import type { ViewerQueryScope } from './viewerQueryScope';

export const SESSION_SCOPED_QUERY_KEY_ROOTS = [
  ['accountSecurityEvents'],
  ['accountSessions'],
  ['connectedProviders'],
  ['diaries'],
  ['statistics'],
  ['blockedUsers'],
  ['powerups'],
  ['leaderboard', 'me'],
  ['prediction-stats-me'],
  ['dm', 'inbox'],
  ['dmRoomBootstrap'],
  ['dmMessages'],
  ['cheer-bookmarks'],
  ['cheer', 'my-posts'],
] as const;

export const PRIVATE_QUERY_KEYS = {
  accountSecurityEvents: (scope?: ViewerQueryScope) =>
    viewerScopedQueryKey(['accountSecurityEvents'], scope ?? getViewerQueryScope()),
  accountSessions: (scope?: ViewerQueryScope) =>
    viewerScopedQueryKey(['accountSessions'], scope ?? getViewerQueryScope()),
  connectedProviders: (scope?: ViewerQueryScope) =>
    viewerScopedQueryKey(['connectedProviders'], scope ?? getViewerQueryScope()),
  diaries: (scope?: ViewerQueryScope) =>
    viewerScopedQueryKey(['diaries'], scope ?? getViewerQueryScope()),
  diaryStatistics: (scope?: ViewerQueryScope) =>
    viewerScopedQueryKey(['statistics'], scope ?? getViewerQueryScope()),
  blockedUsers: (scope?: ViewerQueryScope) =>
    viewerScopedQueryKey(['blockedUsers'], scope ?? getViewerQueryScope()),
  powerupInventory: (scope?: ViewerQueryScope) =>
    viewerScopedQueryKey(['powerups', 'inventory'], scope ?? getViewerQueryScope()),
  activePowerups: (scope?: ViewerQueryScope) =>
    viewerScopedQueryKey(['powerups', 'active'], scope ?? getViewerQueryScope()),
  leaderboardMe: (scope?: ViewerQueryScope) =>
    viewerScopedQueryKey(['leaderboard', 'me'], scope ?? getViewerQueryScope()),
  predictionStats: (scope?: ViewerQueryScope) =>
    viewerScopedQueryKey(['prediction-stats-me'], scope ?? getViewerQueryScope()),
  dmInbox: (scope?: ViewerQueryScope) =>
    viewerScopedQueryKey(['dm', 'inbox'], scope ?? getViewerQueryScope()),
  dmRoomBootstrap: (handle: string, scope?: ViewerQueryScope) =>
    viewerScopedQueryKey(['dmRoomBootstrap', handle], scope ?? getViewerQueryScope()),
  dmMessages: (roomId: number, scope?: ViewerQueryScope) =>
    viewerScopedQueryKey(['dmMessages', roomId], scope ?? getViewerQueryScope()),
  cheerBookmarks: (scope?: ViewerQueryScope) =>
    viewerScopedQueryKey(['cheer-bookmarks'], scope ?? getViewerQueryScope()),
  cheerMyPosts: (params: { page?: number; size?: number; sort?: string } = {}, scope?: ViewerQueryScope) =>
    viewerScopedQueryKey(['cheer', 'my-posts', params], scope ?? getViewerQueryScope()),
} as const;
