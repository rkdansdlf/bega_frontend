import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { Application, PartyReview } from '../types/mate';

const { default: MateDetailReviewsSection } = await import('./MateDetailReviewsSection');

const makeApplication = (id: number, name = `메이트 ${id}`): Application => ({
  id,
  partyId: 42,
  applicantHandle: `mate-${id}`,
  applicantName: name,
  applicantBadge: 'VERIFIED',
  applicantRating: 4.5,
  message: `동행 신청 ${id}`,
  isApproved: true,
  isRejected: false,
  createdAt: '2026-08-28T09:00:00+09:00',
});

const makeReview = (
  revieweeHandle: string,
  comment = '시간 약속을 잘 지켰어요.',
): PartyReview => ({
  id: 1,
  partyId: 42,
  reviewerHandle: 'viewer',
  revieweeHandle,
  rating: 5,
  comment,
  createdAt: '2026-08-28T10:00:00+09:00',
});

const renderSection = (props: Record<string, unknown>) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const html = renderToStaticMarkup(createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(MateDetailReviewsSection as unknown as ComponentType<Record<string, unknown>>, {
      partyId: 42,
      partyStatus: 'COMPLETED',
      partyHostHandle: 'host-kim',
      partyHostName: '김호스트',
      currentUserId: 7,
      currentUserHandle: 'viewer',
      isHost: false,
      sectionCardClass: 'border bg-white dark:bg-black',
      insetPanelClass: 'rounded-xl border bg-gray-50 dark:bg-gray-900',
      onRequestReview: () => undefined,
      ...props,
    }),
  ));
  queryClient.clear();
  return html;
};

test('mate detail reviews keeps loading and transport failure visible instead of showing an empty target state', () => {
  const loadingHtml = renderSection({
    visualQaStateOverride: {
      reviews: [],
      applications: [],
      reviewsIsLoading: true,
      applicationsIsLoading: false,
      reviewsIsError: false,
      applicationsIsError: false,
    },
  });
  assert.match(loadingHtml, /data-testid="mate-detail-reviews-loading"/);
  assert.match(loadingHtml, /role="status"/);
  assert.doesNotMatch(loadingHtml, /리뷰 대상이 없습니다/);

  const errorHtml = renderSection({
    isHost: true,
    visualQaStateOverride: {
      reviews: [],
      applications: [],
      reviewsIsLoading: false,
      applicationsIsLoading: false,
      reviewsIsError: true,
      applicationsIsError: true,
    },
  });
  assert.match(errorHtml, /data-testid="mate-detail-reviews-error"/);
  assert.match(errorHtml, /role="alert"/);
  assert.match(errorHtml, /data-testid="mate-detail-reviews-retry"/);
  assert.match(errorHtml, /min-h-11/);
});

test('mate detail review rows contain unbroken identity and reviewed comment pressure at mobile width', () => {
  const longHandle = `host-${'x'.repeat(160)}`;
  const longName = `모바일에서도 리뷰 버튼과 겹치지 않고 여러 줄로 표시되어야 하는 호스트 이름 ${'가'.repeat(80)}`;
  const longComment = `REVIEW-${'Y'.repeat(260)}`;
  const html = renderSection({
    partyHostHandle: longHandle,
    partyHostName: longName,
    visualQaStateOverride: {
      reviews: [makeReview(longHandle, longComment)],
      applications: [],
      reviewsIsLoading: false,
      applicationsIsLoading: false,
      reviewsIsError: false,
      applicationsIsError: false,
    },
  });

  assert.match(html, /data-testid="mate-detail-reviews-section"/);
  assert.match(html, /data-testid="mate-detail-review-target-0"/);
  assert.match(html, /data-testid="mate-detail-review-comment"/);
  assert.match(html, /flex-col/);
  assert.match(html, /sm:flex-row/);
  assert.match(html, /overflow-wrap:anywhere/);
  assert.match(html, /작성 완료/);
  assert.ok(html.indexOf('작성 완료') < html.indexOf(longComment));
  assert.match(html, /data-testid="mate-detail-review-comment"[^>]*class="[^"]*w-full/);
  assert.doesNotMatch(html, /리뷰 작성/);
});

test('mate detail reviews bounds the maximum host target inventory in an internal mobile scroller', () => {
  const applications = Array.from({ length: 50 }, (_, index) => makeApplication(index + 1));
  const html = renderSection({
    isHost: true,
    visualQaStateOverride: {
      reviews: [],
      applications,
      reviewsIsLoading: false,
      applicationsIsLoading: false,
      reviewsIsError: false,
      applicationsIsError: false,
    },
  });

  assert.equal((html.match(/data-testid="mate-detail-review-target-/g) ?? []).length, 50);
  assert.match(html, /data-testid="mate-detail-review-targets"/);
  assert.match(html, /max-h-\[60dvh\]/);
  assert.match(html, /overflow-y-auto/);
  assert.match(html, /overscroll-contain/);
  assert.equal((html.match(/data-testid="mate-detail-review-write-/g) ?? []).length, 50);
  assert.match(html, /min-h-11/);
  assert.match(html, /w-full/);
});
