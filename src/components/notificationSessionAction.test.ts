import assert from 'node:assert/strict';
import test from 'node:test';
import { runNotificationSessionAction } from './notificationSessionAction';

test('stale rendered actions do not make requests or update state', async () => {
  let requested = false;
  let applied = false;
  await runNotificationSessionAction({
    isCurrent: () => false,
    request: async () => { requested = true; return [1]; },
    apply: () => { applied = true; },
    onError: () => { throw new Error('unexpected error'); },
  });
  assert.equal(requested, false);
  assert.equal(applied, false);
});

test('delayed success and error from the old session are ignored', async () => {
  for (const shouldReject of [false, true]) {
    let current = true;
    let settle!: () => void;
    let applied = false;
    let reported = false;
    const pending = runNotificationSessionAction({
      isCurrent: () => current,
      request: () => new Promise<number>((resolve, reject) => {
        settle = () => shouldReject ? reject(new Error('failed')) : resolve(1);
      }),
      apply: () => { applied = true; },
      onError: () => { reported = true; },
    });
    current = false;
    settle();
    await pending;
    assert.equal(applied, false);
    assert.equal(reported, false);
  }
});

test('current session applies a successful result and reports a failure', async () => {
  const applied: number[] = [];
  const errors: unknown[] = [];
  await runNotificationSessionAction({
    isCurrent: () => true,
    request: async () => 3,
    apply: (value) => applied.push(value),
    onError: (error) => errors.push(error),
  });
  await runNotificationSessionAction({
    isCurrent: () => true,
    request: async () => { throw new Error('failed'); },
    apply: () => { throw new Error('unexpected success'); },
    onError: (error) => errors.push(error),
  });
  assert.deepEqual(applied, [3]);
  assert.equal(errors.length, 1);
});
