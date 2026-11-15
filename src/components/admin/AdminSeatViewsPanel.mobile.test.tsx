import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { AdminSeatView, AdminSeatViewFilters, AdminSeatViewPage } from '../../types/admin';
import { AdminSeatViewsPanel } from './AdminSeatViewsPanel';
import { normalizeAdminSeatViewPageNumber } from './adminSeatViewPagination';

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

const defaultPage: AdminSeatViewPage = {
  content: [baseSeatView],
  totalElements: 1,
  totalPages: 1,
  size: 20,
  number: 0,
  last: true,
};

const renderPanel = ({
  filters = defaultFilters,
  loading = false,
  error = null,
  seatViews = [baseSeatView],
  page = defaultPage,
}: {
  filters?: AdminSeatViewFilters;
  loading?: boolean;
  error?: string | null;
  seatViews?: AdminSeatView[];
  page?: AdminSeatViewPage;
} = {}) => renderToStaticMarkup(createElement(AdminSeatViewsPanel, {
  handleSeatViewAction: () => undefined,
  openSeatViewDetail: () => undefined,
  resetSeatViewFilters: () => undefined,
  seatViewFilters: filters,
  seatViews,
  seatViewsPage: page,
  onSeatViewsPageChange: () => undefined,
  seatViewsLoading: loading,
  seatViewsError: error,
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

test('admin seat-view list exposes bounded previous/next pagination', () => {
  const html = renderPanel({
    page: { ...defaultPage, totalElements: 41, totalPages: 3, number: 1, last: false },
  });

  assert.match(html, /총 41건 · 2 \/ 3 페이지/);
  assert.match(html, /data-testid="admin-seat-views-previous-page"/);
  assert.match(html, /data-testid="admin-seat-views-next-page"/);
});

test('admin seat-view pagination moves to the last remaining page after moderation shrinks results', () => {
  assert.equal(normalizeAdminSeatViewPageNumber(2, 2), 1);
  assert.equal(normalizeAdminSeatViewPageNumber(1, 0), 0);
  assert.equal(normalizeAdminSeatViewPageNumber(0, 0), 0);
  assert.equal(normalizeAdminSeatViewPageNumber(1, 3), 1);
});

test('admin seat-view rows show an accessible placeholder when a photo URL is missing', () => {
  for (const photoUrl of ['', null]) {
    const html = renderPanel({
      seatViews: [{ ...baseSeatView, photoUrl }],
    });

    assert.doesNotMatch(html, /<img/);
    assert.match(html, /data-testid="admin-seat-view-photo-fallback-42"/);
    assert.match(html, /role="img"[^>]*aria-label="시야뷰 후보 42번 사진을 불러올 수 없습니다"/);
  }
});

test('admin seat-view failed query has local guidance instead of healthy empty or duplicate live alert', () => {
  const html = renderPanel({ seatViews: [], error: '시야뷰 후보 조회 실패' });
  assert.match(html, /admin-seat-views-error/);
  assert.match(html, /시야뷰 후보 조회 실패/);
  assert.match(html, /break-keep px-3/);
  assert.doesNotMatch(html, /시야뷰 후보가 없습니다|role="alert"|aria-live/);
});

test('admin seat-view cached rows survive failed refresh with local guidance', () => {
  const html = renderPanel({ error: '시야뷰 후보 조회 실패' });
  assert.match(html, /admin-seat-views-error/);
  assert.match(html, /admin-seat-view-row-42/);
  assert.doesNotMatch(html, /시야뷰 후보가 없습니다/);
});

test('admin seat-view loading does not expose an old failure or healthy empty', () => {
  const html = renderPanel({ loading: true, seatViews: [], error: 'old failure' });
  assert.match(html, /시야뷰 후보 로딩 중/);
  assert.doesNotMatch(html, /admin-seat-views-error|시야뷰 후보가 없습니다/);
});

test('admin seat-view controls keep local desktop44px targets', () => {
  const html = renderPanel();
  assert.match(html, /sm:min-h-11/);
  assert.doesNotMatch(html, /sm:min-h-8|sm:min-h-9|sm:min-w-8/);
});

test('admin seat-view drawer separates failed detail and scopes its own dark background', async () => {
  const source = await readFile(new URL('./AdminSeatViewDetailDrawer.tsx', import.meta.url), 'utf8');
  assert.match(source, /seatViewDetailError\?: string \| null/);
  assert.match(source, /data-testid="admin-seat-view-detail-error"/);
  assert.match(source, /seatViewDetailError \? \([\s\S]*!selectedSeatViewDetail/);
  assert.match(source, /className="max-w-xl dark admin-seat-view-detail-dialog/);
  const css = await readFile(new URL('./AdminSeatViewDetailDrawer.css', import.meta.url), 'utf8');
  assert.match(css, /\.admin-seat-view-detail-dialog\[data-testid="admin-seat-view-detail-drawer"\]/);
  assert.match(css, /background-color: #0f172a !important/);
});

test('admin seat-view local errors are wired and cleared only for their current requests', async () => {
  const source = await readFile(new URL('./AdminModerationRuntime.tsx', import.meta.url), 'utf8');
  assert.match(source, /seatViewsError=\{seatViewsError\}/);
  assert.match(source, /seatViewDetailError=\{seatViewDetailError\}/);
  assert.match(source, /if \(errorRequest === seatViewsErrorRequestRef.current\) setSeatViewsError\(null\)/);
  assert.match(source, /if \(errorRequest === seatViewDetailErrorRequestRef.current\) setSeatViewDetailError\(null\)/);
});
