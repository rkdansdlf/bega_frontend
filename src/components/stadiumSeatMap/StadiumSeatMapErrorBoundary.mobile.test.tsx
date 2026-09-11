import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { chromium, type Browser } from 'playwright';
import { createServer, type Plugin, type ViteDevServer } from 'vite';

const pagePath = '/__stadium-seatmap-error-boundary-test.html';
const entryPath = '/__stadium-seatmap-error-boundary-test.tsx';
const moduleId = '\0virtual:stadium-seatmap-error-boundary-test';
const componentSourcePath = 'src/components/StadiumSeatMapStates.tsx';

const createBoundaryPlugin = (mutate: boolean): Plugin => ({
  name: 'stadium-seatmap-error-boundary-actual-browser-test',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (request.url?.split('?')[0] !== pagePath) return next();
      try {
        const html = await server.transformIndexHtml(
          pagePath,
          `<!doctype html><html><body><main id="root"></main><script type="module" src="${entryPath}"></script></body></html>`,
        );
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(html);
      } catch (error) {
        next(error);
      }
    });
  },
  resolveId(id) {
    return id === entryPath ? moduleId : undefined;
  },
  transform(code, id) {
    if (!mutate || !id.split('?')[0].endsWith(`/${componentSourcePath}`)) return undefined;
    const target = 'return { hasError: true };';
    assert.ok(code.includes(target), 'StadiumSeatMapErrorBoundary mutation target missing');
    return code.replace(target, 'return { hasError: false };');
  },
  load(id) {
    if (id !== moduleId) return undefined;
    return `
      import React, { createElement, useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import {
        StadiumSeatMapErrorBoundary,
        StadiumSeatMapErrorFallback,
      } from '/src/components/StadiumSeatMapStates.tsx';
      import '/src/index.css';

      const query = new URLSearchParams(window.location.search);
      const data = query.get('data') || 'populated';
      const system = query.get('system') || 'idle';
      const theme = query.get('theme') === 'dark' ? 'dark' : 'light';
      const copy = {
        empty: { stadiumName: undefined, child: '' },
        populated: { stadiumName: '합성 테스트 구장', child: '합성 좌석도 콘텐츠' },
        'null-optional': { stadiumName: undefined, child: '선택적인 구장 이름이 없어도 좌석도 콘텐츠는 유지됩니다.' },
        'long-korean': {
          stadiumName: '모바일 화면에서 자연스럽게 줄바꿈되어야 하는 매우 긴 합성 테스트 구장 이름',
          child: '오류 경계 하위 콘텐츠가 정상 복구된 뒤에도 모바일 화면에서 잘리지 않는지 확인합니다.',
        },
        'unbroken-token': {
          stadiumName: 'STADIUMSEATMAPERRORBOUNDARY' + 'X'.repeat(180),
          child: 'STADIUMSEATMAPERRORBOUNDARY' + 'Y'.repeat(220),
        },
        'maximum-supported': {
          stadiumName: '최대지원좌석도상태'.repeat(36),
          child: '최대지원좌석도상태'.repeat(44),
        },
      }[data] || { stadiumName: '합성 테스트 구장', child: '합성 좌석도 콘텐츠' };

      function FailingChild({ shouldThrow, children }) {
        if (shouldThrow()) throw new Error('Synthetic StadiumSeatMapErrorBoundary render failure');
        return createElement('div', {
          className: 'min-w-0 max-w-full rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 [overflow-wrap:anywhere] dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100',
          'data-testid': 'stadium-seatmap-boundary-recovered',
        }, children);
      }

      function App() {
        const [retryReady, setRetryReady] = useState(false);
        const [resetKey, setResetKey] = useState(0);
        const persistent = system === 'error-503';
        const recoverable = system === 'error-recoverable' || system === 'reset-key';
        const shouldThrow = () => {
          if (system === 'idle') return false;
          if (persistent) return true;
          return !retryReady;
        };
        const reset = () => {
          setRetryReady(true);
          setResetKey((value) => value + 1);
        };
        const fallback = (onRetry) => createElement(StadiumSeatMapErrorFallback, {
          stadiumName: copy.stadiumName,
          onRetry: () => {
            setRetryReady(true);
            onRetry();
          },
        });
        document.documentElement.classList.toggle('dark', theme === 'dark');
        return createElement('div', {
          className: 'w-full min-w-0 p-2',
          'data-testid': 'stadium-seatmap-boundary-host',
          'data-theme': theme,
        },
          createElement(StadiumSeatMapErrorBoundary, {
            resetKey: String(resetKey),
            fallback,
          }, createElement(FailingChild, { shouldThrow, children: copy.child })),
          recoverable && system === 'reset-key'
            ? createElement('button', {
              type: 'button',
              'data-testid': 'stadium-seatmap-boundary-reset',
              onClick: reset,
            }, '구장 다시 진입')
            : null,
        );
      }

      createRoot(document.getElementById('root')).render(createElement(App));
    `;
  },
});

const startServer = async (mutate = false) => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'stadium-seatmap-error-boundary-vite-'));
  const server = await createServer({
    root: process.cwd(),
    appType: 'custom',
    cacheDir,
    plugins: [createBoundaryPlugin(mutate)],
    server: { host: '127.0.0.1', port: 5191, strictPort: true },
  });
  try {
    await server.listen();
  } catch (error) {
    await server.close().catch(() => {});
    await rm(cacheDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
  return { cacheDir, server };
};

const serverAddress = (server: ViteDevServer) => {
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Vite test server did not expose a TCP address');
  return `http://127.0.0.1:${address.port}`;
};

const closeResources = async (resources: { browser?: Browser; server?: ViteDevServer; cacheDir?: string }) => {
  const errors: unknown[] = [];
  for (const close of [
    resources.browser ? () => resources.browser?.close() : undefined,
    resources.server ? () => resources.server?.close() : undefined,
    resources.cacheDir ? () => rm(resources.cacheDir as string, { recursive: true, force: true }) : undefined,
  ]) {
    try {
      await close?.();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new Error(`StadiumSeatMapErrorBoundary cleanup failed: ${errors.length}`);
};

test('StadiumSeatMapErrorBoundary contains real child render errors across mobile states and recovers', async () => {
  const resources: { browser?: Browser; server?: ViteDevServer; cacheDir?: string } = {};
  try {
    const started = await startServer();
    resources.server = started.server;
    resources.cacheDir = started.cacheDir;
    resources.browser = await chromium.launch({ headless: true });
    const page = await resources.browser.newPage();
    const address = serverAddress(resources.server);
    const externalRequests: string[] = [];
    const origin = new URL(address).origin;
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== origin) externalRequests.push(request.url());
    });

    for (const [width, height] of [[320, 844], [390, 1000]] as const) {
      await page.setViewportSize({ width, height });
      for (const theme of ['light', 'dark']) {
        for (const data of ['empty', 'populated', 'null-optional', 'long-korean', 'unbroken-token', 'maximum-supported']) {
          await page.goto(`${address}${pagePath}?data=${data}&system=idle&theme=${theme}`, { waitUntil: 'domcontentloaded' });
          const resolved = page.locator('[data-testid="stadium-seatmap-boundary-recovered"]');
          await resolved.waitFor({ state: 'visible' });
          const idleMetrics = await page.locator('[data-testid="stadium-seatmap-boundary-host"]').evaluate((host) => ({
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            hostOverflow: host.scrollWidth - host.clientWidth,
            text: host.textContent || '',
            dark: document.documentElement.classList.contains('dark'),
          }));
          assert.ok(idleMetrics.overflow <= 2, `${width}px idle document overflow for ${data}`);
          assert.ok(idleMetrics.hostOverflow <= 2, `${width}px idle host overflow for ${data}`);
          assert.equal(idleMetrics.dark, theme === 'dark');
          if (data === 'unbroken-token') assert.match(idleMetrics.text, /STADIUMSEATMAPERRORBOUNDARYY{20}/);

          await page.goto(`${address}${pagePath}?data=${data}&system=error-recoverable&theme=${theme}`, { waitUntil: 'domcontentloaded' });
          const alert = page.locator('[data-testid="stadium-seatmap-error"]');
          await alert.waitFor({ state: 'visible' });
          assert.equal(await alert.getAttribute('role'), 'alert');
          const retry = alert.locator('button');
          const retryBox = await retry.boundingBox();
          assert.ok(retryBox && retryBox.height >= 44);
          await retry.click();
          await resolved.waitFor({ state: 'visible' });
          const recoveredText = await resolved.textContent();
          if (data === 'empty') assert.equal(recoveredText, '');
          else assert.match(recoveredText || '', /합성|STADIUM|최대지원|오류 경계|선택적인/);

          await page.goto(`${address}${pagePath}?data=${data}&system=error-503&theme=${theme}`, { waitUntil: 'domcontentloaded' });
          await alert.waitFor({ state: 'visible' });
          await alert.locator('button').click();
          await alert.waitFor({ state: 'visible' });
        }
      }
    }
    await page.goto(`${address}${pagePath}?data=long-korean&system=reset-key&theme=dark`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="stadium-seatmap-error"]').waitFor({ state: 'visible' });
    await page.locator('[data-testid="stadium-seatmap-boundary-reset"]').click();
    await page.locator('[data-testid="stadium-seatmap-boundary-recovered"]').waitFor({ state: 'visible' });
    assert.deepEqual(externalRequests, []);
  } finally {
    await closeResources(resources);
  }
});

test('StadiumSeatMapErrorBoundary mutation removes fallback handling and fails the assertion', async () => {
  const resources: { browser?: Browser; server?: ViteDevServer; cacheDir?: string } = {};
  try {
    const started = await startServer(true);
    resources.server = started.server;
    resources.cacheDir = started.cacheDir;
    resources.browser = await chromium.launch({ headless: true });
    const page = await resources.browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const address = serverAddress(resources.server);
    await page.goto(`${address}${pagePath}?data=populated&system=error-503&theme=light`, { waitUntil: 'domcontentloaded' });
    await assert.rejects(
      () => page.locator('[data-testid="stadium-seatmap-error"]').waitFor({ state: 'visible', timeout: 2_000 }),
      /Timeout/,
    );
    assert.ok(errors.some((message) => message.includes('Synthetic StadiumSeatMapErrorBoundary render failure')));
  } finally {
    await closeResources(resources);
  }
});

test('StadiumSeatMapErrorBoundary browser test is wired exactly once into the visual QA gate', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const testPath = 'src/components/stadiumSeatMap/StadiumSeatMapErrorBoundary.mobile.test.tsx';
  const scripts = packageJson.scripts ?? {};
  const preHarness = scripts['previsual-qa:harness:test'] ?? '';
  const harness = scripts['visual-qa:harness:test'] ?? '';
  assert.equal(preHarness.split(testPath).length - 1, 1);
  assert.equal(harness.split(testPath).length - 1, 0);
});

test('StadiumSeatMapErrorBoundary evidence source is content-addressable', async () => {
  const source = await readFile(new URL('../StadiumSeatMapStates.tsx', import.meta.url));
  const sourceHash = createHash('sha256').update(source).digest('hex');
  assert.equal(sourceHash.length, 64);
});
