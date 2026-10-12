import assert from 'node:assert/strict';
import test from 'node:test';

import { parseUiUxQueryArgs, resolveStackApplicability } from './uiux-query.mjs';

test('query wrapper requires a profile and a specific intent', () => {
  assert.throws(() => parseUiUxQueryArgs(['--profile', 'mate']), /--intent/);
});

test('query wrapper blocks persistence and only allows read-only options', () => {
  assert.throws(
    () => parseUiUxQueryArgs(['--profile', 'mate', '--intent', 'filter', '--persist']),
    /read-only/,
  );
});

test('React stack guidance remains explicitly incompatible with the project runtime', () => {
  assert.deepEqual(resolveStackApplicability('react'), {
    projectVersion: '18.3.1',
    recommendationVersion: '19.2.x',
    status: 'advisory-incompatible',
  });
});
