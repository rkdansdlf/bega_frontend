import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchCurrentUserProfile, logoutUser } from './auth';
import { PrivateApiError } from './privateClient';

for (const invalidateAt of ['entry', 'profile-401', 'reissue', 'profile-success'] as const) {
  test(`obsolete profile work stops at ${invalidateAt}`, async (t) => {
    let active = invalidateAt !== 'entry';
    const urls: string[] = [];
    t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const url = String(input);
      urls.push(url);
      const isReissue = url.endsWith('/auth/reissue');
      if (isReissue || invalidateAt === 'profile-401' || invalidateAt === 'profile-success') active = false;
      return new Response(JSON.stringify(isReissue ? { success: true } : {
        data: { id: 42, email: 'profile@example.invalid' },
      }), {
        status: isReissue || invalidateAt === 'profile-success' ? 200 : 401,
        headers: { 'content-type': 'application/json' },
      });
    });
    await assert.rejects(fetchCurrentUserProfile({ isCurrentRequest: () => active }), /superseded/);
    assert.equal(urls.length, invalidateAt === 'entry' ? 0 : invalidateAt === 'reissue' ? 2 : 1);
    assert.equal(urls.filter((url) => url.endsWith('/auth/reissue')).length, invalidateAt === 'reissue' ? 1 : 0);
  });
}

test('fetchCurrentUserProfile는 부트스트랩용 인증 예외 플래그를 전달한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return new Response(JSON.stringify({
      data: {
        id: 42,
        email: 'active.user@example.com',
      },
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const profile = await fetchCurrentUserProfile();

  assert.equal(profile.email, 'active.user@example.com');
  assert.match(requestUrl, /\/api\/auth\/mypage$/);
  assert.equal(requestInit?.method, 'GET');
  assert.equal(requestInit?.credentials, 'include');
});

test('fetchCurrentUserProfile는 401이면 silent reissue 후 프로필 조회를 다시 시도한다', async (t) => {
  const urls: string[] = [];
  let profileRequestCount = 0;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    urls.push(url);

    if (url.endsWith('/api/auth/mypage') && profileRequestCount++ === 0) {
      return new Response(JSON.stringify({
        code: 'TOKEN_EXPIRED',
        message: 'Unauthorized',
      }), {
        headers: { 'content-type': 'application/json' },
        status: 401,
      });
    }

    if (url.endsWith('/api/auth/reissue')) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({
      data: {
        id: 42,
        email: 'restored.user@example.com',
        cheerPoints: '17',
      },
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const profile = await fetchCurrentUserProfile();

  assert.equal(profile.email, 'restored.user@example.com');
  assert.equal(profile.cheerPoints, 17);
  assert.equal(urls.filter((url) => url.endsWith('/api/auth/mypage')).length, 2);
  assert.ok(urls.some((url) => url.endsWith('/api/auth/reissue')));
});

test('fetchCurrentUserProfile는 silent reissue가 실패하면 원래 401을 유지한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    if (url.endsWith('/api/auth/reissue')) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        headers: { 'content-type': 'application/json' },
        status: 401,
      });
    }

    return new Response(JSON.stringify({
      code: 'TOKEN_EXPIRED',
      message: 'Unauthorized',
    }), {
      headers: { 'content-type': 'application/json' },
      status: 401,
    });
  });

  await assert.rejects(
    () => fetchCurrentUserProfile(),
    (error: unknown) => {
      assert.ok(error instanceof PrivateApiError);
      assert.equal(error.status, 401);
      return true;
    },
  );
});

test('fetchCurrentUserProfile는 retryOn401=false면 401에서 재시도하지 않는다', async (t) => {
  const urls: string[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    urls.push(url);

    return new Response(JSON.stringify({
      code: 'TOKEN_EXPIRED',
      message: 'Unauthorized',
    }), {
      headers: { 'content-type': 'application/json' },
      status: 401,
    });
  });

  await assert.rejects(
    () => fetchCurrentUserProfile({ retryOn401: false }),
    (error: unknown) => {
      assert.ok(error instanceof PrivateApiError);
      assert.equal(error.status, 401);
      return true;
    },
  );

  assert.equal(urls.filter((url) => url.endsWith('/api/auth/mypage')).length, 1);
  assert.equal(urls.some((url) => url.endsWith('/api/auth/reissue')), false);
});

test('logoutUser는 XSRF-TOKEN 쿠키 값을 logout POST header에 명시한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { cookie: 'theme=dark; XSRF-TOKEN=csrf-token%2Evalue' },
  });
  t.after(() => {
    delete (globalThis as { document?: unknown }).document;
  });

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;
    return new Response(null, { status: 204 });
  });

  await logoutUser();

  assert.match(requestUrl, /\/api\/auth\/logout$/);
  assert.equal(requestInit?.method, 'POST');
  assert.equal(requestInit?.credentials, 'include');
  assert.equal(new Headers(requestInit?.headers).get('X-XSRF-TOKEN'), 'csrf-token.value');
});

test('logoutUser preserves the retryable revocation error contract', async (t) => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { cookie: 'XSRF-TOKEN=synthetic-csrf' },
  });
  t.after(() => { delete (globalThis as { document?: unknown }).document; });
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    success: false,
    code: 'LOGOUT_REVOCATION_UNAVAILABLE',
    message: 'Logout could not be completed. Please retry.',
  }), {
    headers: { 'content-type': 'application/json', 'retry-after': '1' },
    status: 503,
  }));

  await assert.rejects(logoutUser, (error: unknown) => {
    assert.ok(error instanceof PrivateApiError);
    assert.equal(error.status, 503);
    assert.equal(error.data?.code, 'LOGOUT_REVOCATION_UNAVAILABLE');
    return true;
  });
  assert.equal(fetch.mock.callCount(), 1);
});

test('logoutUser는 XSRF-TOKEN 쿠키가 없으면 보호되지 않은 POST를 보내지 않는다', async (t) => {
  let fetchCalls = 0;

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { cookie: 'theme=dark' },
  });
  t.after(() => {
    delete (globalThis as { document?: unknown }).document;
  });
  t.mock.method(globalThis, 'fetch', async () => {
    fetchCalls += 1;
    return new Response(null, { status: 204 });
  });

  await assert.rejects(() => logoutUser(), /CSRF 보호 토큰/);
  assert.equal(fetchCalls, 0);
});
