import assert from 'node:assert/strict';
import test from 'node:test';

import { detectFrontendUiImpact } from './frontend-ui-impact.mjs';

test('selects only the manually requested suite', () => {
  assert.deepEqual(detectFrontendUiImpact([], 'auth', 'workflow_dispatch'), {
    reflow_changed: false,
    pages_changed: false,
    auth_changed: true,
    home_changed: false,
    landing_changed: false,
    stadium_changed: false,
  });
});

test('manual all selects every suite', () => {
  assert.deepEqual(detectFrontendUiImpact([], 'all', 'workflow_dispatch'), {
    reflow_changed: true,
    pages_changed: true,
    auth_changed: true,
    home_changed: true,
    landing_changed: true,
    stadium_changed: true,
  });
});

test('pull request paths select matching suites', () => {
  assert.deepEqual(
    detectFrontendUiImpact([
      'bega_frontend/src/components/Login.tsx',
      'bega_frontend/src/components/home/TodayGames.tsx',
    ], 'all', 'pull_request'),
    {
      reflow_changed: true,
    pages_changed: true,
      auth_changed: true,
      home_changed: true,
      landing_changed: false,
      stadium_changed: false,
    },
  );
});

test('supports frontend-repository-relative paths', () => {
  assert.deepEqual(detectFrontendUiImpact(['src/components/Login.tsx'], 'all', 'pull_request'), {
    reflow_changed: true,
    pages_changed: true,
    auth_changed: true,
    home_changed: false,
    landing_changed: false,
    stadium_changed: false,
  });
});

test('shared package and workflow changes fan out to every suite', () => {
  for (const path of [
    'bega_frontend/package-lock.json',
    '.github/workflows/_frontend-node-suite.yml',
    '.github/workflows/frontend-ui-qa.yml',
  ]) {
    assert.deepEqual(detectFrontendUiImpact([path], 'all', 'pull_request'), {
      reflow_changed: true,
    pages_changed: true,
      auth_changed: true,
      home_changed: true,
      landing_changed: true,
      stadium_changed: true,
    });
  }
});

test('the reflow gate is selected by its own script, independently of the page suites', () => {
  assert.deepEqual(
    detectFrontendUiImpact(['bega_frontend/scripts/reflow-320-audit.mjs'], 'all', 'pull_request'),
    {
      reflow_changed: true,
      pages_changed: false,
      auth_changed: false,
      home_changed: false,
      landing_changed: false,
      stadium_changed: false,
    },
  );
});

test('unrelated pull request paths select no UI suite', () => {
  assert.deepEqual(
    detectFrontendUiImpact(['bega_backend/BEGA_PROJECT/README.md'], 'all', 'pull_request'),
    {
      reflow_changed: false,
    pages_changed: false,
      auth_changed: false,
      home_changed: false,
      landing_changed: false,
      stadium_changed: false,
    },
  );
});
