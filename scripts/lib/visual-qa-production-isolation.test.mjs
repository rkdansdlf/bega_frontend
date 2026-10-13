import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  findVisualQaEndpointIsolationViolations,
  findVisualQaProductionIsolationViolations,
} from './visual-qa-production-isolation.mjs';

test('production isolation accepts ordinary application artifacts', () => {
  assert.deepEqual(findVisualQaProductionIsolationViolations({
    artifacts: [
      { file: 'dist/index.html', content: '<div id="root"></div>' },
      { file: 'dist/assets/index-a1b2.js', content: 'console.log("production")' },
    ],
    manifest: {
      'index.html': { file: 'assets/index-a1b2.js', isEntry: true },
    },
  }), []);
});

test('production isolation reports harness paths, manifest entries, and runtime sentinels', () => {
  const violations = findVisualQaProductionIsolationViolations({
    artifacts: [
      {
        file: 'dist/visual-qa-harness.html',
        content: '<script src="/src/visual-qa/main.tsx"></script>',
      },
      {
        file: 'dist/assets/index-a1b2.js',
        content: 'window.__BEGA_VISUAL_QA_HARNESS__ = {}',
      },
    ],
    manifest: {
      'visual-qa-harness.html': {
        file: 'assets/visual-qa-harness-c3d4.js',
        src: 'visual-qa-harness.html',
      },
    },
  });

  assert.deepEqual(
    new Set(violations.map(({ marker }) => marker)),
    new Set([
      'visual-qa-harness',
      'src/visual-qa/',
      '__BEGA_VISUAL_QA_HARNESS__',
    ]),
  );
  assert.ok(violations.some(({ location }) => location === 'artifact-path'));
  assert.ok(violations.some(({ location }) => location === 'artifact-content'));
  assert.ok(violations.some(({ location }) => location === 'manifest'));
});

test('the production bundle guard enforces visual QA isolation violations', async () => {
  const bundleGuardSource = await readFile(
    new URL('../bundle-guard.mjs', import.meta.url),
    'utf8',
  );

  assert.match(bundleGuardSource, /findVisualQaProductionIsolationViolations/);
  assert.match(bundleGuardSource, /visualQaProductionIsolationViolations/);
  assert.match(bundleGuardSource, /type: 'visual_qa_production_isolation'/);
});

test('local visual QA rejects production API/WS origins in executable artifacts', () => {
  assert.deepEqual(findVisualQaEndpointIsolationViolations({
    artifacts: [
      { file: 'dist/_headers', content: 'connect-src https://api.begabaseball.xyz wss://api.begabaseball.xyz' },
      { file: 'dist/index.html', content: '<link rel="preconnect" href="https://api.begabaseball.xyz">' },
      { file: 'dist/assets/home.js', content: 'const api = "https://api.begabaseball.xyz";' },
    ],
  }), [
    {
      location: 'artifact-content',
      file: 'dist/index.html',
      marker: 'https://api.begabaseball.xyz',
      type: 'production_endpoint',
    },
    {
      location: 'artifact-content',
      file: 'dist/assets/home.js',
      marker: 'https://api.begabaseball.xyz',
      type: 'production_endpoint',
    },
  ]);
});

test('visual QA build is pinned to the local API boundary', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  );
  const buildCommand = packageJson.scripts['visual-qa:build'];

  assert.match(buildCommand, /VITE_API_BASE_URL=\/api/);
  assert.match(buildCommand, /VITE_SITE_URL=http:\/\/127\.0\.0\.1:5180/);
  assert.match(buildCommand, /VITE_PROXY_TARGET=http:\/\/127\.0\.0\.1:8080/);
  assert.doesNotMatch(buildCommand, /api\.begabaseball\.xyz/);
});
