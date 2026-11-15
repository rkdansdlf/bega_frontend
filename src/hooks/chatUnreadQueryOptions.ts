import { getChatUnreadCounts } from '../api/mate';
import { CHAT_UNREAD_QUERY_KEY } from './chatUnreadRefresh';

export { CHAT_UNREAD_QUERY_KEY } from './chatUnreadRefresh';

export const getChatUnreadQueryOptions = (
  enabled: boolean,
) => ({
  queryKey: CHAT_UNREAD_QUERY_KEY,
  queryFn: ({ signal }: { signal: AbortSignal }) => getChatUnreadCounts({ signal }),
  enabled,
  staleTime: 15 * 1000,
  gcTime: 5 * 60 * 1000,
  retry: false,
  refetchOnWindowFocus: true,
} as const);
