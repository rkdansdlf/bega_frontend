import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { AdminReport } from '../../types/admin';
import { AdminReportsPanel } from './AdminReportsPanel';

const row: AdminReport = { id: 99701, postId: 99702, reporterId: 99703, postPreview: '합성 신고 문구',
  reporterHandle: 'synthetic-reporter', reason: 'OTHER', description: null, status: 'PENDING',
  adminAction: null, adminMemo: null, handledBy: null, handledAt: null, evidenceUrl: null,
  requestedAction: null, appealStatus: 'REQUESTED', appealReason: null, appealCount: 1, createdAt: '2020-01-01T09:00:00' };
const render = (loading: boolean, error: string | null, rows: AdminReport[] = []) => renderToStaticMarkup(createElement(AdminReportsPanel, {
  reportFilters: { status: 'all', reason: 'all', fromDate: '', toDate: '' },
  reportsLoading: loading, reportsError: error, reports: rows,
  updateReportFilters: () => assert.fail('filter must not execute during render'), resetReportFilters: () => {},
  openReportDetail: () => assert.fail('detail must not execute during render'),
  handleReportAction: () => assert.fail('moderation must not execute during render'),
}));

test('reports: failure has local guidance without healthy empty or a duplicate live alert', () => {
  const html = render(false, '신고 목록 조회 실패');
  assert.match(html, /admin-reports-error/);
  assert.match(html, /신고 목록 조회 실패/);
  assert.match(html, /break-keep px-3 py-6/);
  assert.doesNotMatch(html, /신고 케이스가 없습니다|role="alert"|aria-live/);
});

test('reports: healthy empty keeps the original copy', () => {
  const html = render(false, null);
  assert.match(html, /신고 케이스가 없습니다/);
  assert.doesNotMatch(html, /admin-reports-error/);
});

test('reports: loading announces progress rather than failure or empty', () => {
  const html = render(true, 'old failure');
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /신고 목록 로딩 중/);
  assert.doesNotMatch(html, /신고 케이스가 없습니다|admin-reports-error/);
});

test('reports: cached rows survive a failed refresh', () => {
  const html = render(false, '신고 목록 조회 실패', [row]);
  assert.match(html, /admin-reports-error/);
  assert.match(html, /admin-report-row-99701/);
  assert.doesNotMatch(html, /신고 케이스가 없습니다/);
});

test('reports: local controls have no desktop shrink below the approved target', () => {
  const html = render(false, null, [row]);
  assert.match(html, /min-w-11[^"<>]*sm:min-h-11/);
  assert.doesNotMatch(html, /sm:min-h-8|sm:min-h-9|sm:min-w-8/);
});

test('reports: drawer scopes dark theme and separates failed detail from missing data', async () => {
  const source = await readFile(new URL('./AdminReportDetailDrawer.tsx', import.meta.url), 'utf8');
  assert.match(source, /reportDetailError\?: string \| null/);
  assert.match(source, /data-testid="admin-report-detail-error"/);
  assert.match(source, /reportDetailError \? \([\s\S]*!selectedReportDetail/);
  assert.match(source, /className="max-w-xl dark admin-report-detail-dialog/);
  const css = await readFile(new URL('./AdminReportDetailDrawer.css', import.meta.url), 'utf8');
  assert.match(css, /\.admin-report-detail-dialog\[data-testid="admin-report-detail-drawer"\]/);
  assert.match(css, /background-color: #0f172a !important/);
  assert.match(source, /const actionClassName = '[^'\n]*sm:min-h-11'/);
});

test('reports: runtime clears and passes each local error without changing seat-view state', async () => {
  const source = await readFile(new URL('./AdminModerationRuntime.tsx', import.meta.url), 'utf8');
  assert.match(source, /setReportsError\(null\)/);
  assert.match(source, /setReportDetailError\(null\)/);
  assert.match(source, /reportsError=\{reportsError\}/);
  assert.match(source, /reportDetailError=\{reportDetailError\}/);
  assert.match(source, /if \(errorRequest === reportsErrorRequestRef.current\) setReportsError\(null\)/);
  assert.match(source, /if \(errorRequest === reportDetailErrorRequestRef.current\) setReportDetailError\(null\)/);
});
