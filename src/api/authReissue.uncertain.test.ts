import test from 'node:test';
import assert from 'node:assert/strict';
import { requestAuthReissue, waitForAuthReissue } from './authReissue';
import { AuthOperationSupersededError, markAuthSessionEstablished } from './authSessionGeneration';

test('unknown reissue transport cannot release the physical barrier or start another reissue', async (t) => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new TypeError('synthetic offline'); });
  await assert.rejects(requestAuthReissue(), AuthOperationSupersededError);
  markAuthSessionEstablished();
  await assert.rejects(requestAuthReissue(), AuthOperationSupersededError);
  let drained = false;
  void waitForAuthReissue().then(() => { drained = true; });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(drained, false);
  assert.equal(calls, 1);
});
