import assert from 'node:assert/strict';
import test from 'node:test';

import { formatCompactNumber } from './UserStatsPanel';

test('formatCompactNumber preserves readable suffixes through the maximum supported integer', () => {
  assert.equal(formatCompactNumber(999), '999');
  assert.equal(formatCompactNumber(1000), '1.0K');
  assert.equal(formatCompactNumber(1000000), '1.0M');
  assert.equal(formatCompactNumber(1000000000), '1.0B');
  assert.equal(formatCompactNumber(1000000000000), '1.0T');
  assert.equal(formatCompactNumber(1000000000000000), '1.0Q');
  assert.equal(formatCompactNumber(Number.MAX_SAFE_INTEGER), '9.0Q');
});
