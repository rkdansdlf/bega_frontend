import assert from 'node:assert/strict';
import test from 'node:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { refreshChatUnreadCount } from './chatUnreadRefresh';

test('reading one room refreshes the total unread count instead of clearing other rooms', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = ['chat', 'unread-count'] as const;
  let serverCount = 5;
  const observer = new QueryObserver(client, {
    queryKey: key,
    queryFn: async () => serverCount,
    staleTime: 15_000,
  });
  const unsubscribe = observer.subscribe(() => {});
  try {
    await observer.refetch();
    assert.equal(client.getQueryData(key), 5);
    serverCount = 3;
    await refreshChatUnreadCount(client);
    assert.equal(client.getQueryData(key), 3);
  } finally {
    unsubscribe();
    client.clear();
  }
});

test('failed refresh preserves the last known unread count', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = ['chat', 'unread-count'] as const;
  let fail = false;
  const observer = new QueryObserver(client, {
    queryKey: key,
    queryFn: async () => {
      if (fail) throw new Error('temporary failure');
      return 5;
    },
    staleTime: 15_000,
  });
  const unsubscribe = observer.subscribe(() => {});
  try {
    await observer.refetch();
    fail = true;
    await refreshChatUnreadCount(client);
    assert.equal(client.getQueryData(key), 5);
    assert.equal(observer.getCurrentResult().isError, true);
  } finally {
    unsubscribe();
    client.clear();
  }
});

test('read event replaces an in-flight initial count request', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = ['chat', 'unread-count'] as const;
  let finishOld!: (count: number) => void;
  let calls = 0;
  const observer = new QueryObserver(client, {
    queryKey: key,
    queryFn: () => {
      calls += 1;
      return calls === 1 ? new Promise<number>((resolve) => { finishOld = resolve; }) : Promise.resolve(3);
    },
  });
  const unsubscribe = observer.subscribe(() => {});
  try {
    const refresh = refreshChatUnreadCount(client);
    finishOld(5);
    await refresh;
    assert.equal(calls, 2);
    assert.equal(client.getQueryData(key), 3);
  } finally {
    unsubscribe();
    client.clear();
  }
});
