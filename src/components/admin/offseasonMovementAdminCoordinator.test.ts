import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOffseasonMovementListCoordinator,
  createOffseasonMovementMutationCoordinator,
  normalizeOffseasonMovementFilters,
} from './offseasonMovementAdminCoordinator';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

test('normalizes filter keys and shares an identical in-flight list request', async () => {
  const request = deferred<string[]>();
  const commits: string[][] = [];
  const loading: boolean[] = [];
  let calls = 0;
  const coordinator = createOffseasonMovementListCoordinator<string[]>({
    onData: (data) => commits.push(data),
    onError: () => assert.fail('identical request must not fail'),
    onLoading: (value) => loading.push(value),
  });
  const filters = { search: '  MOCK 선수  ', section: 'ALL', teamCode: 'ALL', fromDate: '', toDate: '' };
  const fetcher = () => {
    calls += 1;
    return request.promise;
  };

  const first = coordinator.request(filters, fetcher);
  const strictModeReplay = coordinator.request({ ...filters }, fetcher);
  assert.equal(calls, 1);
  assert.deepEqual(normalizeOffseasonMovementFilters(filters), { search: 'MOCK 선수' });

  request.resolve(['newest']);
  await Promise.all([first, strictModeReplay]);
  assert.deepEqual(commits, [['newest']]);
  assert.deepEqual(loading, [true, false]);
});

test('lets only the newest different-key response commit data, error, and loading', async () => {
  const oldRequest = deferred<string[]>();
  const newRequest = deferred<string[]>();
  const commits: string[][] = [];
  const errors: string[] = [];
  const loading: boolean[] = [];
  const coordinator = createOffseasonMovementListCoordinator<string[]>({
    onData: (data) => commits.push(data),
    onError: (error) => errors.push(error.message),
    onLoading: (value) => loading.push(value),
  });

  const oldRun = coordinator.request({ search: 'old' }, () => oldRequest.promise);
  const newRun = coordinator.request({ search: 'new' }, () => newRequest.promise);
  oldRequest.reject(new Error('stale failure'));
  await oldRun;
  assert.deepEqual(errors, []);
  assert.deepEqual(loading, [true, true]);

  newRequest.resolve(['new']);
  await newRun;
  assert.deepEqual(commits, [['new']]);
  assert.deepEqual(errors, []);
  assert.deepEqual(loading, [true, true, false]);
});

test('removes settled and failed entries so the same key can retry', async () => {
  let calls = 0;
  const errors: string[] = [];
  const coordinator = createOffseasonMovementListCoordinator<string[]>({
    onData: () => undefined,
    onError: (error) => errors.push(error.message),
    onLoading: () => undefined,
  });

  await coordinator.request({}, async () => {
    calls += 1;
    throw new Error('first failure');
  });
  await coordinator.request({}, async () => {
    calls += 1;
    return ['retry'];
  });

  assert.equal(calls, 2);
  assert.deepEqual(errors, ['first failure']);
});

test('deactivation invalidates stale results and does not issue a request', async () => {
  const request = deferred<string[]>();
  const commits: string[][] = [];
  const loading: boolean[] = [];
  let calls = 0;
  const coordinator = createOffseasonMovementListCoordinator<string[]>({
    onData: (data) => commits.push(data),
    onError: () => assert.fail('stale request must not report an error'),
    onLoading: (value) => loading.push(value),
  });

  const run = coordinator.request({}, () => {
    calls += 1;
    return request.promise;
  });
  coordinator.deactivate();
  coordinator.deactivate();
  request.resolve(['stale']);
  await run;

  assert.equal(calls, 1);
  assert.deepEqual(commits, []);
  assert.deepEqual(loading, [true, false]);
});

test('rapid duplicate create, update, delete, and whole-file import actions run once', async () => {
  for (const actionKey of ['create', 'update', 'delete', 'csv-import']) {
    const action = deferred<string>();
    const coordinator = createOffseasonMovementMutationCoordinator();
    let calls = 0;
    let refreshes = 0;
    const mutate = () => {
      calls += 1;
      return action.promise;
    };
    const refresh = async () => { refreshes += 1; };

    const first = coordinator.run(actionKey, mutate, refresh);
    const duplicate = coordinator.run(actionKey, mutate, refresh);
    assert.equal(first, duplicate, actionKey);
    assert.equal(calls, 1, actionKey);
    action.resolve(actionKey);
    await Promise.all([first, duplicate]);
    assert.equal(refreshes, 1, actionKey);
  }
});

test('a failed mutation does not refresh and can be retried after settling', async () => {
  const coordinator = createOffseasonMovementMutationCoordinator();
  let calls = 0;
  let refreshes = 0;
  const refresh = async () => { refreshes += 1; };

  await assert.rejects(coordinator.run('create', async () => {
    calls += 1;
    throw new Error('save failed');
  }, refresh), /save failed/);
  await coordinator.run('create', async () => {
    calls += 1;
    return 'saved';
  }, refresh);

  assert.equal(calls, 2);
  assert.equal(refreshes, 1);
});

test('CSV row mutations remain sequential and one successful import refreshes once', async () => {
  const coordinator = createOffseasonMovementMutationCoordinator();
  const order: string[] = [];
  let refreshes = 0;

  await coordinator.run('csv-import', async () => {
    for (const row of ['row-1', 'row-2', 'row-3']) {
      order.push(`start:${row}`);
      await Promise.resolve();
      order.push(`finish:${row}`);
    }
    return { createdCount: 2, updatedCount: 1 };
  }, async () => { refreshes += 1; });

  assert.deepEqual(order, [
    'start:row-1', 'finish:row-1',
    'start:row-2', 'finish:row-2',
    'start:row-3', 'finish:row-3',
  ]);
  assert.equal(refreshes, 1);
});

test('a successful no-op CSV import may explicitly skip the list refresh', async () => {
  const coordinator = createOffseasonMovementMutationCoordinator();
  let refreshes = 0;

  await coordinator.run(
    'csv-import',
    async () => ({ createdCount: 0, updatedCount: 0 }),
    async () => { refreshes += 1; },
    (result) => result.createdCount > 0 || result.updatedCount > 0,
  );

  assert.equal(refreshes, 0);
});
