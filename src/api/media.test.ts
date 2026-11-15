import assert from 'node:assert/strict';
import test from 'node:test';

import { uploadMediaFile, uploadMediaFiles } from './media';

const buildJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });

const installImageTestDoubles = (t: test.TestContext) => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {},
  });
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: class MockImage {
      naturalWidth = 1024;
      naturalHeight = 768;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  });
  t.mock.method(URL, 'createObjectURL', () => 'blob:mock-media');
  t.mock.method(URL, 'revokeObjectURL', () => {});
  t.after(() => {
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { Image?: unknown }).Image;
  });
};

test('uploadMediaFile는 init, PUT, finalize 순서로 direct upload를 완료한다', async (t) => {
  installImageTestDoubles(t);
  const requestUrls: string[] = [];
  const requestInits: RequestInit[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestUrls.push(requestUrl);
    requestInits.push(init ?? {});

    if (requestUrl.endsWith('/api/media/uploads/init')) {
      return buildJsonResponse({
        success: true,
        data: {
          assetId: 51,
          uploadUrl: 'https://object.example.com/upload/chat-51',
          stagingObjectKey: 'media/staging/chat/1/51-chat.png',
          expiresAt: '2026-04-14T00:00:00Z',
          requiredHeaders: {
            'Content-Type': 'image/png',
          },
        },
      });
    }

    if (requestUrl === 'https://object.example.com/upload/chat-51') {
      return new Response(null, { status: 200 });
    }

    if (requestUrl.endsWith('/api/media/uploads/51/finalize')) {
      return buildJsonResponse({
        success: true,
        data: {
          assetId: 51,
          storagePath: 'media/chat/1/51.webp',
          publicUrl: 'https://cdn.example.com/media/chat/1/51.webp',
        },
      });
    }

    throw new Error(`Unexpected request: ${requestUrl}`);
  });

  const file = new File(['stub'], 'chat.png', { type: 'image/png' });
  const response = await uploadMediaFile('CHAT', file);

  assert.deepEqual(requestUrls, [
    '/api/media/uploads/init',
    'https://object.example.com/upload/chat-51',
    '/api/media/uploads/51/finalize',
  ]);
  assert.equal(requestInits[0]?.method, 'POST');
  assert.equal(requestInits[1]?.method, 'PUT');
  assert.equal(requestInits[2]?.method, 'POST');
  assert.equal(response.storagePath, 'media/chat/1/51.webp');
});

test('uploadMediaFile는 direct upload 실패 시 asset cleanup을 호출한다', async (t) => {
  installImageTestDoubles(t);
  const requestUrls: string[] = [];
  const requestInits: RequestInit[] = [];

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestUrls.push(requestUrl);
    requestInits.push(init ?? {});

    if (requestUrl.endsWith('/api/media/uploads/init')) {
      return buildJsonResponse({
        success: true,
        data: {
          assetId: 77,
          uploadUrl: 'https://object.example.com/upload/diary-77',
          stagingObjectKey: 'media/staging/diary/1/77-photo.jpg',
          expiresAt: '2026-04-14T00:00:00Z',
          requiredHeaders: {
            'Content-Type': 'image/jpeg',
          },
        },
      });
    }

    if (requestUrl === 'https://object.example.com/upload/diary-77') {
      return new Response(null, { status: 500 });
    }

    if (requestUrl.endsWith('/api/media/uploads/77')) {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected request: ${requestUrl}`);
  });

  const file = new File(['stub'], 'photo.jpg', { type: 'image/jpeg' });

  await assert.rejects(
    () => uploadMediaFile('DIARY', file),
    {
      message: '스토리지 업로드 실패 (500)',
    },
  );

  assert.deepEqual(requestUrls, [
    '/api/media/uploads/init',
    'https://object.example.com/upload/diary-77',
    '/api/media/uploads/77',
  ]);
  assert.equal(requestInits[2]?.method, 'DELETE');
});

test('stalled storage upload times out, aborts PUT, and cleans up the asset', async (t) => {
  installImageTestDoubles(t);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(url);
    if (url.endsWith('/api/media/uploads/init')) {
      return buildJsonResponse({ success: true, data: { assetId: 88, uploadUrl: 'https://object.example.com/stalled' } });
    }
    if (url === 'https://object.example.com/stalled') {
      markStarted();
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
      });
    }
    if (url.endsWith('/api/media/uploads/88')) return new Response(null, { status: 204 });
    throw new Error(`Unexpected request: ${url}`);
  });
  const upload = uploadMediaFile('DIARY', new File(['stub'], 'photo.jpg', { type: 'image/jpeg' }));
  await started;
  t.mock.timers.tick(60_000);
  await assert.rejects(upload, { message: '스토리지 업로드 시간이 초과되었습니다.' });
  assert.deepEqual(calls, ['/api/media/uploads/init', 'https://object.example.com/stalled', '/api/media/uploads/88']);
});

test('caller cancellation aborts storage PUT and cleans up without finalizing', async (t) => {
  installImageTestDoubles(t);
  const controller = new AbortController();
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(url);
    if (url.endsWith('/api/media/uploads/init')) {
      return buildJsonResponse({ success: true, data: { assetId: 89, uploadUrl: 'https://object.example.com/cancel' } });
    }
    if (url === 'https://object.example.com/cancel') {
      markStarted();
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
      });
    }
    if (url.endsWith('/api/media/uploads/89')) return new Response(null, { status: 204 });
    throw new Error(`Unexpected request: ${url}`);
  });
  const upload = uploadMediaFile('DIARY', new File(['stub'], 'photo.jpg', { type: 'image/jpeg' }), { signal: controller.signal });
  await started;
  controller.abort();
  await assert.rejects(upload, { message: '업로드가 취소되었습니다.' });
  assert.deepEqual(calls, ['/api/media/uploads/init', 'https://object.example.com/cancel', '/api/media/uploads/89']);
});

test('cleanup failure does not hide the storage upload error', async (t) => {
  installImageTestDoubles(t);
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.endsWith('/api/media/uploads/init')) return buildJsonResponse({ success: true, data: { assetId: 93, uploadUrl: 'https://object.example.com/93' } });
    if (url === 'https://object.example.com/93') return new Response(null, { status: 500 });
    if (url.endsWith('/api/media/uploads/93')) throw new Error('synthetic cleanup failure');
    throw new Error(`Unexpected request: ${url}`);
  });
  await assert.rejects(
    () => uploadMediaFile('DIARY', new File(['stub'], 'photo.jpg', { type: 'image/jpeg' })),
    { message: '스토리지 업로드 실패 (500)' },
  );
});

test('already cancelled upload does not issue any request', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch');
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => uploadMediaFile('DIARY', new File(['stub'], 'photo.jpg', { type: 'image/jpeg' }), { signal: controller.signal }),
    { message: '업로드가 취소되었습니다.' },
  );
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('cancellation during finalize waits for the result and removes the completed asset', async (t) => {
  installImageTestDoubles(t);
  const controller = new AbortController();
  let finishFinalize!: (response: Response) => void;
  let markFinalizeStarted!: () => void;
  const finalizeStarted = new Promise<void>((resolve) => { markFinalizeStarted = resolve; });
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    calls.push(url);
    if (url.endsWith('/api/media/uploads/init')) return buildJsonResponse({ success: true, data: { assetId: 90, uploadUrl: 'https://object.example.com/90' } });
    if (url === 'https://object.example.com/90') return new Response(null, { status: 200 });
    if (url.endsWith('/api/media/uploads/90/finalize')) {
      markFinalizeStarted();
      return new Promise<Response>((resolve) => { finishFinalize = resolve; });
    }
    if (url.endsWith('/api/media/uploads/90')) return new Response(null, { status: 204 });
    throw new Error(`Unexpected request: ${url}`);
  });
  const upload = uploadMediaFile('DIARY', new File(['stub'], 'photo.jpg', { type: 'image/jpeg' }), { signal: controller.signal });
  await finalizeStarted;
  controller.abort();
  finishFinalize(buildJsonResponse({ success: true, data: { assetId: 90, storagePath: 'synthetic' } }));
  await assert.rejects(upload, { message: '업로드가 취소되었습니다.' });
  assert.equal(calls.at(-1), '/api/media/uploads/90');
});

test('batch failure removes a sibling asset that already completed', async (t) => {
  installImageTestDoubles(t);
  let nextId = 90;
  let markFinalized!: () => void;
  const finalized = new Promise<void>((resolve) => { markFinalized = resolve; });
  const deleted: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.endsWith('/api/media/uploads/init')) {
      const id = ++nextId;
      return buildJsonResponse({ success: true, data: { assetId: id, uploadUrl: `https://object.example.com/${id}` } });
    }
    if (url === 'https://object.example.com/91') return new Response(null, { status: 200 });
    if (url === 'https://object.example.com/92') {
      await finalized;
      return new Response(null, { status: 500 });
    }
    if (url.endsWith('/api/media/uploads/91/finalize')) {
      markFinalized();
      return buildJsonResponse({ success: true, data: { assetId: 91, storagePath: 'synthetic' } });
    }
    if (init?.method === 'DELETE' && /\/api\/media\/uploads\/(91|92)$/.test(url)) {
      deleted.push(url);
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  await assert.rejects(() => uploadMediaFiles('DIARY', [
    new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
    new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
  ]), { message: '스토리지 업로드 실패 (500)' });
  assert.deepEqual(deleted.sort(), ['/api/media/uploads/91', '/api/media/uploads/92']);
});

test('cancellation releases a stalled image decode without starting an upload', async (t) => {
  installImageTestDoubles(t);
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: class StalledImage {
      onload = null;
      onerror = null;
      set src(_value: string) { markStarted(); }
    },
  });
  const fetchMock = t.mock.method(globalThis, 'fetch');
  const controller = new AbortController();
  const upload = uploadMediaFile('DIARY', new File(['stub'], 'photo.jpg', { type: 'image/jpeg' }), { signal: controller.signal });
  await started;
  controller.abort();
  await assert.rejects(upload, { message: '업로드가 취소되었습니다.' });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('stalled image decode times out without starting an upload', async (t) => {
  installImageTestDoubles(t);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: class StalledImage {
      onload = null;
      onerror = null;
      set src(_value: string) { markStarted(); }
    },
  });
  const fetchMock = t.mock.method(globalThis, 'fetch');
  const upload = uploadMediaFile('DIARY', new File(['stub'], 'photo.jpg', { type: 'image/jpeg' }));
  await started;
  t.mock.timers.tick(60_000);
  await assert.rejects(upload, { message: '이미지 준비 시간이 초과되었습니다.' });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('preparation timeout cancels stalled compression and revokes its object URL', async (t) => {
  installImageTestDoubles(t);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: class StalledImage {
      onload = null;
      onerror = null;
      set src(_value: string) { markStarted(); }
    },
  });
  let revoked = 0;
  t.mock.method(URL, 'revokeObjectURL', () => { revoked += 1; });
  const fetchMock = t.mock.method(globalThis, 'fetch');
  const file = new File([new Uint8Array(1024 * 1024 + 1)], 'photo.jpg', { type: 'image/jpeg' });
  const upload = uploadMediaFile('DIARY', file);
  await started;
  t.mock.timers.tick(60_000);
  await assert.rejects(upload, { message: '이미지 준비 시간이 초과되었습니다.' });
  assert.equal(revoked, 1);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('preparation timeout stops waiting for stalled canvas encoding', async (t) => {
  installImageTestDoubles(t);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  let encodes = 0;
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => ({
      getContext: () => ({ clearRect() {}, drawImage() {} }),
      toBlob: () => { encodes += 1; markStarted(); },
    }) },
  });
  const fetchMock = t.mock.method(globalThis, 'fetch');
  const file = new File([new Uint8Array(1024 * 1024 + 1)], 'photo.jpg', { type: 'image/jpeg' });
  const upload = uploadMediaFile('DIARY', file);
  await started;
  t.mock.timers.tick(60_000);
  await assert.rejects(upload, { message: '이미지 준비 시간이 초과되었습니다.' });
  assert.equal(encodes, 1);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('batch aborts sibling PUT before waiting for failed asset cleanup', async (t) => {
  installImageTestDoubles(t);
  let nextId = 90;
  let markSiblingStarted!: () => void;
  let markSiblingAborted!: () => void;
  let finishCleanup!: () => void;
  const siblingStarted = new Promise<void>((resolve) => { markSiblingStarted = resolve; });
  const siblingAborted = new Promise<void>((resolve) => { markSiblingAborted = resolve; });
  const cleanup = new Promise<void>((resolve) => { finishCleanup = resolve; });
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.endsWith('/api/media/uploads/init')) {
      const id = ++nextId;
      return buildJsonResponse({ success: true, data: { assetId: id, uploadUrl: `https://object.example.com/${id}` } });
    }
    if (url === 'https://object.example.com/91') {
      await siblingStarted;
      return new Response(null, { status: 500 });
    }
    if (url === 'https://object.example.com/92') {
      markSiblingStarted();
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          markSiblingAborted();
          reject(new DOMException('aborted', 'AbortError'));
        }, { once: true });
      });
    }
    if (url.endsWith('/api/media/uploads/91')) {
      await cleanup;
      return new Response(null, { status: 204 });
    }
    if (url.endsWith('/api/media/uploads/92')) return new Response(null, { status: 204 });
    throw new Error(`Unexpected request: ${url}`);
  });
  const upload = uploadMediaFiles('DIARY', [
    new File(['a'], 'a.jpg', { type: 'image/jpeg' }),
    new File(['b'], 'b.jpg', { type: 'image/jpeg' }),
  ]);
  await siblingAborted;
  finishCleanup();
  await assert.rejects(upload, { message: '스토리지 업로드 실패 (500)' });
});
