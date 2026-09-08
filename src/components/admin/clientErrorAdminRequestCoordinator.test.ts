import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createClientErrorEventFilterKey,
  createClientErrorEventRequestCoordinator,
} from './clientErrorAdminRequestCoordinator';

const createTimers = () => {
  let nextId = 1;
  const callbacks = new Map<number, () => void>();
  const delays: number[] = [];
  return {
    callbacks,
    delays,
    clearTimer: (id: unknown) => callbacks.delete(id as number),
    flush: () => {
      const queued = [...callbacks.values()];
      callbacks.clear();
      queued.forEach((callback) => callback());
    },
    setTimer: (callback: () => void, delayMs: number) => {
      const id = nextId++;
      callbacks.set(id, callback);
      delays.push(delayMs);
      return id;
    },
  };
};

test('runs the first active sync immediately and ignores identical Strict Mode replay', () => {
  const timers = createTimers();
  const coordinator = createClientErrorEventRequestCoordinator(timers);
  let runs = 0;
  const run = () => { runs += 1; };

  coordinator.sync({ active: true, windowKey: '24h', filterKey: 'default' }, run);
  assert.equal(runs, 1);
  coordinator.sync({ active: true, windowKey: '24h', filterKey: 'default' }, run);
  assert.equal(runs, 1);
});

test('runs window changes immediately once', () => {
  const timers = createTimers();
  const coordinator = createClientErrorEventRequestCoordinator(timers);
  let runs = 0;
  const run = () => { runs += 1; };

  coordinator.sync({ active: true, windowKey: '24h', filterKey: 'default' }, run);
  coordinator.sync({ active: true, windowKey: '7d', filterKey: 'default' }, run);
  assert.equal(runs, 2);
});

test('debounces rapid filter changes to the newest request', () => {
  const timers = createTimers();
  const coordinator = createClientErrorEventRequestCoordinator(timers);
  let runs = 0;
  const run = () => { runs += 1; };

  coordinator.sync({ active: true, windowKey: '24h', filterKey: 'default' }, run);
  coordinator.sync({ active: true, windowKey: '7d', filterKey: 'default' }, run);
  coordinator.sync({ active: true, windowKey: '7d', filterKey: 'route=a' }, run);
  coordinator.sync({ active: true, windowKey: '7d', filterKey: 'route=ab' }, run);
  assert.equal(timers.callbacks.size, 1);
  assert.deepEqual(timers.delays, [300, 300]);
  timers.flush();
  assert.equal(runs, 3);
});

test('records inactive snapshots, cancels pending work, and reactivates immediately', () => {
  const timers = createTimers();
  const coordinator = createClientErrorEventRequestCoordinator(timers);
  let runs = 0;
  const run = () => { runs += 1; };

  coordinator.sync({ active: true, windowKey: '24h', filterKey: 'default' }, run);
  coordinator.sync({ active: true, windowKey: '7d', filterKey: 'default' }, run);
  coordinator.sync({ active: true, windowKey: '7d', filterKey: 'route=a' }, run);
  assert.equal(timers.callbacks.size, 1);
  coordinator.sync({ active: false, windowKey: '7d', filterKey: 'route=ab' }, run);
  assert.equal(timers.callbacks.size, 0);
  coordinator.sync({ active: true, windowKey: '7d', filterKey: 'route=ab' }, run);
  assert.equal(runs, 3);
});

test('cancelPending and dispose remove pending callbacks', () => {
  const timers = createTimers();
  const coordinator = createClientErrorEventRequestCoordinator(timers);
  const run = () => {};

  coordinator.sync({ active: true, windowKey: '24h', filterKey: 'default' }, run);
  coordinator.sync({ active: true, windowKey: '24h', filterKey: 'changed' }, run);
  assert.equal(timers.callbacks.size, 1);
  coordinator.cancelPending();
  assert.equal(timers.callbacks.size, 0);
  coordinator.sync({ active: true, windowKey: '24h', filterKey: 'changed-again' }, run);
  assert.equal(timers.callbacks.size, 1);
  coordinator.dispose();
  assert.equal(timers.callbacks.size, 0);
});

test('filter key changes for every filter field', () => {
  const fields = ['bucket', 'source', 'statusGroup', 'route', 'fingerprint', 'search'] as const;
  const baseline = {
    bucket: 'all',
    source: 'all',
    statusGroup: 'all',
    route: 'all',
    fingerprint: 'all',
    search: 'all',
  };
  const baselineKey = createClientErrorEventFilterKey(baseline);

  fields.forEach((field) => {
    const changed = { ...baseline, [field]: `${field}-changed` };
    assert.notEqual(createClientErrorEventFilterKey(changed), baselineKey, field);
  });
});
