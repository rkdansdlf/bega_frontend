import assert from 'node:assert/strict';
import test from 'node:test';
import { markAuthSessionEstablished } from '../api/authSessionGeneration';

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

test('notificationApi.getNotifications retries after a temporary network failure without requiring a server clock', async (t) => {
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

test('notificationApi.getNotifications accepts a valid snapshot without a server time header', async (t) => {
  resetNotificationApiStateForTests();
  t.mock.method(globalThis, 'fetch', async () => new Response('[{"id":2,"isRead":false}]', {
    headers: { 'content-type': 'application/json' },
    status: 200,
  }));

  const result = await notificationApi.getNotifications();

  assert.deepEqual(result, [{ id: 2, isRead: false }]);
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

test('a new session can fetch notifications after the previous session saw 404', async (t) => {
  resetNotificationApiStateForTests();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls += 1;
    return calls === 1
      ? new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } })
      : new Response('[{"id":2,"isRead":false}]', { status: 200, headers: { 'content-type': 'application/json' } });
  });
  assert.deepEqual(await notificationApi.getNotifications(), []);
  markAuthSessionEstablished();
  assert.deepEqual(await notificationApi.getNotifications(), [{ id: 2, isRead: false }]);
  assert.equal(calls, 2);
});

test('a new session can fetch unread counts after a previous authentication failure', async (t) => {
  resetNotificationApiStateForTests();
  let authenticated = false;
  let countRequests = 0;
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url === '/api/notifications/my/unread-count') countRequests += 1;
    return authenticated
      ? new Response('4', { status: 200, headers: { 'content-type': 'application/json' } })
      : new Response('{}', { status: 401, headers: { 'content-type': 'application/json' } });
  });
  assert.equal(await notificationApi.getUnreadCount(), 0);
  authenticated = true;
  markAuthSessionEstablished();
  assert.equal(await notificationApi.getUnreadCount(), 4);
  assert.equal(countRequests, 2);
});

test('an old session delayed 404 cannot disable notifications for the new session', async (t) => {
  resetNotificationApiStateForTests();
  let finish!: (response: Response) => void;
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls += 1;
    return calls === 1
      ? new Promise<Response>((resolve) => { finish = resolve; })
      : new Response('[{"id":2,"isRead":false}]', { status: 200, headers: { 'content-type': 'application/json' } });
  });
  const oldRequest = notificationApi.getNotifications();
  markAuthSessionEstablished();
  assert.deepEqual(await notificationApi.getNotifications(), [{ id: 2, isRead: false }]);
  finish(new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } }));
  await oldRequest;
  assert.deepEqual(await notificationApi.getNotifications(), [{ id: 2, isRead: false }]);
  assert.equal(calls, 3);
});

test('an old unread-count failure does not start a fallback request in the new session', async (t) => {
  resetNotificationApiStateForTests();
  let finish!: (response: Response) => void;
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    urls.push(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url);
    return urls.length === 1
      ? new Promise<Response>((resolve) => { finish = resolve; })
      : new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  });
  const oldRequest = notificationApi.getUnreadCount();
  markAuthSessionEstablished();
  finish(new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } }));
  assert.equal(await oldRequest, 0);
  assert.deepEqual(urls, ['/api/notifications/my/unread-count']);
});

test('a delayed old-session 401 does not reissue or suppress the new session', async (t) => {
  resetNotificationApiStateForTests();
  let finish!: (response: Response) => void;
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    urls.push(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url);
    return urls.length === 1
      ? new Promise<Response>((resolve) => { finish = resolve; })
      : new Response('[{"id":2,"isRead":false}]', { status: 200, headers: { 'content-type': 'application/json' } });
  });
  const old = notificationApi.getNotifications();
  markAuthSessionEstablished();
  finish(new Response('{}', { status: 401, headers: { 'content-type': 'application/json' } }));
  await old;
  assert.deepEqual(await notificationApi.getNotifications(), [{ id: 2, isRead: false }]);
  assert.deepEqual(urls, ['/api/notifications/my', '/api/notifications/my']);
});

test('count endpoint 404 falls back to list and counts unread entries', async (t) => {
  resetNotificationApiStateForTests();
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    urls.push(url);
    return url.endsWith('/unread-count')
      ? new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } })
      : new Response('[{"id":1,"isRead":true},{"id":2,"isRead":false}]', { status: 200, headers: { 'content-type': 'application/json' } });
  });
  assert.equal(await notificationApi.getUnreadCount(), 1);
  assert.equal(await notificationApi.getUnreadCount(), 1);
  assert.deepEqual(urls, ['/api/notifications/my/unread-count', '/api/notifications/my', '/api/notifications/my']);
});

test('a delayed fallback list cannot return an old count after the session changes', async (t) => {
  resetNotificationApiStateForTests();
  let finish!: (response: Response) => void;
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.endsWith('/unread-count')) return new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } });
    return new Promise<Response>((resolve) => { finish = resolve; });
  });
  const pending = notificationApi.getUnreadCount();
  while (!finish) await new Promise((resolve) => setTimeout(resolve, 0));
  markAuthSessionEstablished();
  finish(new Response('[{"id":1,"isRead":false}]', { status: 200, headers: { 'content-type': 'application/json' } }));
  assert.equal(await pending, 0);
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

test('notificationApi returns the IDs confirmed by the bulk-read endpoint', async (t) => {
  resetNotificationApiStateForTests();
  const requests: Array<{ url: string; method: string | undefined; body: BodyInit | null | undefined }> = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requests.push({ url, method: init?.method, body: init?.body });
    return new Response(JSON.stringify({ notificationIds: [7, 9] }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const result = await notificationApi.markAllAsRead([7, 9]);

  assert.deepEqual(result, { notificationIds: [7, 9] });
  assert.deepEqual(requests, [{
    url: '/api/notifications/mark-all-read',
    method: 'POST',
    body: JSON.stringify({ notificationIds: [7, 9] }),
  }]);
});
