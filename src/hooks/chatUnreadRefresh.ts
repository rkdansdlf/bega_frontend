import type { QueryClient } from '@tanstack/react-query';

export const CHAT_UNREAD_QUERY_KEY = ['chat', 'unread-count'] as const;

export const refreshChatUnreadCount = async (client: QueryClient) => {
  await client.cancelQueries({ queryKey: CHAT_UNREAD_QUERY_KEY });
  await client.invalidateQueries({ queryKey: CHAT_UNREAD_QUERY_KEY });
};
