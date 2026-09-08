import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { AdminAiOperationsPanelVisualQaState } from './AdminAiOperationsPanel';
import AdminAiOperationsPanelRuntime from './AdminAiOperationsPanelRuntime';

const noop = () => undefined;
const pressureCopy = `ADMIN-AI-OPERATIONS-RUNTIME-${'UNBROKEN'.repeat(32)}`;

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

const renderRuntime = (visualQaStateOverride: AdminAiOperationsPanelVisualQaState) =>
  renderToStaticMarkup(createElement(AdminAiOperationsPanelRuntime, {
    autoBriefOpsPanel,
    visualQaStateOverride,
  }));

test('AI operations panel runtime forwards both independent lazy fallback phases', () => {
  const html = renderRuntime({
    autoBriefPhase: 'fallback',
    releaseDecisionPhase: 'fallback',
    copy: '관리자 AI 운영 패널 runtime',
  });

  assert.match(html, /data-testid="admin-ai-operations-panel"[^>]+aria-busy="true"/);
  assert.match(html, /data-testid="admin-ai-operations-auto-brief-fallback"/);
  assert.match(html, /data-testid="admin-ai-operations-release-fallback"/);
});

test('AI operations panel runtime forwards resolved mobile pressure containment', () => {
  const html = renderRuntime({
    autoBriefPhase: 'resolved',
    releaseDecisionPhase: 'resolved',
    copy: pressureCopy,
  });

  assert.match(html, /data-testid="admin-ai-operations-panel"[^>]+min-w-0[^>]+overflow-hidden/);
  assert.match(html, /data-testid="admin-ai-operations-auto-brief-resolved"[^>]+overflow-wrap:anywhere/);
  assert.match(html, /data-testid="admin-ai-operations-release-resolved"[^>]+overflow-wrap:anywhere/);
  assert.equal(html.match(new RegExp(pressureCopy, 'g'))?.length, 2);
});
