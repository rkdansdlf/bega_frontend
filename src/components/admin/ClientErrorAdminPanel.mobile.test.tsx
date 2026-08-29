import assert from 'node:assert/strict';
import * as moduleApi from 'node:module';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type {
  ClientErrorAdminPanelVisualQaRenderers,
  ClientErrorAdminPanelVisualQaState,
} from './ClientErrorAdminPanel';

type ModuleNextLoad = (url: string, context: unknown) => unknown;
type ModuleLoadHook = (url: string, context: unknown, nextLoad: ModuleNextLoad) => unknown;

const { registerHooks } = moduleApi as unknown as {
  registerHooks: (hooks: { load: ModuleLoadHook }) => void;
};

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('/components/ui/plain-dialog.tsx')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: `
          import { createElement } from 'react';
          export default function PlainDialog({
            open,
            onClose,
            title,
            children,
            className,
            bodyClassName,
            bodyStyle,
            contentTestId,
          }) {
            if (!open) return null;
            globalThis.__clientErrorAdminFallbackClose = onClose;
            return createElement('section', {
              'aria-label': typeof title === 'string' ? title : undefined,
              'aria-modal': 'true',
              'data-testid': contentTestId,
              className,
              role: 'dialog',
            }, [
              createElement('h2', { key: 'title' }, title),
              createElement('button', {
                'aria-label': '닫기',
                key: 'close',
                onClick: onClose,
                type: 'button',
              }, '닫기'),
              createElement('div', { className: bodyClassName, key: 'body', style: bodyStyle }, children),
            ]);
          }
        `,
      };
    }
    return nextLoad(url, context);
  },
});

const { ClientErrorAdminPanel } = await import('./ClientErrorAdminPanel');

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

const longKorean = '모바일 환경에서 긴 오류 설명과 경로 메타데이터가 카드와 표 밖으로 넘치지 않아야 합니다. '.repeat(8);
const unbrokenToken = `CLIENT_ERROR_${'UNBROKEN_TOKEN_'.repeat(30)}`;

const createPressureEvent = (eventId: string, copy: string) => ({
  ...selectedEvent.event,
  eventId,
  message: copy,
  route: `/${copy}`,
  fingerprint: copy,
});

const createPressureDashboard = (copy: string, count = 1) => ({
  ...dashboard,
  topFingerprints: Array.from({ length: count }, (_, index) => ({
    bucket: 'api' as const,
    count: index + 1,
    fingerprint: `${copy}-${index + 1}`,
    latestAlertChannel: null,
    latestAlertSentAt: null,
    latestOccurredAt: '2026-08-29T00:00:00.000Z',
    message: copy,
    route: `/${copy}`,
    source: 'api' as const,
  })),
});

const createPressureState = ({
  copy,
  eventCount = 1,
  fingerprintCount = 1,
  panelError = null,
}: {
  copy: string;
  eventCount?: number;
  fingerprintCount?: number;
  panelError?: string | null;
}): ClientErrorAdminPanelVisualQaState => ({
  ...visualQaState,
  dashboard: createPressureDashboard(copy, fingerprintCount),
  eventsPage: {
    ...visualQaState.eventsPage,
    content: Array.from(
      { length: eventCount },
      (_, index) => createPressureEvent(`event-${index + 1}-${copy}`, copy),
    ),
    totalElements: eventCount,
  },
  panelError,
});

const initialEventPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  size: 20,
  number: 0,
  last: true,
};

const emptyState: ClientErrorAdminPanelVisualQaState = {
  ...visualQaState,
  dashboard: null,
  eventsPage: initialEventPage,
  detailOpen: false,
  detailPhase: 'closed',
};

const assertMobileContract = (html: string) => {
  assert.match(html, /data-testid="admin-client-error-panel"/);
  assert.match(html, /class="[^"]*min-w-0[^"]*"/);
  assert.match(html, /data-testid="admin-client-error-fingerprints"/);
  assert.match(html, /data-vqa-max-height="480"/);
  assert.match(html, /data-testid="admin-client-error-events-scroll"/);
  assert.match(html, /overflow-x-auto/);
  assert.match(html, /overflow-wrap:anywhere/);
  assert.match(html, /aria-label="기간 선택"/);
  assert.match(html, /aria-label="Bucket 필터"/);
  assert.match(html, /aria-label="Source 필터"/);
  assert.match(html, /aria-label="Status 필터"/);
  assert.match(html, /aria-label="Route 필터"/);
  assert.match(html, /aria-label="Fingerprint 필터"/);
  assert.match(html, /aria-label="이벤트 검색"/);
};

test('keeps empty, long Korean, unbroken-token, and maximum fixtures within the parent mobile contract', () => {
  const emptyHtml = renderPanel(emptyState);
  const longKoreanHtml = renderPanel(createPressureState({
    copy: longKorean,
    panelError: longKorean,
  }));
  const unbrokenTokenHtml = renderPanel(createPressureState({ copy: unbrokenToken }));
  const maximumHtml = renderPanel(createPressureState({
    copy: unbrokenToken,
    eventCount: 20,
    fingerprintCount: 50,
  }));

  for (const html of [emptyHtml, longKoreanHtml, unbrokenTokenHtml, maximumHtml]) {
    assertMobileContract(html);
  }

  assert.match(emptyHtml, /role="status"[^>]+aria-live="polite"/);
  assert.match(longKoreanHtml, /role="alert"/);
  assert.match(longKoreanHtml, new RegExp(longKorean));
  assert.match(unbrokenTokenHtml, new RegExp(unbrokenToken));
  assert.equal((maximumHtml.match(/data-testid="admin-client-error-fingerprint-CLIENT_ERROR/g) ?? []).length, 50);
  assert.equal((maximumHtml.match(/data-testid="admin-client-error-detail-/g) ?? []).length, 20);
});

test('uses the project dialog primitive for an announced detail loading fallback', () => {
  const html = renderPanel({
    ...visualQaState,
    detailLoading: true,
    detailPhase: 'suspense-fallback',
  });
  const closeHandler = (globalThis as typeof globalThis & {
    __clientErrorAdminFallbackClose?: () => void;
  }).__clientErrorAdminFallbackClose;
  const dialog = html.match(/<section[^>]+role="dialog"[^>]*>/)?.[0];

  assert.match(html, /data-testid="admin-client-error-detail-fallback"/);
  assert.ok(dialog);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /aria-label="Client Error Detail"/);
  assert.match(html, /<button[^>]+aria-label="닫기"/);
  assert.match(html, /role="status"[^>]+aria-live="polite"[^>]+aria-busy="true"/);
  assert.equal(typeof closeHandler, 'function');
  assert.doesNotThrow(() => closeHandler?.());
});

test('labels every Task 5 interaction target and keeps detail actions touch-sized', () => {
  const html = renderPanel(createPressureState({ copy: unbrokenToken, eventCount: 2 }));
  const detailButtons = html.match(/<button[^>]*data-testid="admin-client-error-detail-[^"]+"[^>]*>/g) ?? [];

  for (const testId of [
    'admin-client-error-refresh',
    'admin-client-error-fingerprint-',
    'admin-client-error-detail-',
    'admin-client-error-previous',
    'admin-client-error-next',
    'admin-client-error-window',
    'admin-client-error-bucket',
    'admin-client-error-source',
    'admin-client-error-status',
    'admin-client-error-route',
    'admin-client-error-fingerprint-input',
    'admin-client-error-search',
    'admin-client-error-filter-tab-path',
  ]) {
    assert.match(html, new RegExp(`data-testid="${testId}`));
  }

  assert.equal(detailButtons.length, 2);
  for (const button of detailButtons) {
    assert.match(button, /aria-label="이벤트 .* 상세 보기"/);
    assert.match(button, /min-h-11/);
  }
});
