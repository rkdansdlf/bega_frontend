import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type {
  AdminClientErrorAlertNotification,
  AdminClientErrorDashboard,
  AdminClientErrorRecentFeedback,
} from '../../types/admin';
import ClientErrorAdminInsightsRuntime from './ClientErrorAdminInsightsRuntime';

const baseFeedback = (
  overrides: Partial<AdminClientErrorRecentFeedback> = {},
): AdminClientErrorRecentFeedback => ({
  eventId: 'MOCK_EVENT_1',
  route: '/MOCK/route',
  actionTaken: 'MOCK_RETRY',
  comment: 'MOCK 피드백',
  occurredAt: '2000-01-01T00:00:00.000Z',
  ...overrides,
});

const baseAlert = (
  overrides: Partial<AdminClientErrorAlertNotification> = {},
): AdminClientErrorAlertNotification => ({
  id: 1,
  fingerprint: 'MOCK_FINGERPRINT',
  bucket: 'api',
  source: 'api',
  channel: 'telegram',
  route: '/MOCK/route',
  statusGroup: '5xx',
  observedCount: 5,
  thresholdCount: 3,
  windowMinutes: 10,
  latestEventId: 'MOCK_EVENT_1',
  latestMessage: 'MOCK 알림',
  latestOccurredAt: '2000-01-01T00:00:00.000Z',
  notifiedAt: '2000-01-01T00:00:00.000Z',
  deliveryStatus: 'SENT',
  failureReason: null,
  ...overrides,
});

const baseDashboard = (
  overrides: Partial<AdminClientErrorDashboard> = {},
): AdminClientErrorDashboard => ({
  from: '2000-01-01T00:00:00.000Z',
  to: '2000-01-02T00:00:00.000Z',
  granularity: 'hour',
  totals: {
    api: 1,
    runtime: 1,
    feedback: 1,
    uniqueFingerprints: 1,
    affectedRoutes: 1,
  },
  timeSeries: [],
  topFingerprints: [],
  recentFeedback: [baseFeedback()],
  recentAlerts: [baseAlert()],
  ...overrides,
});

const renderInsights = (dashboard: AdminClientErrorDashboard | null) => (
  renderToStaticMarkup(createElement(ClientErrorAdminInsightsRuntime, { dashboard }))
);

test('client error insights identifies both sections and announces empty outcomes', () => {
  for (const dashboard of [null, baseDashboard({ recentFeedback: [], recentAlerts: [] })]) {
    const html = renderInsights(dashboard);
    const root = html.match(/<div[^>]*data-testid="admin-client-error-insights"[^>]*>/)?.[0];
    const feedbackSection = html.match(
      /<section[^>]*data-testid="admin-client-error-feedback-section"[^>]*>/,
    )?.[0];
    const alertsSection = html.match(
      /<section[^>]*data-testid="admin-client-error-alerts-section"[^>]*>/,
    )?.[0];

    assert.ok(root);
    assert.match(root, /min-w-0/);
    assert.ok(feedbackSection);
    assert.match(feedbackSection, /aria-labelledby="admin-client-error-feedback-heading"/);
    assert.ok(alertsSection);
    assert.match(alertsSection, /aria-labelledby="admin-client-error-alerts-heading"/);
    assert.match(html, /id="admin-client-error-feedback-heading"/);
    assert.match(html, /id="admin-client-error-alerts-heading"/);
    assert.match(
      html,
      /data-testid="admin-client-error-feedback-empty"[^>]+role="status"[^>]+aria-live="polite"/,
    );
    assert.match(
      html,
      /data-testid="admin-client-error-alerts-empty"[^>]+role="status"[^>]+aria-live="polite"/,
    );
  }
});

test('client error insights contains unbroken content and lets compact header rows wrap', () => {
  const unbroken = `MOCK_${'UNBROKEN'.repeat(50)}`;
  const html = renderInsights(baseDashboard({
    recentFeedback: [baseFeedback({
      eventId: unbroken,
      route: unbroken,
      actionTaken: unbroken,
      comment: unbroken,
    })],
    recentAlerts: [baseAlert({
      fingerprint: unbroken,
      route: unbroken,
      latestMessage: unbroken,
      failureReason: unbroken,
      deliveryStatus: 'FAILED',
    })],
  }));
  const feedbackCard = html.match(
    /<div[^>]*data-testid="admin-client-error-feedback-card"[^>]*>/,
  )?.[0];
  const alertCard = html.match(
    /<div[^>]*data-testid="admin-client-error-alert-card"[^>]*>/,
  )?.[0];
  const feedbackHeader = html.match(
    /<div[^>]*data-testid="admin-client-error-feedback-card-header"[^>]*>/,
  )?.[0];
  const alertHeader = html.match(
    /<div[^>]*data-testid="admin-client-error-alert-card-header"[^>]*>/,
  )?.[0];
  const alertBadges = html.match(
    /<div[^>]*data-testid="admin-client-error-alert-badges"[^>]*>/,
  )?.[0];

  assert.ok(feedbackCard);
  assert.ok(alertCard);
  for (const card of [feedbackCard, alertCard]) {
    assert.match(card, /min-w-0/);
    assert.match(card, /overflow-wrap:anywhere/);
  }
  assert.ok(feedbackHeader);
  assert.match(feedbackHeader, /flex-wrap/);
  assert.match(feedbackHeader, /items-start/);
  assert.ok(alertHeader);
  assert.match(alertHeader, /flex-wrap/);
  assert.match(alertHeader, /items-start/);
  assert.ok(alertBadges);
  assert.match(alertBadges, /min-w-0/);
  assert.match(alertBadges, /max-w-full/);
  assert.match(alertBadges, /flex-wrap/);
  assert.match(html, new RegExp(unbroken));
});

test('client error insights bounds maximum feedback and alert inventories independently', () => {
  const recentFeedback = Array.from({ length: 50 }, (_, index) => baseFeedback({
    eventId: `MOCK_EVENT_${index + 1}`,
    route: `/MOCK/route/${index + 1}`,
    comment: `MOCK 피드백 ${index + 1} ${'모바일시각점검'.repeat(10)}`,
  }));
  const recentAlerts = Array.from({ length: 50 }, (_, index) => baseAlert({
    id: index + 1,
    fingerprint: `MOCK_FINGERPRINT_${index + 1}_${'PRESSURE'.repeat(12)}`,
    bucket: ['api', 'runtime', 'feedback'][index % 3] as AdminClientErrorAlertNotification['bucket'],
    channel: ['telegram', 'slack'][index % 2] as AdminClientErrorAlertNotification['channel'],
    deliveryStatus: ['SENT', 'FAILED'][index % 2] as AdminClientErrorAlertNotification['deliveryStatus'],
  }));
  const html = renderInsights(baseDashboard({ recentFeedback, recentAlerts }));
  const feedbackList = html.match(
    /<div[^>]*data-testid="admin-client-error-feedback-list"[^>]*>/,
  )?.[0];
  const alertsList = html.match(
    /<div[^>]*data-testid="admin-client-error-alerts-list"[^>]*>/,
  )?.[0];

  assert.equal((html.match(/data-testid="admin-client-error-feedback-card"/g) ?? []).length, 50);
  assert.equal((html.match(/data-testid="admin-client-error-alert-card"/g) ?? []).length, 50);
  for (const list of [feedbackList, alertsList]) {
    assert.ok(list);
    assert.match(list, /data-vqa-max-height="480"/);
    assert.match(list, /style="max-height:480px"/);
    assert.match(list, /min-w-0/);
    assert.match(list, /overflow-x-hidden/);
    assert.match(list, /overflow-y-auto/);
  }
});

test('client error insights renders nullable alerts and every visual badge combination', () => {
  const buckets: AdminClientErrorAlertNotification['bucket'][] = ['api', 'runtime', 'feedback'];
  const channels: AdminClientErrorAlertNotification['channel'][] = ['telegram', 'slack'];
  const deliveries: AdminClientErrorAlertNotification['deliveryStatus'][] = ['SENT', 'FAILED'];
  const recentAlerts = buckets.flatMap((bucket) => channels.flatMap((channel) => (
    deliveries.map((deliveryStatus, deliveryIndex) => baseAlert({
      id: buckets.indexOf(bucket) * 4 + channels.indexOf(channel) * 2 + deliveryIndex + 1,
      bucket,
      channel,
      deliveryStatus,
      latestEventId: null,
      latestMessage: null,
      latestOccurredAt: null,
      failureReason: deliveryStatus === 'FAILED' ? 'MOCK_DELIVERY_FAILURE' : null,
    }))
  )));
  const html = renderInsights(baseDashboard({ recentFeedback: [], recentAlerts }));

  assert.equal((html.match(/data-testid="admin-client-error-alert-card"/g) ?? []).length, 12);
  assert.equal((html.match(/>API<\/span>/g) ?? []).length, 4);
  assert.equal((html.match(/>RUNTIME<\/span>/g) ?? []).length, 4);
  assert.equal((html.match(/>FEEDBACK<\/span>/g) ?? []).length, 4);
  assert.equal((html.match(/>TELEGRAM<\/span>/g) ?? []).length, 6);
  assert.equal((html.match(/>SLACK<\/span>/g) ?? []).length, 6);
  assert.equal((html.match(/>SENT<\/span>/g) ?? []).length, 6);
  assert.equal((html.match(/>FAILED<\/span>/g) ?? []).length, 6);
  assert.equal((html.match(/>메시지 없음<\/p>/g) ?? []).length, 12);
  assert.equal((html.match(/failure: MOCK_DELIVERY_FAILURE/g) ?? []).length, 6);
});
