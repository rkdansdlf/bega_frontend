import assert from 'node:assert/strict';
import test from 'node:test';
import { readTimedMapValue, writeTimedMapValue } from './expiredMapEntries';

test('timed map reads and writes prune entries past their TTL', () => {
  const now = 1_800_000_000_000;
  const entries = new Map([
    ['expired', { data: 'old', updatedAt: now - 60_001 }],
    ['ttl-boundary', { data: 'boundary', updatedAt: now - 60_000 }],
    ['fresh', { data: 'current', updatedAt: now - 100 }],
  ]);

  assert.equal(readTimedMapValue(entries, 'fresh', now, 60_000), 'current');
  assert.equal(entries.has('expired'), false);
  assert.equal(readTimedMapValue(entries, 'ttl-boundary', now, 60_000), 'boundary');

  entries.set('expired-before-write', { data: 'old', updatedAt: now - 60_001 });
  writeTimedMapValue(entries, 'next', 'next', now, 60_000);

  assert.equal(entries.has('expired-before-write'), false);
  assert.equal(entries.get('next')?.data, 'next');
  assert.equal(entries.size, 3);
});
