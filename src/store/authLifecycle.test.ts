import assert from 'node:assert/strict';
import test from 'node:test';
import type { GlobalApiErrorDetail } from '../types/error';

const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
  clear: () => values.clear(),
};
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
const { useAuthStore, authStoreApi } = await import('./authStore');
const { getAuthSessionGeneration } = await import('../api/authSessionGeneration');
const { requestAuthReissue } = await import('../api/authReissue');
const { privateGet } = await import('../api/privateClient');
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
const flush = async () => {
  await import('./authLogoutRuntime');
  await new Promise<void>((resolve) => setImmediate(resolve));
};
const json = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json' },
});

const install = () => {
  values.clear();
  const events: GlobalApiErrorDetail[] = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    localStorage: storage, sessionStorage: storage,
    location: { origin: 'http://localhost', hostname: 'localhost', pathname: '/mypage', search: '', hash: '' },
    dispatchEvent: (event: CustomEvent<GlobalApiErrorDetail>) => { events.push(event.detail); return true; },
  } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { cookie: 'XSRF-TOKEN=synthetic-before' } });
  useAuthStore.getState().reset();
  useAuthStore.getState().login('race@example.invalid', 'Race', null, 'ROLE_USER', undefined, 71);
  return events;
};
test.afterEach(() => {
  useAuthStore.getState().reset();
  Reflect.deleteProperty(globalThis, 'window');
  Reflect.deleteProperty(globalThis, 'document');
});

for (const status of [200, 503]) {
  for (const nextUser of [null, 71, 72]) {
    test(`drains reissue before logout ${status}; replacement user ${nextUser}`, async (t) => {
      const events = install();
      const reissue = deferred<Response>();
      const started = deferred<void>();
      let logoutCalls = 0;
      let profileCalls = 0;
      let csrf: string | null = null;
      t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith('/auth/mypage')) { profileCalls++; return json(401); }
        if (url.endsWith('/auth/reissue')) { started.resolve(); return reissue.promise; }
        assert.ok(url.endsWith('/auth/logout'));
        csrf = new Headers(init?.headers).get('X-XSRF-TOKEN');
        return ++logoutCalls === 1 ? json(status, { code: 'LOGOUT_REVOCATION_UNAVAILABLE' }) : json(200);
      });
      const profile = useAuthStore.getState().fetchProfileAndAuthenticate();
      await started.promise;
      const logout = useAuthStore.getState().logout();
      await flush();
      const dispatchedBeforeDrain = logoutCalls;
      if (nextUser !== null) useAuthStore.getState().login('new@example.invalid', 'New', null, 'ROLE_USER', undefined, nextUser);
      const generation = getAuthSessionGeneration();
      document.cookie = 'XSRF-TOKEN=synthetic-after';
      reissue.resolve(json(200));
      assert.equal(await profile, false);
      const result = await logout;
      assert.equal(dispatchedBeforeDrain, 0);
      assert.equal(profileCalls, 1);
      if (nextUser !== null) {
        assert.equal(result, false);
        assert.equal(logoutCalls, 0);
        assert.equal(useAuthStore.getState().user?.id, nextUser);
        assert.equal(getAuthSessionGeneration(), generation);
        assert.equal(events.length, 0);
      } else {
        assert.equal(csrf, 'synthetic-after');
        assert.equal(result, status === 200);
        if (status === 503) {
          assert.equal(getAuthSessionGeneration(), generation);
          assert.equal(events.length, 1);
          await requestAuthReissue();
          await events[0].onRetry?.();
          assert.equal(logoutCalls, 2);
        }
        assert.equal(useAuthStore.getState().user, null);
      }
    });
  }
}

test('logout pending blocks reissue and private replay without expiry events', async (t) => {
  const events = install();
  const logoutResponse = deferred<Response>();
  const started = deferred<void>();
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = String(input); urls.push(url);
    if (url.endsWith('/auth/logout')) { started.resolve(); return logoutResponse.promise; }
    if (url.endsWith('/auth/reissue')) return json(200);
    return json(401);
  });
  const logout = useAuthStore.getState().logout();
  await started.promise;
  const rejection = await privateGet('/protected-diagnostic').catch((error: unknown) => error);
  logoutResponse.resolve(json(200));
  await logout;
  assert.ok(rejection instanceof Error);
  assert.equal(urls.filter((url) => url.endsWith('/auth/reissue')).length, 0);
  assert.equal(urls.filter((url) => url.endsWith('/protected-diagnostic')).length, 1);
  assert.equal(events.length, 0);
});

test('10 second notice keeps physical reissue barrier until settlement', async (t) => {
  const events = install();
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const reissue = deferred<Response>();
  const started = deferred<void>();
  let logoutCalls = 0;
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/auth/reissue')) { started.resolve(); return reissue.promise; }
    assert.ok(url.endsWith('/auth/logout'));
    logoutCalls++; return json(200);
  });
  const refresh = requestAuthReissue().catch((error: unknown) => error);
  await started.promise;
  const logout = useAuthStore.getState().logout();
  await flush();
  t.mock.timers.tick(10_000);
  await flush();
  const beforeDrain = { calls: logoutCalls, user: useAuthStore.getState().user?.id, events: events.length };
  const duplicate = useAuthStore.getState().logout();
  reissue.resolve(json(200));
  await refresh;
  await flush();
  assert.equal(await logout, false);
  assert.equal(await duplicate, false);
  assert.deepEqual(beforeDrain, { calls: 0, user: 71, events: 1 });
  assert.equal(events[0].responseCode, 'AUTH_OPERATION_PENDING');
  assert.equal(logoutCalls, 1);
  assert.equal(useAuthStore.getState().user, null);
});

for (const nextUser of [null, 71, 72]) {
  test(`10 second logout POST deadline preserves physical ownership; replacement ${nextUser}`, { timeout: 5_000 }, async (t) => {
    const events = install();
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const response = deferred<Response>();
    const dispatched = deferred<void>();
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => {
      calls++;
      dispatched.resolve();
      assert.equal(init?.signal, undefined, 'UI deadline must not abort the logout transport');
      return response.promise;
    });
    const logout = useAuthStore.getState().logout();
    await dispatched.promise;
    assert.equal(calls, 1);
    if (nextUser !== null) useAuthStore.getState().login('new@example.invalid', 'New', null, 'ROLE_USER', undefined, nextUser);
    t.mock.timers.tick(10_000);
    assert.equal(await logout, false);
    assert.equal(events.length, nextUser === null ? 1 : 0);
    if (nextUser === null) assert.equal(useAuthStore.getState().logout(), logout);
    response.resolve(json(200));
    await flush();
    assert.equal(useAuthStore.getState().user?.id ?? null, nextUser);
    assert.equal(calls, 1);
  });
}

test('late private 401 after same-user login cannot refresh, replay or expire the new session', async (t) => {
  const events = install();
  const response = deferred<Response>();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return response.promise; });
  const request = privateGet('/protected-diagnostic').catch((error: unknown) => error);
  useAuthStore.getState().login('new@example.invalid', 'New', null, 'ROLE_USER', undefined, 71);
  response.resolve(json(401));
  assert.ok(await request instanceof Error);
  assert.equal(calls, 1);
  assert.equal(events.length, 0);
});

test('known reissue rejection still drains before logout', async (t) => {
  install();
  const response = deferred<Response>();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    if (String(input).endsWith('/auth/reissue')) return response.promise;
    calls++; return json(200);
  });
  const refresh = requestAuthReissue().catch((error: unknown) => error);
  const logout = useAuthStore.getState().logout();
  await flush();
  assert.equal(calls, 0);
  response.resolve(json(401));
  await refresh;
  assert.equal(await logout, true);
  assert.equal(calls, 1);
});

test('new-session refresh waits for older refresh and keeps its own deduplication slot', async (t) => {
  install();
  const first = deferred<Response>();
  const second = deferred<Response>();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => ++calls === 1 ? first.promise : second.promise);
  const a = requestAuthReissue().catch((error: unknown) => error);
  useAuthStore.getState().login('new@example.invalid', 'New', null, 'ROLE_USER', undefined, 72);
  const b = requestAuthReissue();
  await flush();
  assert.equal(calls, 1);
  first.resolve(json(200));
  assert.ok(await a instanceof Error);
  await flush();
  assert.equal(calls, 2);
  const duplicate = requestAuthReissue();
  second.resolve(json(200));
  assert.equal(await b, true);
  assert.equal(await duplicate, true);
  assert.equal(calls, 2);
});

test('new-session refresh waits for older logout physical completion', async (t) => {
  install();
  const response = deferred<Response>();
  let refreshCalls = 0;
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    if (String(input).endsWith('/auth/logout')) return response.promise;
    refreshCalls++; return json(200);
  });
  const logout = useAuthStore.getState().logout();
  await flush();
  useAuthStore.getState().login('new@example.invalid', 'New', null, 'ROLE_USER', undefined, 72);
  const refresh = requestAuthReissue();
  await flush();
  assert.equal(refreshCalls, 0);
  response.resolve(json(200));
  assert.equal(await logout, false);
  assert.equal(await refresh, true);
  assert.equal(refreshCalls, 1);
  assert.equal(useAuthStore.getState().user?.id, 72);
});

test('ownership is rechecked after the lazy logout wrapper yields', async (t) => {
  const events = install();
  let calls = 0;
  const original = authStoreApi.logoutUser;
  t.mock.method(authStoreApi, 'logoutUser', (isCurrent?: () => boolean) => {
    const result = original(isCurrent);
    useAuthStore.getState().login('new@example.invalid', 'New', null, 'ROLE_USER', undefined, 72);
    return result;
  });
  t.mock.method(globalThis, 'fetch', async () => { calls++; return json(200); });
  assert.equal(await useAuthStore.getState().logout(), false);
  assert.equal(calls, 0);
  assert.equal(useAuthStore.getState().user?.id, 72);
  assert.equal(events.length, 0);
});

test('missing CSRF is a recoverable pre-dispatch failure, not unknown transport', async (t) => {
  const events = install();
  document.cookie = '';
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return json(200); });
  assert.equal(await useAuthStore.getState().logout(), false);
  assert.equal(calls, 0);
  assert.equal(useAuthStore.getState().user?.id, 71);
  assert.equal(events[0].responseCode, 'AUTH_REQUEST_NOT_DISPATCHED');
  document.cookie = 'XSRF-TOKEN=synthetic-restored';
  await events[0].onRetry?.();
  assert.equal(calls, 1);
  assert.equal(useAuthStore.getState().user, null);
});

// Last in this isolated worker: unresolved transport deliberately retains its barrier.
test('unknown logout transport preserves user, hint and barrier instead of legacy local cleanup', async (t) => {
  const events = install();
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new TypeError('synthetic offline failure'); });
  const logout = useAuthStore.getState().logout();
  assert.equal(await logout, false);
  assert.equal(await useAuthStore.getState().logout(), false);
  await assert.rejects(requestAuthReissue());
  assert.equal(useAuthStore.getState().user?.id, 71);
  assert.equal(storage.getItem('auth-bootstrap-hint'), '1');
  assert.equal(events.length, 1);
  assert.equal(events[0].responseCode, 'AUTH_OPERATION_PENDING');
  assert.equal(calls, 1);
});
