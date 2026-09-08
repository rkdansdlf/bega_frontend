import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { AdminSeatView, AdminSeatViewFilters } from '../../types/admin';
import { AdminSeatViewsPanel } from './AdminSeatViewsPanel';

const defaultFilters: AdminSeatViewFilters = {
  moderationStatus: 'all',
  stadium: '',
  aiSuggestedLabel: 'all',
  adminLabel: 'all',
  ticketVerified: 'all',
};

const baseSeatView: AdminSeatView = {
  id: 42,
  diaryId: 24,
  userId: 7,
  photoUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"/%3E',
  storagePath: 'MOCK/seat-view/42.svg',
  sourceType: 'MOCK_DIARY',
  aiSuggestedLabel: 'SEAT_VIEW',
  aiConfidence: 0.92,
  aiReason: 'MOCK 시야뷰 판정 근거',
  userSelected: true,
  moderationStatus: 'PENDING',
  adminLabel: null,
  adminMemo: null,
  reviewedBy: null,
  reviewedAt: null,
  rewardGranted: false,
  stadium: 'MOCK_STADIUM',
  section: 'MOCK 1루 구역',
  block: 'MOCK 101블록',
  seatRow: 'MOCK 12열',
  seatNumber: 'MOCK 34번',
  diaryDate: '2026-08-28',
  ticketVerified: true,
  ticketVerifiedAt: '2026-08-28T00:30:00.000Z',
  rating: 5,
  comment: 'MOCK 좌석 한줄평',
  tags: ['MOCK 시야 좋음'],
};

const renderPanel = ({
  filters = defaultFilters,
  loading = false,
  seatViews = [baseSeatView],
}: {
  filters?: AdminSeatViewFilters;
  loading?: boolean;
  seatViews?: AdminSeatView[];
} = {}) => renderToStaticMarkup(createElement(AdminSeatViewsPanel, {
  handleSeatViewAction: () => undefined,
  openSeatViewDetail: () => undefined,
  resetSeatViewFilters: () => undefined,
  seatViewFilters: filters,
  seatViews,
  seatViewsLoading: loading,
  updateSeatViewFilters: () => undefined,
}));

test('admin seat-view filters expose persistent names and mobile touch targets', () => {
  const html = renderPanel();

  assert.match(html, /data-testid="admin-seat-views-panel"/);
  for (const [id, label] of [
    ['admin-seat-views-status-filter', '상태'],
    ['admin-seat-views-stadium-filter', '구장'],
    ['admin-seat-views-ai-filter', 'AI 라벨'],
    ['admin-seat-views-admin-filter', '관리자 라벨'],
    ['admin-seat-views-ticket-filter', '티켓 인증'],
  ]) {
    assert.match(html, new RegExp(`<label[^>]*for="${id}"[^>]*>[\\s\\S]*${label}`));
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.ok((html.match(/min-h-11/g) ?? []).length >= 6);
});

test('admin seat-view terminal states remain centered without an off-screen wide table', () => {
  const loadingHtml = renderPanel({ loading: true, seatViews: [baseSeatView] });
  const emptyHtml = renderPanel({ seatViews: [] });

  assert.match(loadingHtml, /role="status"[^>]*aria-live="polite"/);
  assert.match(loadingHtml, /시야뷰 후보 로딩 중/);
  assert.doesNotMatch(loadingHtml, /<table/);
  assert.match(emptyHtml, /role="status"/);
  assert.match(emptyHtml, /시야뷰 후보가 없습니다/);
  assert.doesNotMatch(emptyHtml, /<table/);
});

test('admin seat-view rows contain wide tables and truncate pressure values without losing originals', () => {
  const pressure = `MOCK_${'UNBROKEN'.repeat(24)}`;
  const html = renderPanel({
    seatViews: [{
      ...baseSeatView,
      aiSuggestedLabel: pressure,
      moderationStatus: pressure,
      stadium: pressure,
      section: pressure,
      block: pressure,
      seatRow: pressure,
      seatNumber: pressure,
    }],
  });

  assert.match(html, /data-testid="admin-seat-views-table-region"/);
  assert.match(html, /max-h-\[320px\][^"]*overflow-y-auto/);
  assert.match(html, /<table[^>]*aria-label="시야뷰 후보 목록"/);
  assert.match(html, /<table[^>]*min-w-\[1088px\][^>]*table-fixed/);
  assert.match(html, /data-testid="admin-seat-view-row-42"/);
  assert.ok((html.match(/title="MOCK_UNBROKEN/g) ?? []).length >= 3);
  assert.ok((html.match(/truncate/g) ?? []).length >= 4);
});

test('admin seat-view row actions have explicit names and 44px mobile targets', () => {
  const html = renderPanel();

  assert.match(html, /alt="시야뷰 후보 42번"/);
  assert.match(html, /aria-label="시야뷰 42번 상세 보기"/);
  assert.match(html, /aria-label="시야뷰 42번 승인"/);
  assert.ok((html.match(/min-h-11/g) ?? []).length >= 8);
  assert.ok((html.match(/min-w-11/g) ?? []).length >= 2);
});
