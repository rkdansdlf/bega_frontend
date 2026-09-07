import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AdminAiOperationsPanel } from './AdminAiOperationsPanel';
import type { AdminAiOperationsPanelVisualQaState } from './AdminAiOperationsPanel';

const noop = () => undefined;
const pressureCopy = `ADMIN-AI-OPERATIONS-${'UNBROKEN'.repeat(32)}`;

const autoBriefOpsPanel = {
  health: null,
  loading: false,
  error: null,
  selectedWindow: 'today' as const,
  startDate: '2026-08-28',
  endDate: '2026-08-28',
  commandCopyState: 'idle' as const,
  onWindowChange: noop,
  onStartDateChange: noop,
  onEndDateChange: noop,
  onRefresh: noop,
  onApplyCustomWindow: noop,
  onCopyCommand: noop,
};

const renderPanel = (visualQaStateOverride: AdminAiOperationsPanelVisualQaState) =>
  renderToStaticMarkup(createElement(AdminAiOperationsPanel, {
    autoBriefOpsPanel,
    visualQaStateOverride,
  }));

test('AI operations announces and contains both independently pending lazy boundaries', () => {
  const html = renderPanel({
    releaseDecisionPhase: 'fallback',
    autoBriefPhase: 'fallback',
    copy: '관리자 AI 운영 패널',
  });

  assert.match(html, /data-testid="admin-ai-operations-panel"[^>]+aria-busy="true"[^>]+min-w-0[^>]+overflow-hidden/);
  assert.match(html, /data-testid="admin-ai-operations-layout"[^>]+min-w-0[^>]+overflow-hidden/);
  assert.match(html, /data-testid="admin-ai-operations-auto-brief-fallback"[^>]+role="status"[^>]+aria-busy="true"/);
  assert.match(html, /data-testid="admin-ai-operations-release-fallback"[^>]+role="status"[^>]+aria-busy="true"/);
});

test('release fallback keeps a resolved pressure-copy Auto Brief child inside the mobile grid', () => {
  const html = renderPanel({
    releaseDecisionPhase: 'fallback',
    autoBriefPhase: 'resolved',
    copy: pressureCopy,
  });

  assert.match(html, /data-testid="admin-ai-operations-auto-brief-resolved"[^>]+min-w-0[^>]+overflow-wrap:anywhere/);
  assert.match(html, new RegExp(pressureCopy));
  assert.match(html, /data-testid="admin-ai-operations-release-fallback"/);
  assert.doesNotMatch(html, /admin-ai-operations-auto-brief-fallback/);
});

test('resolved release composition preserves either Auto Brief phase without duplicating child state coverage', () => {
  const resolvedHtml = renderPanel({
    releaseDecisionPhase: 'resolved',
    autoBriefPhase: 'resolved',
    copy: pressureCopy,
  });
  const pendingChildHtml = renderPanel({
    releaseDecisionPhase: 'resolved',
    autoBriefPhase: 'fallback',
    copy: '관리자 AI 운영 패널',
  });

  assert.match(resolvedHtml, /data-testid="admin-ai-operations-release-resolved"[^>]+min-w-0[^>]+overflow-wrap:anywhere/);
  assert.match(resolvedHtml, /data-testid="admin-ai-operations-auto-brief-resolved"/);
  assert.match(resolvedHtml, new RegExp(pressureCopy));
  assert.doesNotMatch(resolvedHtml, /admin-ai-operations-release-fallback/);
  assert.match(pendingChildHtml, /data-testid="admin-ai-operations-release-resolved"/);
  assert.match(pendingChildHtml, /data-testid="admin-ai-operations-auto-brief-fallback"/);
});
