import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { extractImportSpecifiers, warmUpViteServer } from './vite-warmup.mjs';

const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'vite-warmup.mjs');

const withServer = async (routes, run) => {
  const hits = [];
  const server = createServer((request, response) => {
    hits.push(request.url);
    const route = routes[request.url];
    if (!route) {
      response.writeHead(404).end();
      return;
    }
    const { status = 200, type = 'text/javascript', body = '', delayMs = 0 } = route;
    setTimeout(() => response.writeHead(status, { 'content-type': type }).end(body), delayMs);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`, hits);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
};

test('extractImportSpecifiers finds static, dynamic and side-effect imports by absolute path only', () => {
  const source = [
    'import { a } from "/src/a.tsx";',
    'import "/src/styles.css";',
    'const lazy = () => import("/src/components/Home.tsx");',
    'import React from "/node_modules/.vite/deps/react.js?v=abc";',
    'import relative from "./relative.ts";',
    'import cdn from "//cdn.example.com/x.js";',
  ].join('\n');

  assert.deepEqual(extractImportSpecifiers(source), [
    '/src/a.tsx',
    '/src/styles.css',
    '/src/components/Home.tsx',
    '/node_modules/.vite/deps/react.js?v=abc',
  ]);
});

test('warmUpViteServer walks static and dynamic imports and requests every module once', async () => {
  await withServer({
    '/': { type: 'text/html', body: '<html></html>' },
    '/@vite/client': { body: '' },
    '/src/main.tsx': { body: 'import "/src/a.tsx"; const route = () => import("/src/b.tsx");' },
    '/src/a.tsx': { body: 'import "/src/shared.ts";' },
    '/src/b.tsx': { body: 'import "/src/shared.ts"; import "/logo.svg";' },
    '/src/shared.ts': { body: 'export const x = 1;' },
    '/logo.svg': { type: 'image/svg+xml', body: '<svg/>' },
  }, async (baseUrl, hits) => {
    const summary = await warmUpViteServer(baseUrl);

    assert.equal(summary.failed, 0);
    assert.equal(summary.budgetExceeded, false);
    for (const requested of ['/', '/@vite/client', '/src/main.tsx', '/src/a.tsx', '/src/b.tsx', '/src/shared.ts', '/logo.svg']) {
      assert.equal(hits.filter((hit) => hit === requested).length, 1, `${requested} requested once`);
    }
    assert.equal(summary.modules, 7);
  });
});

test('warmUpViteServer counts failing modules and keeps going', async () => {
  await withServer({
    '/': { type: 'text/html', body: '' },
    '/@vite/client': { body: '' },
    '/src/main.tsx': { body: 'import "/src/broken.tsx"; import "/src/ok.tsx";' },
    '/src/broken.tsx': { status: 500, body: 'boom' },
    '/src/ok.tsx': { body: 'import "/src/after.ts";' },
    '/src/after.ts': { body: '' },
  }, async (baseUrl, hits) => {
    const summary = await warmUpViteServer(baseUrl);

    assert.equal(summary.failed, 1);
    assert.ok(hits.includes('/src/after.ts'), 'modules behind a healthy sibling are still warmed');
  });
});

test('warmUpViteServer reports failures instead of throwing when the server is unreachable', async () => {
  const summary = await warmUpViteServer('http://127.0.0.1:1', { requestTimeoutMs: 2_000 });

  assert.ok(summary.failed > 0);
});

test('warmUpViteServer stops dispatching new requests once the time budget is spent', async () => {
  await withServer({
    '/': { type: 'text/html', body: '' },
    '/@vite/client': { body: '', delayMs: 100 },
    '/src/main.tsx': { body: 'import "/src/slow.ts"; import "/src/never-1.ts";', delayMs: 100 },
    '/src/slow.ts': { body: 'import "/src/never-2.ts";', delayMs: 300 },
  }, async (baseUrl, hits) => {
    const summary = await warmUpViteServer(baseUrl, { budgetMs: 50, concurrency: 1 });

    assert.equal(summary.budgetExceeded, true);
    assert.ok(!hits.includes('/src/never-2.ts'));
  });
});

test('the CLI exits 0 and says so even when the dev server never answers', () => {
  const result = spawnSync(process.execPath, [scriptPath, 'http://127.0.0.1:1'], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\[vite-warmup\] http:\/\/127\.0\.0\.1:1 modules=\d+ failed=\d+/);
});

test('the CLI exits 0 without a base URL', () => {
  const result = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8' });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /skipped: no base URL given/);
});
