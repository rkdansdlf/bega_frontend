import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeTeam } from './coach';
import { baseRequest } from './coachTestSupport';
import { AuthOperationSupersededError, beginAuthLogout, markAuthSessionEstablished } from './authSessionGeneration';
import { ensureRealtimeAuthSession } from '../utils/realtimeAuth';

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
for (const transition of ['logout', 'login']) {
  test(`coach backoff cannot replay after ${transition}`, async (t) => {
    markAuthSessionEstablished();
    t.after(markAuthSessionEstablished);
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let calls = 0;
    t.mock.method(globalThis, 'fetch', async () => {
      calls++;
      return new Response(JSON.stringify({ message: 'synthetic unavailable' }), { status: 503 });
    });
    const result = analyzeTeam(baseRequest).catch((error: unknown) => error);
    await flush();
    assert.equal(calls, 1);
    if (transition === 'logout') beginAuthLogout();
    else markAuthSessionEstablished();
    t.mock.timers.tick(10_000);
    assert.ok(await result instanceof AuthOperationSupersededError);
    assert.equal(calls, 1);
  });
}

test('obsolete realtime preflight neither opens a socket nor expires the replacement session', async (t) => {
  markAuthSessionEstablished();
  let release!: (response: Response) => void;
  let started!: () => void;
  const startedPromise = new Promise<void>((resolve) => { started = resolve; });
  const response = new Promise<Response>((resolve) => { release = resolve; });
  const events: Event[] = [];
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    location: { origin: 'http://localhost', hostname: 'localhost' },
    dispatchEvent: (event: Event) => { events.push(event); return true; },
  } });
  t.after(() => { Reflect.deleteProperty(globalThis, 'window'); markAuthSessionEstablished(); });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; started(); return response; });
  const result = ensureRealtimeAuthSession({ useInjectedProfile: false });
  await startedPromise;
  markAuthSessionEstablished();
  release(new Response('{}', { status: 401 }));
  assert.equal(await result, false);
  assert.equal(calls, 1);
  assert.equal(events.length, 0);
});
