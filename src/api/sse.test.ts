import assert from 'node:assert/strict';
import test from 'node:test';

import { consumeSseStream } from './sse';
import { isStreamAbortError, isStreamReadTimeoutError } from './stream';

test('consumeSseStream returns immediately after DONE without waiting for EOF', async () => {
  let cancelled = false;
  let delivered = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (delivered) {
        return new Promise(() => undefined);
      }
      delivered = true;
      controller.enqueue(new TextEncoder().encode(
        'event: message\ndata: {"delta":"완료"}\n\nevent: done\ndata: [DONE]\n\n',
      ));
    },
    cancel() {
      cancelled = true;
    },
  });

  const events: string[] = [];
  const result = await consumeSseStream(body, {
    timeoutMs: 50,
    acceptDoneSentinel: true,
    onEvent: ({ data }) => {
      events.push(data);
    },
  });

  assert.equal(result.sawDone, true);
  assert.equal(cancelled, true);
  assert.deepEqual(events, ['{"delta":"완료"}']);
});

test('consumeSseStream accepts a typed v2 terminal predicate without waiting for EOF', async () => {
  let cancelled = false;
  let delivered = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (delivered) return new Promise(() => undefined);
      delivered = true;
      controller.enqueue(new TextEncoder().encode(
        'event: chat.message.delta\n'
        + 'data: {"version":2,"type":"chat.message.delta","data":{"delta":"완료"}}\n\n'
        + 'event: stream.done\n'
        + 'data: {"version":2,"type":"stream.done","data":{"reason":"completed"}}\n\n',
      ));
    },
    cancel() {
      cancelled = true;
    },
  });

  const events: string[] = [];
  const result = await consumeSseStream(body, {
    timeoutMs: 50,
    acceptDoneSentinel: false,
    onEvent: ({ data }) => {
      events.push(data);
    },
    isTerminalEvent: ({ event }) => event === 'stream.done',
  });

  assert.equal(result.sawDone, true);
  assert.equal(cancelled, true);
  assert.equal(events.length, 2);
});

test('consumeSseStream does not accept the legacy DONE sentinel when disabled', async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('event: done\ndata: [DONE]\n\n'));
      controller.close();
    },
  });
  const events: string[] = [];

  const result = await consumeSseStream(body, {
    timeoutMs: 50,
    acceptDoneSentinel: false,
    onEvent: ({ data }) => {
      events.push(data);
    },
  });

  assert.equal(result.sawDone, false);
  assert.deepEqual(events, ['[DONE]']);
});

const waitingBody = (onCancel: () => void) => new ReadableStream<Uint8Array>({
  pull() {
    return new Promise(() => undefined);
  },
  cancel() {
    onCancel();
  },
});

test('consumeSseStream stops promptly and cancels the body when the caller aborts while waiting', async () => {
  let cancelled = false;
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 20);

  const startedAt = Date.now();
  await assert.rejects(
    consumeSseStream(waitingBody(() => { cancelled = true; }), {
      timeoutMs: 5000,
      acceptDoneSentinel: true,
      signal: controller.signal,
      onEvent: () => undefined,
    }),
    (error: unknown) => isStreamAbortError(error),
  );

  assert.ok(Date.now() - startedAt < 2000, 'abort should not wait for the read timeout');
  assert.equal(cancelled, true);
});

test('consumeSseStream cancels the body when a read times out', async () => {
  let cancelled = false;

  await assert.rejects(
    consumeSseStream(waitingBody(() => { cancelled = true; }), {
      timeoutMs: 30,
      acceptDoneSentinel: true,
      onEvent: () => undefined,
    }),
    (error: unknown) => isStreamReadTimeoutError(error),
  );

  assert.equal(cancelled, true);
});
