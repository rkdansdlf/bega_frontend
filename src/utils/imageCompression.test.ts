import assert from 'node:assert/strict';
import test from 'node:test';

import { compressImage } from './imageCompression';

test('cancelling a stalled compression decode releases its object URL', async (t) => {
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: class StalledImage {
      onload = null;
      onerror = null;
      set src(_value: string) {}
    },
  });
  t.after(() => {
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { Image?: unknown }).Image;
  });
  t.mock.method(URL, 'createObjectURL', () => 'blob:synthetic');
  const revoke = t.mock.method(URL, 'revokeObjectURL', () => {});
  const controller = new AbortController();
  const file = new File([new Uint8Array(1024 * 1024 + 1)], 'synthetic.jpg', { type: 'image/jpeg' });
  const pending = compressImage(file, { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(revoke.mock.callCount(), 1);
  assert.deepEqual(revoke.mock.calls[0]?.arguments, ['blob:synthetic']);
});

test('already cancelled compression never creates an object URL', async (t) => {
  const create = t.mock.method(URL, 'createObjectURL', () => 'blob:synthetic');
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => compressImage(new File(['a'], 'synthetic.jpg', { type: 'image/jpeg' }), { signal: controller.signal }),
    { name: 'AbortError' },
  );
  assert.equal(create.mock.callCount(), 0);
});

test('cancelling pending canvas encoding stops subsequent compression attempts', async (t) => {
  let markEncoding!: () => void;
  const encoding = new Promise<void>((resolve) => { markEncoding = resolve; });
  let finishEncoding!: (blob: Blob) => void;
  let calls = 0;
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => ({
      getContext: () => ({ clearRect() {}, drawImage() {} }),
      toBlob: (callback: (blob: Blob) => void) => { calls += 1; finishEncoding = callback; markEncoding(); },
    }) },
  });
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: class MockImage {
      naturalWidth = 1000;
      naturalHeight = 1000;
      onload: null | (() => void) = null;
      onerror = null;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    },
  });
  t.after(() => {
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { Image?: unknown }).Image;
  });
  t.mock.method(URL, 'createObjectURL', () => 'blob:synthetic');
  t.mock.method(URL, 'revokeObjectURL', () => {});
  const controller = new AbortController();
  const file = new File([new Uint8Array(1024 * 1024 + 1)], 'synthetic.jpg', { type: 'image/jpeg' });
  const pending = compressImage(file, { signal: controller.signal });
  await encoding;
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  finishEncoding(new Blob(['late'], { type: 'image/jpeg' }));
  await Promise.resolve();
  assert.equal(calls, 1);
});

test('cancellation immediately after decode does not return the original image', async (t) => {
  const controller = new AbortController();
  let canvasCreated = false;
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => { canvasCreated = true; return { getContext: () => null }; } },
  });
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: class MockImage {
      naturalWidth = 1000;
      naturalHeight = 1000;
      onload: null | (() => void) = null;
      onerror = null;
      set src(_value: string) { this.onload?.(); controller.abort(); }
    },
  });
  t.after(() => {
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { Image?: unknown }).Image;
  });
  t.mock.method(URL, 'createObjectURL', () => 'blob:synthetic');
  t.mock.method(URL, 'revokeObjectURL', () => {});
  const file = new File([new Uint8Array(1024 * 1024 + 1)], 'synthetic.jpg', { type: 'image/jpeg' });
  await assert.rejects(() => compressImage(file, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(canvasCreated, false);
});

test('successful large PNG compression returns the encoded WebP file', async (t) => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { createElement: () => ({
      getContext: () => ({ clearRect() {}, drawImage() {} }),
      toBlob: (callback: (blob: Blob) => void) => callback(new Blob(['encoded'], { type: 'image/webp' })),
    }) },
  });
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: class MockImage {
      naturalWidth = 1000;
      naturalHeight = 1000;
      onload: null | (() => void) = null;
      onerror = null;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    },
  });
  t.after(() => {
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { Image?: unknown }).Image;
  });
  t.mock.method(URL, 'createObjectURL', () => 'blob:synthetic');
  t.mock.method(URL, 'revokeObjectURL', () => {});
  const file = new File([new Uint8Array(1024 * 1024 + 1)], 'synthetic.png', { type: 'image/png' });
  const result = await compressImage(file);
  assert.equal(result.name, 'synthetic.webp');
  assert.equal(result.type, 'image/webp');
  assert.equal(await result.text(), 'encoded');
});

test('compression failure returns the original without logging the filename or raw exception', async (t) => {
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: class BrokenImage {
      constructor() { throw new Error('synthetic-private-exception'); }
    },
  });
  t.after(() => {
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { Image?: unknown }).Image;
  });
  t.mock.method(URL, 'createObjectURL', () => 'blob:synthetic');
  t.mock.method(URL, 'revokeObjectURL', () => {});
  const log = t.mock.method(console, 'error', () => {});
  const file = new File([new Uint8Array(1024 * 1024 + 1)], 'synthetic-private-filename.jpg', { type: 'image/jpeg' });
  assert.equal(await compressImage(file), file);
  const logged = log.mock.calls.flatMap(call => call.arguments.map(String)).join(' ');
  assert.equal(logged.includes('synthetic-private-filename'), false);
  assert.equal(logged.includes('synthetic-private-exception'), false);
});
