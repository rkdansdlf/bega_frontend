import assert from 'node:assert/strict';
import test from 'node:test';

import {
  notificationApi,
  resetNotificationApiStateForTests,
} from './notificationApi';

test('notificationApi.getNotifications returns empty when the canonical endpoint returns 404', async (t) => {
  resetNotificationApiStateForTests();
  const requestUrls: string[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestUrls.push(url);

    if (url === '/api/notifications/my') {
      return new Response(JSON.stringify({ message: 'Not Found' }), {
        headers: { 'content-type': 'application/json' },
        status: 404,
      });
    }

    throw new Error(`Unexpected url: ${url}`);
  });

  const notifications = await notificationApi.getNotifications();
  const cachedNotifications = await notificationApi.getNotifications();

  assert.deepEqual(notifications, []);
  assert.deepEqual(cachedNotifications, []);
  assert.deepEqual(requestUrls, [
    '/api/notifications/my',
  ]);
});

test('notificationApi.getNotifications retries after a temporary network failure', async (t) => {
  resetNotificationApiStateForTests();
  let requestCount = 0;

  t.mock.method(globalThis, 'fetch', async () => {
    requestCount += 1;
    if (requestCount === 1) {
      throw new TypeError('Failed to fetch');
    }

    return new Response(JSON.stringify([{ id: 1, isRead: false }]), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const firstResult = await notificationApi.getNotifications();
  const recoveredResult = await notificationApi.getNotifications();

  assert.deepEqual(firstResult, []);
  assert.deepEqual(recoveredResult, [{ id: 1, isRead: false }]);
  assert.equal(requestCount, 2);
});

test('notificationApi.getUnreadCount retries after a temporary network failure', async (t) => {
  resetNotificationApiStateForTests();
  let requestCount = 0;

  t.mock.method(globalThis, 'fetch', async () => {
    requestCount += 1;
    if (requestCount === 1) {
      throw new TypeError('Failed to fetch');
    }

    return new Response('3', {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const firstResult = await notificationApi.getUnreadCount();
  const recoveredResult = await notificationApi.getUnreadCount();

  assert.equal(firstResult, 0);
  assert.equal(recoveredResult, 3);
  assert.equal(requestCount, 2);
});

test('notificationApi.getUnreadCount caches auth failure and short-circuits later reads', async (t) => {
  resetNotificationApiStateForTests();
  const requestUrls: string[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestUrls.push(url);

    if (url === '/api/auth/reissue') {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        headers: { 'content-type': 'application/json' },
        status: 401,
      });
    }

    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      headers: { 'content-type': 'application/json' },
      status: 401,
    });
  });

  const firstCount = await notificationApi.getUnreadCount();
  const secondCount = await notificationApi.getUnreadCount();

  assert.equal(firstCount, 0);
  assert.equal(secondCount, 0);
  assert.deepEqual(requestUrls, [
    '/api/notifications/my/unread-count',
    '/api/auth/reissue',
  ]);
});

test('notificationApi markAsRead and deleteNotification use same-origin private fetch endpoints', async (t) => {
  resetNotificationApiStateForTests();
  const requests: Array<{ url: string; method: string | undefined; credentials: RequestCredentials | undefined }> = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requests.push({
      url,
      method: init?.method,
      credentials: init?.credentials,
    });

    return new Response(null, { status: 204 });
  });

  await notificationApi.markAsRead(7);
  await notificationApi.deleteNotification(7);

  assert.deepEqual(requests, [
    { url: '/api/notifications/7/read', method: 'POST', credentials: 'include' },
    { url: '/api/notifications/7', method: 'DELETE', credentials: 'include' },
  ]);
});

test('notificationApi sends the bulk-read click boundary as an ISO timestamp', async (t) => {
  resetNotificationApiStateForTests();
  const requests: Array<{ url: string; method: string | undefined; body: BodyInit | null | undefined }> = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requests.push({ url, method: init?.method, body: init?.body });
    return new Response(null, { status: 200 });
  });

  await notificationApi.markAllAsRead(Date.parse('2026-10-12T02:30:00.123Z'));

  assert.deepEqual(requests, [{
    url: '/api/notifications/mark-all-read',
    method: 'POST',
    body: JSON.stringify({ readThrough: '2026-10-12T02:30:00.123Z' }),
  }]);
});
