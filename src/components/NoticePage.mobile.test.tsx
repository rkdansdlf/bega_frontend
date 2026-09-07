import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StaticRouter } from 'react-router-dom';

import type { CheerPost } from '../api/cheerApi';

const [{ default: NoticePage }, { default: NoticePageRuntime }] = await Promise.all([
  import('./NoticePage'),
  import('./NoticePageRuntime'),
]);

const makePost = (id: number, content = `공지사항 ${id}`): CheerPost => ({
  id,
  teamId: 'LG',
  team: 'LG',
  postType: 'NOTICE',
  author: `운영자 ${id}`,
  authorHandle: `@notice_${id}`,
  content,
  timeAgo: `${id}분 전`,
  teamColor: '#c30452',
  likeCount: id,
  commentCount: id,
  bookmarkCount: 0,
  repostCount: 0,
  views: id,
  isHot: false,
  createdAt: '2026-08-27T00:00:00Z',
  updatedAt: '2026-08-27T00:00:00Z',
  liked: false,
  bookmarked: false,
  isOwner: false,
  repostedByMe: false,
  imageUrls: [],
});

const renderAt = (
  component: ComponentType<Record<string, unknown>>,
  props: Record<string, unknown>,
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return renderToStaticMarkup(createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(
      StaticRouter,
      { location: '/notice' },
      createElement(component, props),
    ),
  ));
};

test('notice page exposes deterministic fallback, loading, error, and empty mobile states', () => {
  const fallbackHtml = renderAt(
    NoticePage as ComponentType<Record<string, unknown>>,
    { visualQaStateOverride: { phase: 'fallback' } },
  );
  assert.match(fallbackHtml, /data-testid="notice-page-fallback"/);

  const loadingHtml = renderAt(
    NoticePageRuntime as ComponentType<Record<string, unknown>>,
    { visualQaStateOverride: { phase: 'loading', userRole: 'ROLE_USER' } },
  );
  assert.match(loadingHtml, /data-testid="notice-page-loading"/);
  assert.equal((loadingHtml.match(/data-testid="notice-page-skeleton"/g) ?? []).length, 5);

  const errorHtml = renderAt(
    NoticePageRuntime as ComponentType<Record<string, unknown>>,
    { visualQaStateOverride: { phase: 'error', userRole: 'ROLE_USER' } },
  );
  assert.match(errorHtml, /data-testid="notice-page-error"/);
  assert.match(errorHtml, /role="alert"/);

  const emptyHtml = renderAt(
    NoticePageRuntime as ComponentType<Record<string, unknown>>,
    { visualQaStateOverride: { phase: 'resolved', posts: [], userRole: 'ROLE_USER' } },
  );
  assert.match(emptyHtml, /data-testid="notice-page-empty"/);
  assert.doesNotMatch(emptyHtml, /data-testid="notice-page-write"/);
});

test('notice page keeps admin actions, long cards, and pagination mobile-safe and keyboard accessible', () => {
  const posts = Array.from({ length: 31 }, (_, index) => makePost(
    index + 1,
    index === 15
      ? `NOTICE-${'UNBROKEN'.repeat(24)}`
      : `모바일 공지사항 ${index + 1} ${'긴 한국어 안내 '.repeat(5)}`,
  ));
  const html = renderAt(
    NoticePageRuntime as ComponentType<Record<string, unknown>>,
    {
      visualQaStateOverride: {
        currentPage: 2,
        phase: 'resolved',
        posts,
        userRole: 'ROLE_ADMIN',
      },
    },
  );

  assert.match(html, /data-testid="notice-page-runtime"/);
  assert.match(html, /flex-col items-stretch gap-4 sm:flex-row/);
  assert.match(html, /<div(?=[^>]*data-testid="notice-page-actions")(?=[^>]*class="[^"]*w-full)[^>]*>/);
  assert.match(html, /<button(?=[^>]*data-testid="notice-page-refresh")(?=[^>]*class="[^"]*min-h-11)[^>]*>/);
  assert.match(html, /<button(?=[^>]*data-testid="notice-page-write")(?=[^>]*class="[^"]*min-h-11)[^>]*>/);
  assert.match(html, /data-testid="notice-post-16"/);
  assert.match(html, /<button(?=[^>]*data-testid="notice-post-16")(?=[^>]*type="button")[^>]*>/);
  assert.match(html, /NOTICE-UNBROKEN/);
  assert.match(html, /\[overflow-wrap:anywhere\]/);
  assert.match(html, /aria-label="이전 공지사항 페이지"/);
  assert.match(html, /aria-label="공지사항 2페이지"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /aria-label="다음 공지사항 페이지"/);
  assert.ok((html.match(/min-h-11 w-11/g) ?? []).length >= 5);
});

test('notice page contains unbroken author and time metadata inside the mobile card', () => {
  const post = {
    ...makePost(1, `NOTICE-${'UNBROKEN'.repeat(24)}`),
    author: `NOTICE-AUTHOR-${'UNBROKEN'.repeat(16)}`,
    timeAgo: `NOTICE-TIME-${'UNBROKEN'.repeat(12)}`,
  };
  const html = renderAt(
    NoticePageRuntime as ComponentType<Record<string, unknown>>,
    {
      visualQaStateOverride: {
        phase: 'resolved',
        posts: [post],
        userRole: undefined,
      },
    },
  );

  assert.match(
    html,
    /<span class="min-w-0 break-words \[overflow-wrap:anywhere\]">NOTICE-TIME-/,
  );
});
