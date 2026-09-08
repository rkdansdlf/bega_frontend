import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createServer as createViteServer } from 'vite';


const rootDir = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));

test('Visual QA Vite graph excludes test, spec, and story modules', { timeout: 60_000 }, async (t) => {
  const hmrServer = createHttpServer();
  const server = await createViteServer({
    appType: 'custom',
    configFile: path.join(rootDir, 'vite.visual-qa.config.ts'),
    server: { hmr: { server: hmrServer }, middlewareMode: true },
  });
  t.after(async () => {
    await server.close();
    hmrServer.removeAllListeners();
  });

  const transformed = await server.transformRequest('/src/visual-qa/VisualQaHarnessApp.tsx');
  assert.ok(transformed, 'Vite should transform the Visual QA harness entry');

  const modulePaths = [...transformed.code.matchAll(/import\(\"([^\"]+)\"\)/g)]
    .map(([, modulePath]) => modulePath);
  assert.ok(
    modulePaths.some((modulePath) => modulePath.includes('/src/components/')),
    'the harness should retain production component modules',
  );

  const forbiddenModules = modulePaths.filter((modulePath) => (
    /\.(?:test|spec|story|stories)\.tsx(?:\?|$)/.test(modulePath)
      || modulePath.includes('/__tests__/')
  ));
  assert.deepEqual(forbiddenModules, []);
});
