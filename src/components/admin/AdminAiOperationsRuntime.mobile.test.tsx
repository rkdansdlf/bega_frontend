import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { AdminAiOperationsPanelProps } from './AdminAiOperationsPanel';
import AdminAiOperationsRuntime from './AdminAiOperationsRuntime';

const visualQaStateOverride = {
  panelPhase: 'resolved' as const,
  health: null,
  loading: true,
  error: '503 · Coach auto brief 운영 상태를 불러오지 못했습니다.',
  selectedWindow: 'custom' as const,
  startDate: '2026-08-01',
  endDate: '2026-08-31',
  commandCopyState: 'error' as const,
};

test('AI operations runtime owns an announced and contained outer lazy fallback', () => {
  let rendererCalled = false;
  const html = renderToStaticMarkup(createElement(AdminAiOperationsRuntime, {
    visualQaStateOverride: {
      ...visualQaStateOverride,
      panelPhase: 'fallback',
    },
    visualQaPanelRenderer: () => {
      rendererCalled = true;
      return createElement('div');
    },
  }));

  assert.equal(rendererCalled, false);
  assert.match(html, /data-testid="admin-ai-operations-runtime"[^>]+aria-busy="true"[^>]+min-w-0[^>]+overflow-hidden/);
  assert.match(html, /data-testid="admin-ai-operations-runtime-fallback"[^>]+role="status"[^>]+aria-busy="true"/);
  assert.match(html, /overflow-wrap:anywhere/);
});

test('AI operations runtime forwards every owned state into its resolved panel renderer', () => {
  const html = renderToStaticMarkup(createElement(AdminAiOperationsRuntime, {
    visualQaStateOverride,
    visualQaPanelRenderer: (props: AdminAiOperationsPanelProps['autoBriefOpsPanel']) => {
      return createElement(
        'div',
        {
          'data-testid': 'admin-ai-operations-runtime-resolved-probe',
          className: 'min-w-0 [overflow-wrap:anywhere]',
        },
        `${String(props.health)}:${props.loading}:${props.selectedWindow}:${props.startDate}:${props.endDate}:${props.commandCopyState}:${props.error}`,
      );
    },
  }));

  assert.match(html, /data-testid="admin-ai-operations-runtime"[^>]+aria-busy="true"/);
  assert.match(html, /data-testid="admin-ai-operations-runtime-resolved-probe"/);
  assert.match(
    html,
    /null:true:custom:2026-08-01:2026-08-31:error:503 · Coach auto brief 운영 상태를 불러오지 못했습니다\./,
  );
});
