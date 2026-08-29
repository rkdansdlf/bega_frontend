import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  ClientErrorAdminPanel,
  type ClientErrorAdminPanelVisualQaRenderers,
  type ClientErrorAdminPanelVisualQaState,
} from './ClientErrorAdminPanel';

const dashboard = {
  from: '2026-08-29T00:00:00.000Z',
  to: '2026-08-29T01:00:00.000Z',
  granularity: 'hour' as const,
  totals: {
    api: 2,
    runtime: 3,
    feedback: 1,
    uniqueFingerprints: 4,
    affectedRoutes: 5,
  },
  timeSeries: [{ bucketStart: '2026-08-29T00:00:00.000Z', api: 2, runtime: 3, feedback: 1 }],
  topFingerprints: [],
  recentFeedback: [],
  recentAlerts: [],
};

const selectedEvent = {
  event: {
    eventId: 'event-42',
    bucket: 'runtime' as const,
    source: 'runtime' as const,
    message: 'Client error',
    statusCode: null,
    statusGroup: 'none',
    responseCode: null,
    route: '/admin',
    normalizedRoute: '/admin',
    method: null,
    endpoint: null,
    normalizedEndpoint: null,
    fingerprint: 'fingerprint-42',
    occurredAt: '2026-08-29T00:00:00.000Z',
    sessionId: null,
    userId: null,
    feedbackCount: 0,
  },
  stack: null,
  componentStack: null,
  feedback: [],
  sameFingerprintRecentEvents: [],
};

const visualQaState: ClientErrorAdminPanelVisualQaState = {
  active: true,
  windowKey: '24h',
  filters: {
    bucket: 'all',
    source: 'all',
    statusGroup: 'all',
    route: '',
    fingerprint: '',
    search: '',
  },
  dashboard,
  eventsPage: {
    content: [selectedEvent.event],
    totalElements: 1,
    totalPages: 1,
    size: 20,
    number: 0,
    last: true,
  },
  currentPage: 0,
  loadingDashboard: false,
  loadingEvents: false,
  panelError: null,
  detailOpen: true,
  detailLoading: false,
  selectedEvent,
  chartPhase: 'resolved',
  insightsPhase: 'resolved',
  detailPhase: 'resolved',
};

const renderers: ClientErrorAdminPanelVisualQaRenderers = {
  chart: (props) => createElement('div', {
    'data-chart-count': props.chartData.length,
    'data-testid': 'client-error-chart-probe',
  }),
  detail: (props) => createElement('div', {
    'data-detail-loading': props.detailLoading,
    'data-detail-open': props.open,
    'data-detail-selected': props.selectedEvent?.event.eventId ?? 'none',
    'data-testid': 'client-error-detail-probe',
  }),
  insights: (props) => createElement('div', {
    'data-dashboard': props.dashboard ? 'present' : 'null',
    'data-testid': 'client-error-insights-probe',
  }),
};

const renderPanel = (
  override: ClientErrorAdminPanelVisualQaState = visualQaState,
  probes: ClientErrorAdminPanelVisualQaRenderers | undefined = renderers,
) => renderToStaticMarkup(createElement(ClientErrorAdminPanel, {
  active: override.active,
  visualQaStateOverride: override,
  visualQaRenderers: probes,
}));

test('binds resolved visual QA phases to the exact lazy child props', () => {
  const html = renderPanel();

  assert.match(html, /data-testid="client-error-chart-probe"/);
  assert.match(html, /data-chart-count="1"/);
  assert.match(html, /data-testid="client-error-insights-probe"/);
  assert.match(html, /data-dashboard="present"/);
  assert.match(html, /data-testid="client-error-detail-probe"/);
  assert.match(html, /data-detail-loading="false"/);
  assert.match(html, /data-detail-open="true"/);
  assert.match(html, /data-detail-selected="event-42"/);
});

test('renders the chart fallback deterministically', () => {
  const html = renderPanel({ ...visualQaState, chartPhase: 'fallback' });

  assert.match(html, /data-testid="admin-client-error-chart-fallback"/);
  assert.doesNotMatch(html, /data-testid="client-error-chart-probe"/);
});

test('renders distinct deterministic insights fallbacks', () => {
  const deferredHtml = renderPanel({ ...visualQaState, insightsPhase: 'deferred-fallback' });
  const suspenseHtml = renderPanel({ ...visualQaState, insightsPhase: 'suspense-fallback' });

  assert.match(deferredHtml, /data-testid="admin-client-error-insights-skeleton-full"/);
  assert.doesNotMatch(deferredHtml, /data-testid="client-error-insights-probe"/);
  assert.match(suspenseHtml, /data-testid="admin-client-error-insights-skeleton-compact"/);
  assert.doesNotMatch(suspenseHtml, /data-testid="client-error-insights-probe"/);
});

test('renders the detail suspense fallback only while the detail is open', () => {
  const fallbackHtml = renderPanel({ ...visualQaState, detailPhase: 'suspense-fallback' });
  const closedHtml = renderPanel({
    ...visualQaState,
    detailOpen: false,
    selectedEvent: null,
    detailPhase: 'closed',
  });

  assert.match(fallbackHtml, /data-testid="admin-client-error-detail-fallback"/);
  assert.doesNotMatch(fallbackHtml, /data-testid="client-error-detail-probe"/);
  assert.doesNotMatch(closedHtml, /data-testid="admin-client-error-detail-fallback"/);
  assert.doesNotMatch(closedHtml, /data-testid="client-error-detail-probe"/);
});

test('fails closed for invalid visual QA lazy phases and missing renderers', () => {
  assert.throws(
    () => renderPanel({ ...visualQaState, chartPhase: 'unexpected' as never }),
    /ClientErrorAdminPanel Visual QA chart phase is invalid\./,
  );
  assert.throws(
    () => renderPanel({ ...visualQaState, insightsPhase: 'unexpected' as never }),
    /ClientErrorAdminPanel Visual QA insights phase is invalid\./,
  );
  assert.throws(
    () => renderPanel({ ...visualQaState, detailPhase: 'unexpected' as never }),
    /ClientErrorAdminPanel Visual QA detail phase is invalid\./,
  );
  assert.throws(
    () => renderPanel(visualQaState, { ...renderers, chart: undefined }),
    /ClientErrorAdminPanel Visual QA resolved chart renderer is required\./,
  );
  assert.throws(
    () => renderPanel({ ...visualQaState, detailOpen: false, detailPhase: 'resolved' }),
    /ClientErrorAdminPanel Visual QA detail phase requires an open detail\./,
  );
  assert.throws(
    () => renderPanel({ ...visualQaState, detailOpen: false, detailPhase: 'suspense-fallback' }),
    /ClientErrorAdminPanel Visual QA detail phase requires an open detail\./,
  );
  assert.throws(
    () => renderPanel({ ...visualQaState, detailPhase: 'closed' }),
    /ClientErrorAdminPanel Visual QA closed detail phase must not be open\./,
  );
  assert.throws(
    () => renderPanel(visualQaState, { ...renderers, insights: undefined }),
    /ClientErrorAdminPanel Visual QA resolved insights renderer is required\./,
  );
});
