import assert from 'node:assert/strict';
import test from 'node:test';

import { designEnvironmentCases } from './visual-qa-design-consistency';

test('design matrix stays bounded and covers each required environment without claiming full coverage', () => {
  const after = designEnvironmentCases('after');
  const before = designEnvironmentCases('before');
  assert.ok(after.length + before.length <= 150);
  assert.deepEqual([...new Set(after.map((entry) => entry.width))].sort((a, b) => a - b), [320, 390, 768, 1024, 1440]);
  assert.deepEqual([...new Set(after.map((entry) => entry.zoom))], [1, 2]);
  assert.deepEqual([...new Set(after.map((entry) => entry.theme))], ['light', 'dark']);
  for (const entry of [...after, ...before]) {
    assert.equal(entry.scenario.kind, 'component-state');
    assert.equal(entry.scenario.finalCoverage, false);
  }
  assert.ok(after.some((entry) => entry.scenario.states.system === 'loading'));
  assert.ok(after.some((entry) => entry.scenario.states.system === 'error-503'));
  assert.ok(after.some((entry) => entry.scenario.states.interactions === 'keyboard-navigation'));
});
