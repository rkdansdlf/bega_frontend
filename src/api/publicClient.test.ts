import assert from 'node:assert/strict';
import test from 'node:test';

import { DEV_PROXY_UPSTREAM_UNAVAILABLE } from './httpClientCore';
import { PublicApiError, publicGet, publicPost } from './publicClient';

test('publicGet appends query params to the public api path', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await publicGet<{ ok: boolean }>('/kbo/offseason/metadata', {
    params: { year: 2025, mode: 'summary' },
  });

  assert.deepEqual(response, { ok: true });
  assert.match(requestUrl, /\/api\/kbo\/offseason\/metadata\?year=2025&mode=summary$/);
  assert.equal(requestInit?.credentials, 'include');
});

test('publicGet preserves caller cancellation instead of converting it to a timeout', async (t) => {
  const controller = new AbortController();
  const abortReason = new DOMException('Request cancelled by caller', 'AbortError');

  t.mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => (
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) {
        reject(new Error('Expected the request to receive a signal'));
        return;
      }
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    })
  ));

  const request = publicGet('/matches/bounds', { signal: controller.signal });
  controller.abort(abortReason);

  await assert.rejects(request, (error: unknown) => {
    assert.equal(error, abortReason);
    return true;
  });
});

test('publicGet preserves an already-aborted caller signal', async (t) => {
  const controller = new AbortController();
  const abortReason = new DOMException('Request was already cancelled', 'AbortError');
  controller.abort(abortReason);

  t.mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => {
    const signal = init?.signal;
    if (!signal?.aborted) {
      throw new Error('Expected the combined signal to be already aborted');
    }
    throw signal.reason;
  });

  await assert.rejects(publicGet('/matches/bounds', { signal: controller.signal }), (error: unknown) => {
    assert.equal(error, abortReason);
    return true;
  });
});

test('publicGet preserves caller cancellation while reading a response body', async (t) => {
  const controller = new AbortController();
  const abortReason = new DOMException('Body read cancelled by caller', 'AbortError');
  let signal: AbortSignal | undefined;
  let markBodyReadStarted: (() => void) | undefined;
  const bodyReadStarted = new Promise<void>((resolve) => {
    markBodyReadStarted = resolve;
  });

  t.mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => {
    signal = init?.signal ?? undefined;
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => new Promise<unknown>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal?.reason), { once: true });
        markBodyReadStarted?.();
      }),
    } as Response;
  });

  const request = publicGet('/matches/bounds', { signal: controller.signal });
  await bodyReadStarted;
  controller.abort(abortReason);

  await assert.rejects(request, (error: unknown) => {
    assert.equal(error, abortReason);
    return true;
  });
});

test('publicGet still reports an internal deadline as a timeout', async (t) => {
  // AbortSignal.timeout() timers are unref'd; with nothing else pending the runner sees an idle
  // event loop and cancels this test (and every later one) before the 25ms deadline fires.
  const keepAlive = setTimeout(() => {}, 1000);
  t.after(() => clearTimeout(keepAlive));
  t.mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => (
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) {
        reject(new Error('Expected the request to receive a signal'));
        return;
      }
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    })
  ));

  await assert.rejects(publicGet('/matches/bounds', { timeoutMs: 25 }), (error: unknown) => {
    assert.equal((error as Error).message, 'Request timed out after 25ms');
    return true;
  });
});

test('publicGet throws a parseable public api error when the server responds with json', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    code: 'OFFSEASON_DOWN',
    message: 'Internal Server Error',
  }), {
    headers: { 'content-type': 'application/json' },
    status: 500,
    statusText: 'Internal Server Error',
  }));

  await assert.rejects(
    publicGet('/kbo/offseason/movements'),
    (error: unknown) => {
      assert.ok(error instanceof PublicApiError);
      assert.equal(error.status, 500);
      assert.equal(error.data?.code, 'OFFSEASON_DOWN');
      assert.equal(error.message, 'Internal Server Error');
      return true;
    },
  );
});

test('publicGet classifies an empty development proxy 500 as upstream unavailable', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('', {
    headers: { 'content-type': 'text/plain' },
    status: 500,
    statusText: 'Internal Server Error',
  }));

  await assert.rejects(
    publicGet('/matches/bounds'),
    (error: unknown) => {
      assert.ok(error instanceof PublicApiError);
      assert.equal(error.status, 500);
      assert.equal(error.data?.code, DEV_PROXY_UPSTREAM_UNAVAILABLE);
      assert.match(error.message, /Development API proxy upstream is unavailable/);
      return true;
    },
  );
});

test('publicPost sends a same-origin json body with credentials', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await publicPost<{ success: boolean }, { token: string }>(
    '/auth/account/deletion/recovery',
    { token: 'recovery-token' },
  );

  assert.deepEqual(response, { success: true });
  assert.match(requestUrl, /\/api\/auth\/account\/deletion\/recovery$/);
  assert.equal(requestInit?.credentials, 'include');
  assert.equal(requestInit?.method, 'POST');
  assert.equal(requestInit?.body, JSON.stringify({ token: 'recovery-token' }));
  assert.deepEqual(requestInit?.headers, {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
});
