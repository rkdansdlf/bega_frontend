import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type Plugin, type ViteDevServer } from 'vite';

const pagePath = '/__seat-map-hover-preview-test.html';
const entryPath = '/__seat-map-hover-preview-test.tsx';
const moduleId = '\0virtual:seat-map-hover-preview-test';
const unbrokenBadge = 'SEATMAP-HOVER-PREVIEW-UNBROKEN-BADGE-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const overflowMutation = process.env.SEAT_MAP_HOVER_PREVIEW_MUTATE_OVERFLOW === '1';
const packageMutation = process.env.SEAT_MAP_HOVER_PREVIEW_MUTATE_PACKAGE ?? '';

const createPreviewPlugin = (): Plugin => ({
  name: 'seat-map-hover-preview-actual-browser-test',
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
    if (!overflowMutation || !id.split('?')[0].endsWith('/src/components/SeatMapHoverPreview.tsx')) return undefined;
    const transformed = code.replace('max-w-[42%]', '');
    assert.notEqual(transformed, code, 'overflow mutation target missing');
    return transformed;
  },
  load(id) {
    if (id !== moduleId) return undefined;
    return `
      import React, { createElement } from 'react';
      import { createRoot } from 'react-dom/client';
      import SeatMapHoverPreview from '/src/components/SeatMapHoverPreview.tsx';
      import '/src/index.css';
      createRoot(document.getElementById('root')).render(createElement('div', { className: 'w-full p-2' }, createElement(SeatMapHoverPreview, {
        visible: true,
        title: '${unbrokenBadge}',
        subtitle: '${unbrokenBadge}',
        description: '${unbrokenBadge}',
        badgeLabel: '${unbrokenBadge}',
      })));
    `;
  },
});

const startServer = async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'seat-map-hover-preview-vite-'));
  const server = await createServer({
    root: process.cwd(),
    appType: 'custom',
    cacheDir,
    plugins: [createPreviewPlugin()],
    server: { host: '127.0.0.1', port: 0 },
  });
  await server.listen();
  return { cacheDir, server };
};

const closeResources = async (resources: {
  browser?: Browser;
  server?: ViteDevServer;
  cacheDir?: string;
}) => {
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
  if (errors.length > 1) throw new AggregateError(errors, 'SeatMapHoverPreview test cleanup failed');
};

test('SeatMapHoverPreview cleanup closes every resource after an earlier closer fails', async () => {
  const calls: string[] = [];
  await assert.rejects(() => closeResources({
    browser: { close: async () => { calls.push('browser'); throw new Error('browser close'); } } as Browser,
    server: { close: async () => { calls.push('server'); } } as ViteDevServer,
    cacheDir: undefined,
  }), /browser close/);
  assert.deepEqual(calls, ['browser', 'server']);
});

test('SeatMapHoverPreview cleanup removes cache after a server close failure', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'seat-map-hover-preview-cleanup-'));
  await assert.rejects(() => closeResources({
    server: { close: async () => { throw new Error('server close'); } } as ViteDevServer,
    cacheDir,
  }), /server close/);
  await assert.rejects(() => access(cacheDir));
});

test('SeatMapHoverPreview package gates include the focused test exactly once', async () => {
  const manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8')) as { scripts: Record<string, string> };
  const expected = ['visual-qa:seat-map-hover-preview:unit', 'visual-qa:seat-map-hover-preview:pre-harness'];
  const scripts = { ...manifest.scripts };
  if (packageMutation === 'omit') delete scripts[expected[0]];
  if (packageMutation === 'duplicate') scripts[expected[0]] += ' src/components/SeatMapHoverPreview.mobile.test.tsx';
  for (const name of expected) {
    const command = scripts[name] ?? '';
    assert.equal(command.split('src/components/SeatMapHoverPreview.mobile.test.tsx').length - 1, 1, `${name} exact-once wiring`);
  }
});

test('SeatMapHoverPreview persisted evidence is complete and unique', async () => {
  const report = JSON.parse(await readFile(new URL('../../reports/seat-map-hover-preview-component-states.json', import.meta.url), 'utf8')) as { results: Array<{ status: string; attempts: number; screenshot: string }> };
  assert.equal(report.results.length, 18);
  assert.equal(report.results.filter(({ status }) => status === 'pass').length, 18);
  assert.ok(report.results.every(({ attempts }) => attempts === 1));
  const screenshots = await Promise.all(report.results.map(async ({ screenshot }) => {
    const path = new URL(`../../${screenshot}`, import.meta.url);
    const bytes = await readFile(path);
    return bytes.toString('base64');
  }));
  assert.equal(new Set(screenshots).size, 18);
});

const assertConstrainedBadge = async (page: Page, address: string, width: number, height: number) => {
  await page.setViewportSize({ width, height });
  await page.goto(`${address}${pagePath}`, { waitUntil: 'networkidle' });
  await page.locator('[data-testid="seat-map-hover-preview"]').waitFor();
  const metrics = await page.locator('[data-testid="seat-map-hover-preview"]').evaluate((preview) => {
    const badge = preview.lastElementChild as HTMLElement;
    const text = badge.firstElementChild as HTMLElement;
    return {
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      previewOverflow: preview.scrollWidth - preview.clientWidth,
      badgeOverflow: badge.scrollWidth - badge.clientWidth,
      badgeWidth: badge.getBoundingClientRect().width,
      previewWidth: preview.getBoundingClientRect().width,
      textDisplay: getComputedStyle(text).display,
      textOverflow: getComputedStyle(text).textOverflow,
      textWhiteSpace: getComputedStyle(text).whiteSpace,
    };
  });
  assert.ok(metrics.documentOverflow <= 2, `${width}px document overflow: ${metrics.documentOverflow}`);
  assert.ok(metrics.previewOverflow <= 2, `${width}px preview overflow: ${metrics.previewOverflow}`);
  assert.ok(metrics.badgeOverflow <= 2, `${width}px badge overflow: ${metrics.badgeOverflow}`);
  assert.ok(metrics.badgeWidth <= metrics.previewWidth * 0.42 + 2, `${width}px badge exceeds max width`);
  assert.equal(metrics.textDisplay, 'block', `${width}px badge text must own a constrained block`);
  assert.equal(metrics.textOverflow, 'ellipsis', `${width}px badge text must truncate`);
  assert.equal(metrics.textWhiteSpace, 'nowrap', `${width}px badge text must not wrap`);
};

test('SeatMapHoverPreview constrains an unbroken badge at mobile widths in a real browser', async () => {
  const resources: { browser?: Browser; server?: ViteDevServer; cacheDir?: string } = {};
  try {
    const started = await startServer();
    resources.server = started.server;
    resources.cacheDir = started.cacheDir;
    resources.browser = await chromium.launch({ headless: true });
    const page = await resources.browser.newPage();
    const address = serverAddress(resources.server);
    await assertConstrainedBadge(page, address, 320, 844);
    await assertConstrainedBadge(page, address, 390, 1000);
  } finally {
    await closeResources(resources);
  }
});

const serverAddress = (server: ViteDevServer) => {
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Vite test server did not expose a TCP address');
  return `http://127.0.0.1:${address.port}`;
};
