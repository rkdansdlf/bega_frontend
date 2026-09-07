import assert from 'node:assert/strict';
import * as moduleApi from 'node:module';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type {
  AdminClientErrorEventDetail,
  AdminClientErrorEventSummary,
} from '../../types/admin';

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
            title,
            description,
            children,
            className,
            bodyClassName,
            bodyStyle,
            contentTestId,
          }) {
            if (!open) return null;
            return createElement('section', {
              'aria-label': typeof title === 'string' ? title : undefined,
              'data-testid': contentTestId,
              className,
              role: 'dialog',
            }, [
              createElement('header', { key: 'header' }, title, description),
              createElement('div', { className: bodyClassName, key: 'body', style: bodyStyle }, children),
            ]);
          }
        `,
      };
    }
    return nextLoad(url, context);
  },
});

const baseEvent = (overrides: Partial<AdminClientErrorEventSummary> = {}): AdminClientErrorEventSummary => ({
  eventId: 'MOCK_EVENT_1',
  bucket: 'api',
  source: 'api',
  message: 'MOCK 클라이언트 오류',
  statusCode: 500,
  statusGroup: '5xx',
  responseCode: 'MOCK_ERROR',
  route: '/MOCK/route',
  normalizedRoute: '/MOCK/route',
  method: 'GET',
  endpoint: '/api/MOCK',
  normalizedEndpoint: '/api/MOCK',
  fingerprint: 'MOCK_FINGERPRINT',
  occurredAt: '2026-08-29T00:00:00.000Z',
  sessionId: 'MOCK_SESSION',
  userId: 7,
  feedbackCount: 1,
  ...overrides,
});

const baseDetail = (
  overrides: Partial<AdminClientErrorEventDetail> = {},
): AdminClientErrorEventDetail => ({
  event: baseEvent(),
  stack: 'Error: MOCK stack\n    at MOCK component',
  componentStack: 'at MOCKComponent\n    at MOCKBoundary',
  feedback: [{
    eventId: 'MOCK_EVENT_1',
    route: '/MOCK/route',
    actionTaken: 'MOCK_RETRY',
    comment: 'MOCK 피드백',
    occurredAt: '2026-08-29T00:01:00.000Z',
  }],
  sameFingerprintRecentEvents: [baseEvent({
    eventId: 'MOCK_RECENT_1',
    message: 'MOCK 최근 이벤트',
  })],
  ...overrides,
});

const renderDetail = async ({
  detailLoading = false,
  selectedEvent = baseDetail(),
}: {
  detailLoading?: boolean;
  selectedEvent?: AdminClientErrorEventDetail | null;
} = {}) => {
  const { default: ClientErrorAdminDetailRuntime } = await import(
    './ClientErrorAdminDetailRuntime'
  );
  return renderToStaticMarkup(createElement(ClientErrorAdminDetailRuntime, {
    open: true,
    detailLoading,
    selectedEvent,
    onClose: () => undefined,
    onOpenDetail: () => undefined,
  }));
};

test('client error detail announces loading and missing outcomes inside an identified dialog', async () => {
  const loadingHtml = await renderDetail({ detailLoading: true, selectedEvent: null });
  const missingHtml = await renderDetail({ selectedEvent: null });

  assert.match(loadingHtml, /data-testid="admin-client-error-detail"/);
  assert.match(
    loadingHtml,
    /data-testid="admin-client-error-detail-loading"[^>]+role="status"[^>]+aria-live="polite"[^>]+aria-busy="true"/,
  );
  assert.match(
    missingHtml,
    /data-testid="admin-client-error-detail-missing"[^>]+role="alert"[^>]+aria-live="polite"/,
  );
  assert.match(loadingHtml, /style="max-height:calc\(85dvh - 5\.5rem\)"/);
  assert.match(loadingHtml, /overflow-x-hidden/);
});

test('client error detail contains unbroken metadata and preserves nullable values', async () => {
  const unbroken = `MOCK_${'UNBROKEN'.repeat(40)}`;
  const html = await renderDetail({
    selectedEvent: baseDetail({
      event: baseEvent({
        eventId: unbroken,
        message: unbroken,
        route: unbroken,
        endpoint: null,
        fingerprint: unbroken,
        statusCode: null,
        responseCode: null,
        method: null,
        normalizedEndpoint: null,
        sessionId: null,
        userId: null,
      }),
      stack: null,
      componentStack: null,
    }),
  });

  const metadata = html.match(/<div[^>]*data-testid="admin-client-error-detail-metadata"[^>]*>/)?.[0];

  assert.ok(metadata);
  assert.match(metadata, /min-w-0/);
  assert.match(metadata, /overflow-wrap:anywhere/);
  assert.match(html, new RegExp(unbroken));
  assert.match(html, /endpoint: -/);
  assert.match(html, /No stack trace/);
  assert.match(html, /No component stack/);
});

test('client error detail gives both stack panes bounded internal scrolling', async () => {
  const stack = `Error: MOCK\n${'STACK_FRAME_WITHOUT_BREAKS'.repeat(80)}`;
  const componentStack = `at MOCKComponent\n${'COMPONENT_STACK_WITHOUT_BREAKS'.repeat(80)}`;
  const html = await renderDetail({
    selectedEvent: baseDetail({ stack, componentStack }),
  });
  const stackPane = html.match(/<pre[^>]*data-testid="admin-client-error-stack"[^>]*>/)?.[0];
  const componentStackPane = html.match(
    /<pre[^>]*data-testid="admin-client-error-component-stack"[^>]*>/,
  )?.[0];

  assert.ok(stackPane);
  assert.ok(componentStackPane);
  for (const pane of [stackPane, componentStackPane]) {
    assert.match(pane, /w-full/);
    assert.match(pane, /min-w-0/);
    assert.match(pane, /max-w-full/);
    assert.match(pane, /overflow-auto/);
    assert.match(pane, /data-vqa-max-height="280"/);
  }
  assert.match(html, /STACK_FRAME_WITHOUT_BREAKS/);
  assert.match(html, /COMPONENT_STACK_WITHOUT_BREAKS/);
});

test('client error detail keeps maximum feedback and recent-event actions mobile safe', async () => {
  const feedback = Array.from({ length: 50 }, (_, index) => ({
    eventId: `MOCK_EVENT_${index + 1}`,
    route: `/MOCK/route/${index + 1}`,
    actionTaken: `MOCK_ACTION_${index + 1}_${'PRESSURE'.repeat(12)}`,
    comment: `MOCK 피드백 ${index + 1} ${'모바일시각점검'.repeat(12)}`,
    occurredAt: '2026-08-29T00:01:00.000Z',
  }));
  const recent = Array.from({ length: 50 }, (_, index) => baseEvent({
    eventId: `MOCK_RECENT_${index + 1}`,
    source: ['api', 'runtime', 'unhandled_rejection', 'unknown'][index % 4] as (
      AdminClientErrorEventSummary['source']
    ),
    message: `MOCK 최근 이벤트 ${index + 1} ${'UNBROKEN'.repeat(20)}`,
  }));
  const html = await renderDetail({
    selectedEvent: baseDetail({ feedback, sameFingerprintRecentEvents: recent }),
  });
  const recentButtons = html.match(
    /<button[^>]*data-testid="admin-client-error-recent-[^"]+"[^>]*>/g,
  ) ?? [];

  assert.equal((html.match(/data-testid="admin-client-error-feedback-item"/g) ?? []).length, 50);
  assert.equal(recentButtons.length, 50);
  for (const button of recentButtons) {
    assert.match(button, /min-h-11/);
    assert.match(button, /min-w-0/);
    assert.match(button, /data-vqa-min-touch="44"/);
    assert.match(button, /aria-label="최근 오류 이벤트 .* 상세 보기"/);
    assert.match(button, /focus-visible:ring-2/);
    assert.match(button, /active:scale-\[0\.98\]/);
  }
  assert.match(html, /overflow-wrap:anywhere/);
});
