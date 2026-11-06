import assert from 'node:assert/strict';
import test from 'node:test';

import { designEnvironmentCases, restoreDesignEnvironmentViewport } from './visual-qa-design-consistency';

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

test('design matrix restores the requested viewport after an expanded interaction capture', async () => {
  const events: string[] = [];
  let viewport = { width: 399, height: 1840 };
  const page = {
    viewportSize: () => viewport,
    setViewportSize: async (size: { width: number; height: number }) => {
      viewport = size;
      events.push(`viewport:${size.width}x${size.height}`);
    },
    evaluate: async () => {
      events.push('settled');
    },
  };

  await restoreDesignEnvironmentViewport(page, { width: 320, height: 900 });

  assert.deepEqual(events, ['viewport:320x900', 'settled']);
  assert.deepEqual(viewport, { width: 320, height: 900 });
});
