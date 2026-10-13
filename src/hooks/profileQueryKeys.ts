import type { QueryClient } from '@tanstack/react-query';

import { getViewerQueryScope, viewerScopedQueryKey } from '../utils/viewerQueryScope';
import type { ViewerQueryScope } from '../utils/viewerQueryScope';

export const profileQueryKeys = {
  publicProfile: (handle: string | undefined, scope: ViewerQueryScope = getViewerQueryScope()) =>
    viewerScopedQueryKey(['publicProfile', handle], scope),
  followCounts: (handle: string | undefined, scope: ViewerQueryScope = getViewerQueryScope()) =>
    viewerScopedQueryKey(['followCounts', handle], scope),
  userList: (
    owner: string,
    type: 'followers' | 'following',
    scope: ViewerQueryScope = getViewerQueryScope(),
  ) => viewerScopedQueryKey(['userList', owner, type], scope),
  userPosts: (handle: string | undefined, scope: ViewerQueryScope = getViewerQueryScope()) =>
    viewerScopedQueryKey(['userPosts', handle], scope),
} as const;

export const invalidatePublicProfileQuery = (
  queryClient: Pick<QueryClient, 'invalidateQueries'>,
  handle: string | undefined,
  scope: ViewerQueryScope = getViewerQueryScope(),
) => {
  if (!handle) return undefined;

  const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;
  return queryClient.invalidateQueries({
    queryKey: profileQueryKeys.publicProfile(normalizedHandle, scope),
  });
};
