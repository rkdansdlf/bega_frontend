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
  coordinator.activate();
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
  coordinator.activate();

  const oldRun = coordinator.request({ search: 'old' }, () => oldRequest.promise);
  const newRun = coordinator.request({ search: 'new' }, () => newRequest.promise);
  oldRequest.reject(new Error('stale failure'));
  await oldRun;
  assert.deepEqual(errors, []);
  assert.deepEqual(loading, [true]);

  newRequest.resolve(['new']);
  await newRun;
  assert.deepEqual(commits, [['new']]);
  assert.deepEqual(errors, []);
  assert.deepEqual(loading, [true, false]);
});

test('removes settled and failed entries so the same key can retry', async () => {
  let calls = 0;
  const errors: string[] = [];
  const coordinator = createOffseasonMovementListCoordinator<string[]>({
    onData: () => undefined,
    onError: (error) => errors.push(error.message),
    onLoading: () => undefined,
  });
  coordinator.activate();

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
  coordinator.activate();

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
    coordinator.activate();
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
  coordinator.activate();
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
  coordinator.activate();
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
  coordinator.activate();
  let refreshes = 0;

  await coordinator.run(
    'csv-import',
    async () => ({ createdCount: 0, updatedCount: 0 }),
    async () => { refreshes += 1; },
    (result) => result.createdCount > 0 || result.updatedCount > 0,
  );

  assert.equal(refreshes, 0);
});

test('StrictMode cleanup and replay reuse one request while restoring lifecycle loading', async () => {
  const request = deferred<string[]>();
  const commits: string[][] = [];
  const loading: boolean[] = [];
  let calls = 0;
  const coordinator = createOffseasonMovementListCoordinator<string[]>({
    onData: (data) => commits.push(data),
    onError: () => assert.fail('StrictMode replay must not fail'),
    onLoading: (value) => loading.push(value),
  });
  const fetcher = () => {
    calls += 1;
    return request.promise;
  };

  coordinator.activate();
  const first = coordinator.request({ search: 'MOCK' }, fetcher);
  coordinator.deactivate();
  coordinator.activate();
  const replay = coordinator.request({ search: 'MOCK' }, fetcher);

  assert.equal(calls, 1);
  request.resolve(['replayed']);
  await Promise.all([first, replay]);
  assert.deepEqual(commits, [['replayed']]);
  assert.deepEqual(loading, [true, false, true, false]);
});

test('every successful mutation starts one force-fresh same-key list request', async () => {
  for (const actionKey of ['create', 'update', 'delete', 'csv-import']) {
    const stale = deferred<string[]>();
    const fresh = deferred<string[]>();
    const mutation = deferred<void>();
    const commits: string[][] = [];
    let listCalls = 0;
    const list = createOffseasonMovementListCoordinator<string[]>({
      onData: (data) => commits.push(data),
      onError: () => assert.fail(`${actionKey} list refresh must not fail`),
      onLoading: () => undefined,
    });
    const mutations = createOffseasonMovementMutationCoordinator();
    list.activate();
    mutations.activate();
    const fetcher = () => {
      listCalls += 1;
      return listCalls === 1 ? stale.promise : fresh.promise;
    };

    const staleRun = list.request({ search: 'same-key' }, fetcher);
    const mutationRun = mutations.run(
      actionKey,
      () => mutation.promise,
      () => list.request({ search: 'same-key' }, fetcher, { forceFresh: true }),
    );
    mutation.resolve();
    await Promise.resolve();
    assert.equal(listCalls, 2, actionKey);

    stale.resolve(['stale']);
    fresh.resolve(['fresh']);
    await Promise.all([staleRun, mutationRun]);
    assert.deepEqual(commits, [['fresh']], actionKey);
  }
});

test('deactivating a pending mutation suppresses its refresh even after a lifecycle replay', async () => {
  const mutation = deferred<void>();
  let refreshes = 0;
  const coordinator = createOffseasonMovementMutationCoordinator();
  coordinator.activate();
  const run = coordinator.run(
    'create',
    () => mutation.promise,
    async () => { refreshes += 1; },
  );

  coordinator.deactivate();
  coordinator.activate();
  mutation.resolve();
  await run;

  assert.equal(refreshes, 0);
  assert.equal(coordinator.isActive(), true);
});

test('CSV completion refreshes once with the latest filters and rejects the stale list result', async () => {
  const stale = deferred<string[]>();
  const fresh = deferred<string[]>();
  const mutation = deferred<void>();
  const commits: string[][] = [];
  const requestedFilters: Array<Record<string, string | undefined>> = [];
  let latestFilters = { search: 'filters-A' };
  const list = createOffseasonMovementListCoordinator<string[]>({
    onData: (data) => commits.push(data),
    onError: () => assert.fail('CSV refresh must not fail'),
    onLoading: () => undefined,
  });
  const mutations = createOffseasonMovementMutationCoordinator();
  list.activate();
  mutations.activate();
  const fetcher = (filters: Record<string, string | undefined>) => {
    requestedFilters.push(filters);
    return requestedFilters.length === 1 ? stale.promise : fresh.promise;
  };

  const staleRun = list.request(latestFilters, fetcher);
  const importRun = mutations.run(
    'csv-import',
    () => mutation.promise,
    () => list.request(latestFilters, fetcher, { forceFresh: true }),
  );
  latestFilters = { search: 'filters-B' };
  mutation.resolve();
  await Promise.resolve();

  assert.deepEqual(requestedFilters, [{ search: 'filters-A' }, { search: 'filters-B' }]);
  stale.resolve(['stale']);
  fresh.resolve(['fresh']);
  await Promise.all([staleRun, importRun]);
  assert.deepEqual(commits, [['fresh']]);
});
