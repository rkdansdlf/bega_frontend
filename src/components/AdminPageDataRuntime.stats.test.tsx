import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';

import AdminPageDataRuntime from './AdminPageDataRuntime';
import { getAdminStatsQueryOptions } from '../hooks/adminStatsQueryOptions';

const key = getAdminStatsQueryOptions().queryKey;
const clients: QueryClient[] = [];
const client = () => {
  // SSR snapshots must retain seeded error state rather than optimistically refetch on mount.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, refetchOnMount: false, retryOnMount: false } } });
  clients.push(queryClient);
  return queryClient;
};
afterEach(() => { for (const queryClient of clients.splice(0)) queryClient.clear(); });
const render = (queryClient: QueryClient, unrelatedError?: string) => renderToStaticMarkup(
  <QueryClientProvider client={queryClient}>
    <AdminPageDataRuntime activeTab="users" animateStatsOverride={false} panelContentOverride={<div />}
      initialErrorOverride={unrelatedError} />
  </QueryClientProvider>,
);
const failedRead = async (queryClient: QueryClient) => {
  await assert.rejects(queryClient.fetchQuery({ queryKey: key, queryFn: async () => { throw new Error('synthetic 503'); }, staleTime: 0 }));
};

test('without successful statistics all three cards show unknown loading instead of zero', () => {
  const html = render(client());
  assert.equal((html.match(/data-testid="admin-stat-value"[^>]*>—</g) ?? []).length, 3);
  assert.equal((html.match(/통계 로딩 중/g) ?? []).length, 3);
  assert.doesNotMatch(html, /통계 조회 실패/);
});

test('initial query failure marks unknown values and preserves the existing top alert', async () => {
  const queryClient = client(); await failedRead(queryClient);
  const html = render(queryClient);
  assert.equal((html.match(/data-testid="admin-stat-value"[^>]*>—</g) ?? []).length, 3);
  assert.equal((html.match(/통계 조회 실패/g) ?? []).length, 3);
  assert.match(html, /통계를 불러오는데 실패했습니다/);
});

test('a successful zero response remains genuinely zero without unknown guidance', () => {
  const queryClient = client(); queryClient.setQueryData(key, { totalUsers: 0, totalPosts: 0, totalMates: 0 });
  const html = render(queryClient);
  assert.equal((html.match(/data-testid="admin-stat-value"[^>]*>0</g) ?? []).length, 3);
  assert.doesNotMatch(html, /통계 로딩 중|통계 조회 실패|>—</);
});

test('failed refetch retains successful cached counts including a genuine zero', async () => {
  const queryClient = client(); queryClient.setQueryData(key, { totalUsers: 123456, totalPosts: 0, totalMates: 67 });
  await failedRead(queryClient);
  assert.equal(queryClient.getQueryState(key)?.status, 'error');
  const html = render(queryClient);
  assert.match(html, /data-testid="admin-stat-value"[^>]*>123,456</);
  assert.match(html, /data-testid="admin-stat-value"[^>]*>0</);
  assert.match(html, /data-testid="admin-stat-value"[^>]*>67</);
  assert.match(html, /통계를 불러오는데 실패했습니다/);
  assert.doesNotMatch(html, /통계 로딩 중|통계 조회 실패|>—</);
});

test('an unrelated error retains its alert without disguising unknown statistics as a query failure', () => {
  const html = render(client(), '합성 별도 오류');
  assert.match(html, /합성 별도 오류/);
  assert.equal((html.match(/통계 로딩 중/g) ?? []).length, 3);
  assert.doesNotMatch(html, /통계 조회 실패/);
});
