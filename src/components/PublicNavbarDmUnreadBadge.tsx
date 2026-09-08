import { QueryClientProvider, useQuery } from '@tanstack/react-query';

import { queryClient } from '../lib/queryClient';

interface PublicNavbarDmUnreadBadgeProps {
  stateOverride?: 'error' | 'loading';
  unreadCountOverride?: number;
}

function PublicNavbarDmUnreadBadgeContent({
  stateOverride,
  unreadCountOverride,
}: PublicNavbarDmUnreadBadgeProps) {
  const { data: dmRoomsData } = useQuery({
    queryKey: ['dm', 'inbox'],
    queryFn: async () => {
      const { fetchMyDmRooms } = await import('../api/dm');
      return fetchMyDmRooms();
    },
    enabled: unreadCountOverride === undefined && stateOverride === undefined,
    staleTime: 30_000,
  });
  const unreadCountCandidate = unreadCountOverride
    ?? dmRoomsData?.filter((room) => room.hasUnread).length
    ?? 0;
  const dmUnreadCount = Number.isFinite(unreadCountCandidate)
    ? Math.max(0, Math.trunc(unreadCountCandidate))
    : 0;

  if (stateOverride !== undefined || dmUnreadCount <= 0) {
    return (
      <span
        hidden
        aria-hidden="true"
        data-testid="public-navbar-dm-unread-badge-empty"
      />
    );
  }

  return (
    <span
      data-testid="public-navbar-dm-unread-badge"
      role="status"
      aria-label={`${dmUnreadCount}개의 읽지 않은 메시지`}
      className="pointer-events-none absolute -top-0.5 -right-0.5 z-10 inline-flex h-4 min-w-4 max-w-7 items-center justify-center overflow-hidden rounded-full bg-red-600 px-1 text-10 font-bold leading-none text-white"
    >
      {dmUnreadCount > 99 ? '99+' : dmUnreadCount}
    </span>
  );
}

export default function PublicNavbarDmUnreadBadge({
  stateOverride,
  unreadCountOverride,
}: PublicNavbarDmUnreadBadgeProps = {}) {
  return (
    <QueryClientProvider client={queryClient}>
      <PublicNavbarDmUnreadBadgeContent
        stateOverride={stateOverride}
        unreadCountOverride={unreadCountOverride}
      />
    </QueryClientProvider>
  );
}
