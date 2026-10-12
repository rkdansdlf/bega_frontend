import { getAuthSessionEpoch } from '../api/authSessionGeneration';
import { useAuthStore } from '../store/authStore';

export interface ViewerQueryScope {
  viewerId: number | null;
  sessionEpoch: number;
}

export const getViewerQueryScope = (): ViewerQueryScope => ({
  viewerId: useAuthStore.getState().user?.id ?? null,
  sessionEpoch: getAuthSessionEpoch(),
});

export const isViewerQueryScopeCurrent = (scope: ViewerQueryScope): boolean => {
  const current = getViewerQueryScope();
  return current.viewerId === scope.viewerId && current.sessionEpoch === scope.sessionEpoch;
};

export const viewerScopedQueryKey = <T extends readonly unknown[]>(
  queryKey: T,
  scope: ViewerQueryScope = getViewerQueryScope(),
) => [...queryKey, 'viewer', scope.viewerId ?? 'guest', scope.sessionEpoch] as const;

export const matchesViewerQueryScope = (
  queryKey: readonly unknown[],
  scope: ViewerQueryScope,
): boolean => (
  queryKey.length >= 3
  && queryKey[queryKey.length - 3] === 'viewer'
  && queryKey[queryKey.length - 2] === (scope.viewerId ?? 'guest')
  && queryKey[queryKey.length - 1] === scope.sessionEpoch
);
