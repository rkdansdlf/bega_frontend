import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type {
  AdminCoachAutoBriefOpsHealth,
  AdminCoachAutoBriefOpsWindow,
} from '../../types/admin';
import { AdminCoachAutoBriefOpsPanel } from './AdminCoachAutoBriefOpsPanel';

const noop = () => undefined;

const buildHealth = (overrides: Partial<AdminCoachAutoBriefOpsHealth> = {}): AdminCoachAutoBriefOpsHealth => ({
  window: 'today',
  date_window: '2026-08-28',
  generated_at_utc: '2026-08-28T00:00:00Z',
  runbook_path: 'task/operations/coach-auto-brief-prewarm-runbook.md',
  recommended_command: 'python scripts/mock-coach-auto-brief.py --window today',
  summary: {
    loaded_target_count: 1,
    selected_target_count: 1,
    generated_success_count: 1,
    cache_hit_count: 1,
    in_progress_count: 0,
    failed_count: 0,
    unresolved_count: 0,
    completed_count: 1,
    cache_state_breakdown: {},
    data_quality_breakdown: { grounded: 1 },
  },
  gate: {
    verdict: 'PASS',
    thresholds: {
      max_unresolved: 0,
      max_failed_locked: 0,
      max_pending_wait: 0,
      max_insufficient_ratio: 0.1,
      min_selected_targets: 1,
      fail_on_missing_report: true,
    },
    failed_locked_count: 0,
    pending_wait_count: 0,
    insufficient_count: 0,
    insufficient_ratio: 0,
    checks: { failed: [], warnings: [] },
  },
  unresolved_targets: [],
  latest_report: null,
  ...overrides,
});

interface RenderPanelOptions {
  health?: AdminCoachAutoBriefOpsHealth | null;
  loading?: boolean;
  error?: string | null;
  selectedWindow?: AdminCoachAutoBriefOpsWindow;
  startDate?: string;
  endDate?: string;
  commandCopyState?: 'idle' | 'done' | 'error';
}

const renderPanel = (options: RenderPanelOptions = {}) => {
  const {
    health = buildHealth(),
    loading = false,
    error = null,
    selectedWindow = 'today',
    startDate = '2026-08-28',
    endDate = '2026-08-28',
    commandCopyState = 'idle',
  } = options;

  return renderToStaticMarkup(createElement(AdminCoachAutoBriefOpsPanel, {
    health,
    loading,
    error,
    selectedWindow,
    startDate,
    endDate,
    commandCopyState,
    onWindowChange: noop,
    onStartDateChange: noop,
    onEndDateChange: noop,
    onRefresh: noop,
    onApplyCustomWindow: noop,
    onCopyCommand: noop,
  }));
};

test('coach auto brief ops panel contains loading, error, custom dates, and icon actions on mobile', () => {
  const pressureError = `OPS-ERROR-${'E'.repeat(260)}`;
  const html = renderPanel({
    health: null,
    loading: true,
    error: pressureError,
    selectedWindow: 'custom',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    commandCopyState: 'idle',
  });

  assert.match(html, /data-testid="admin-coach-auto-brief-ops-panel"[^>]+aria-busy="true"/);
  assert.match(html, /data-testid="admin-coach-auto-brief-ops-panel"[^>]+min-w-0[^>]+overflow-hidden/);
  assert.match(html, /data-testid="admin-ai-auto-brief-refresh"[^>]+aria-label="운영 상태 새로고침"/);
  assert.match(html, /for="admin-ai-auto-brief-window"/);
  assert.match(html, /id="admin-ai-auto-brief-window"[^>]+data-testid="admin-ai-auto-brief-window-trigger"/);
  assert.match(html, /data-testid="admin-ai-auto-brief-start-date"[^>]+min-w-0[^>]+w-full/);
  assert.match(html, /data-testid="admin-ai-auto-brief-end-date"[^>]+min-w-0[^>]+w-full/);
  assert.match(html, /data-testid="admin-ai-auto-brief-error"[^>]+role="alert"[^>]+overflow-wrap:anywhere/);
  assert.match(html, new RegExp(pressureError));
});

test('coach auto brief ops panel bounds maximum inventories and unbroken operational copy', () => {
  const token = `OPS-${'X'.repeat(260)}`;
  const unresolvedTargets = Array.from({ length: 50 }, (_, index) => ({
    game_id: `MOCK-GAME-${index + 1}`,
    game_date: '2026-08-28',
    away_team_id: `MOCK-AWAY-${index + 1}`,
    home_team_id: `MOCK-HOME-${index + 1}`,
    stage_label: token,
    game_status_bucket: token,
    cache_key: `${token}-${index + 1}`,
    cache_state: index % 2 === 0 ? 'FAILED_LOCKED' : 'PENDING_WAIT',
    data_quality: index % 3 === 0 ? 'insufficient' : 'partial',
    headline: token,
    reason: token,
  }));
  const health = buildHealth({
    date_window: token,
    runbook_path: token,
    recommended_command: token,
    summary: {
      ...buildHealth().summary,
      loaded_target_count: Number.MAX_SAFE_INTEGER,
      selected_target_count: Number.MAX_SAFE_INTEGER,
      unresolved_count: Number.MAX_SAFE_INTEGER,
    },
    latest_report: {
      path: token,
      unresolved_count: Number.MAX_SAFE_INTEGER,
      completed_count: Number.MAX_SAFE_INTEGER,
      cache_state_breakdown: { FAILED_LOCKED: Number.MAX_SAFE_INTEGER },
      data_quality_breakdown: { insufficient: Number.MAX_SAFE_INTEGER },
    },
    unresolved_targets: unresolvedTargets,
  });
  const html = renderPanel({ health });

  assert.match(html, /data-testid="admin-ai-auto-brief-command-card"[^>]+min-w-0[^>]+overflow-hidden/);
  assert.match(html, /data-testid="admin-ai-auto-brief-command"[^>]+max-w-full[^>]+overflow-hidden[^>]+whitespace-pre-wrap[^>]+break-all/);
  assert.match(html, /data-testid="admin-ai-auto-brief-runbook-row"[^>]+min-w-0[^>]+overflow-hidden/);
  assert.match(html, /data-testid="admin-ai-auto-brief-runbook"[^>]+block[^>]+max-w-full[^>]+break-all/);
  assert.match(html, /data-testid="admin-ai-auto-brief-report-card"[^>]+min-w-0[^>]+overflow-hidden/);
  assert.match(html, /data-testid="admin-ai-auto-brief-report-content"[^>]+min-w-0[^>]+overflow-wrap:anywhere/);
  assert.match(html, /data-testid="admin-ai-auto-brief-unresolved-list"[^>]+max-height:60dvh[^>]+overflow-y-auto/);
  assert.equal((html.match(/data-testid="admin-ai-auto-brief-unresolved-MOCK-GAME-/g) ?? []).length, 50);
  assert.match(html, /data-testid="admin-ai-auto-brief-unresolved-MOCK-GAME-1"[^>]+overflow-wrap:anywhere/);
  assert.match(html, new RegExp(token));
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test('coach auto brief ops panel exposes deterministic gate, report, and copy result states', () => {
  const pass = renderPanel({ commandCopyState: 'done' });
  assert.match(pass, />PASS</);
  assert.match(pass, />복사됨</);
  assert.match(pass, /data-testid="admin-ai-auto-brief-unresolved-empty"/);

  const failed = renderPanel({
    commandCopyState: 'error',
    health: buildHealth({
      gate: {
        ...buildHealth().gate,
        verdict: 'FAIL',
        checks: { failed: ['FAILED_LOCKED 상태가 기준을 초과했습니다.'], warnings: [] },
      },
    }),
  });
  assert.match(failed, />FAIL</);
  assert.match(failed, />복사 실패</);
  assert.match(failed, /FAILED_LOCKED 상태가 기준을 초과했습니다/);
});
