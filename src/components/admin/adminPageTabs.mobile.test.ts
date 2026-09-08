import assert from 'node:assert/strict';
import test from 'node:test';

import { adminTabItems } from './adminPageTabs';

test('every admin tab exposes a stable unique interaction target', () => {
  const expected = [
    ['users', 'admin-tab-users'],
    ['posts', 'admin-tab-posts'],
    ['parties', 'admin-tab-parties'],
    ['reports', 'admin-tab-reports'],
    ['gameStatus', 'admin-tab-game-status'],
    ['clientErrors', 'admin-tab-client-errors'],
    ['seatViews', 'admin-tab-seat-views'],
    ['offseason', 'admin-tab-offseason'],
    ['stadiums', 'admin-tab-stadiums'],
    ['ai', 'admin-tab-ai'],
  ];

  assert.deepEqual(
    adminTabItems.map(({ value, testId }) => [value, testId]),
    expected,
  );
  assert.equal(new Set(adminTabItems.map(({ testId }) => testId)).size, expected.length);
});
