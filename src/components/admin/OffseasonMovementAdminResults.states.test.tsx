import assert from 'node:assert/strict';
import * as moduleApi from 'node:module';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { OffseasonMovementAdminResultsRuntimeProps } from './OffseasonMovementAdminResultsRuntime';
import type { OffseasonMovementAdminPanelContentProps } from './OffseasonMovementAdminPanelContent';

type NextLoad = (url: string, context: unknown) => unknown;
const { registerHooks } = moduleApi as unknown as {
  registerHooks: (hooks: { load: (url: string, context: unknown, next: NextLoad) => unknown }) => void;
};
registerHooks({ load(url, context, next) {
  if (/\.(png|webp|css)$/.test(url)) return { format: 'module', shortCircuit: true,
    source: url.endsWith('.css') ? 'export default {};' : 'export default "/synthetic-asset.png";' };
  return next(url, context);
} });
const { default: Results } = await import('./OffseasonMovementAdminResultsRuntime');
const { default: Content } = await import('./OffseasonMovementAdminPanelContent');

const base: OffseasonMovementAdminResultsRuntimeProps = {
  csvReport: null, movements: [], filteredMovements: [], loading: false,
  activeQualityOption: { value: 'ALL', label: '전체', hint: '합성 검증' },
  onOpenEditDialog: () => undefined, onDeleteTargetChange: () => undefined,
};
const render = (props: Partial<OffseasonMovementAdminResultsRuntimeProps> = {}) => renderToStaticMarkup(createElement(Results, { ...base, ...props }));

test('successful empty list keeps existing empty guidance', () => {
  const html = render();
  assert.match(html, /admin-offseason-empty-results/);
  assert.match(html, /조건에 맞는 스토브리그 이동이 없습니다\./);
  assert.doesNotMatch(html, /admin-offseason-results-error/);
});

test('list failure does not masquerade as successful empty', () => {
  const html = render({ listError: '합성 조회 오류' });
  assert.match(html, /admin-offseason-results-error/);
  assert.doesNotMatch(html, /admin-offseason-empty-results/);
});

test('cached successful rows remain available after a list failure', () => {
  const row = { id: 950094, movementDate: '2026-10-25', section: '합성 UI 전용', teamCode: 'SYNTH_TEAM', playerName: '합성 선수' };
  const html = render({ listError: '합성 조회 오류', movements: [row], filteredMovements: [row] });
  assert.match(html, /admin-offseason-row-950094/);
  assert.doesNotMatch(html, /admin-offseason-results-error|admin-offseason-empty-results/);
});

test('loading owns nonshrinking icon and wrapping text', () => {
  const html = render({ loading: true });
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /h-8 w-8 shrink-0 animate-spin/);
  assert.match(html, /flex-col/);
  assert.doesNotMatch(html, /admin-offseason-empty-results/);
});

const contentProps: OffseasonMovementAdminPanelContentProps = {
  successMessage: null, error: null, movements: [], filteredMovements: [], loading: false, importingCsv: false, submitting: false,
  csvReport: null, search: '', sectionFilter: 'ALL', teamFilter: 'ALL', fromDate: '', toDate: '', qualityFilter: 'ALL',
  qualityOptions: [base.activeQualityOption], activeQualityOption: base.activeQualityOption, qualityCounts: { ALL: 0 },
  summaryCount: 0, detailsCount: 0, structuredCount: 0, sourcedCount: 0, dialogOpen: false, editingMovement: null, deleteTarget: null,
  formData: { movementDate: '', section: '기타', teamCode: '', playerName: '', summary: '', details: '', contractTerm: '', contractValue: '',
    optionDetails: '', counterpartyTeam: '', counterpartyDetails: '', sourceLabel: '', sourceUrl: '', announcedAt: '' },
  onSearchChange: () => undefined, onSectionFilterChange: () => undefined, onTeamFilterChange: () => undefined,
  onFromDateChange: () => undefined, onToDateChange: () => undefined, onApplyFilters: () => undefined, onResetFilters: () => undefined,
  onQualityFilterChange: () => undefined, onRefresh: () => undefined, onDownloadCsvTemplate: () => undefined,
  onOpenCsvImport: () => undefined, onOpenCreateDialog: () => undefined, onOpenEditDialog: () => undefined,
  onDeleteTargetChange: () => undefined, onDialogClose: () => undefined, onUpdateField: () => undefined,
  onSubmit: () => undefined, onDelete: () => undefined,
  visualQaStateOverride: { resultsPhase: 'resolved', dialogsPhase: 'fallback' },
  visualQaRenderers: { results: (props) => createElement(Results, props), dialogs: () => assert.fail('no dialog expected') },
};

test('a save error does not turn a successful empty list into a list failure', () => {
  const html = renderToStaticMarkup(createElement(Content, { ...contentProps, error: '합성 저장 오류', listError: null }));
  assert.match(html, /합성 저장 오류/);
  assert.match(html, /admin-offseason-empty-results/);
  assert.doesNotMatch(html, /admin-offseason-results-error/);
});

test('content forwards a query error separately to the results renderer', () => {
  const html = renderToStaticMarkup(createElement(Content, { ...contentProps, error: '합성 조회 오류', listError: '합성 조회 오류' }));
  assert.match(html, /admin-offseason-results-error/);
  assert.doesNotMatch(html, /admin-offseason-empty-results/);
});
