import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
const truncateMutation = process.env.SEAT_MAP_HOVER_PREVIEW_MUTATE_TRUNCATE === '1';
const packageMutation = process.env.SEAT_MAP_HOVER_PREVIEW_MUTATE_PACKAGE ?? '';

const componentId = 'src/components/SeatMapHoverPreview.tsx#SeatMapHoverPreview';
const dataStates = [
  'empty',
  'single',
  'partial',
  'null-optional',
  'boundary-minimum',
  'populated',
  'long-korean',
  'unbroken-token',
  'maximum-supported',
] as const;

const expectedScenarioIds = new Set(dataStates.flatMap((data) => ['light', 'dark'].map((theme) => (
  `state:${componentId}:data=${data}|variant.theme=${theme}`
))));

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
    if (!id.split('?')[0].endsWith('/src/components/SeatMapHoverPreview.tsx')) return undefined;
    let transformed = code;
    if (overflowMutation) transformed = transformed.replace('max-w-[42%]', '');
    if (truncateMutation) transformed = transformed.replace(
      /className:\s*["']truncate["'],\s*children:\s*badgeLabel/,
      'children: badgeLabel',
    );
    if (overflowMutation || truncateMutation) {
      assert.notEqual(transformed, code, 'SeatMapHoverPreview mutation target missing');
    }
    if (transformed === code) return undefined;
    return transformed;
  },
  load(id) {
    if (id !== moduleId) return undefined;
    return `
      import React, { createElement } from 'react';
      import { createRoot } from 'react-dom/client';
      import SeatMapHoverPreview from '/src/components/SeatMapHoverPreview.tsx';
      import '/src/index.css';
      import { resolveComponentStateAdapter } from '/src/visual-qa/stateAdapters.ts';
      const query = new URLSearchParams(window.location.search);
      const data = query.get('data') ?? 'unbroken-token';
      const theme = query.get('theme') ?? 'light';
      const result = resolveComponentStateAdapter('seat-map-hover-preview', {
        componentId: '${componentId}',
        states: { data },
        variants: { theme },
      });
      document.documentElement.classList.toggle('dark', result.theme === 'dark');
      createRoot(document.getElementById('root')).render(createElement(
        'div',
        { className: 'w-full p-2', 'data-testid': 'seat-map-hover-preview-theme-host' },
        createElement(SeatMapHoverPreview, result.props),
      ));
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
  if (errors.length > 1) throw new Error(`SeatMapHoverPreview test cleanup failed: ${errors.length}`);
};

test('SeatMapHoverPreview cleanup closes every resource after an earlier closer fails', async () => {
  const calls: string[] = [];
  const cacheDir = await mkdtemp(join(tmpdir(), 'seat-map-hover-preview-cleanup-'));
  await assert.rejects(() => closeResources({
    browser: { close: async () => { calls.push('browser'); throw new Error('browser close'); } } as unknown as Browser,
    server: { close: async () => { calls.push('server'); } } as unknown as ViteDevServer,
    cacheDir,
  }), /browser close/);
  assert.deepEqual(calls, ['browser', 'server']);
  await assert.rejects(() => access(cacheDir));
});

test('SeatMapHoverPreview cleanup removes cache after a server close failure', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'seat-map-hover-preview-cleanup-'));
  await assert.rejects(() => closeResources({
    server: { close: async () => { throw new Error('server close'); } } as unknown as ViteDevServer,
    cacheDir,
  }), /server close/);
  await assert.rejects(() => access(cacheDir));
});

test('SeatMapHoverPreview package gates include the focused test exactly once', async () => {
  const manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8')) as { scripts: Record<string, string> };
  const scripts = { ...manifest.scripts };
  const focusedPath = 'src/components/SeatMapHoverPreview.mobile.test.tsx';
  if (packageMutation === 'omit') scripts['previsual-qa:harness:test'] = (
    scripts['previsual-qa:harness:test'] ?? ''
  ).replace(focusedPath, '');
  if (packageMutation === 'duplicate') scripts['previsual-qa:harness:test'] = (
    scripts['previsual-qa:harness:test'] ?? ''
  ) + ` ${focusedPath}`;

  const unitCommand = scripts['test:unit'] ?? '';
  assert.match(unitCommand, /["']src\/\*\*\/\*\.test\.tsx["']/,
    'test:unit must cover TSX tests through its shared glob');
  assert.equal(
    unitCommand.split(focusedPath).length - 1,
    0,
    'test:unit must not duplicate the focused TSX test outside its shared glob',
  );
  assert.equal(
    (scripts['previsual-qa:harness:test'] ?? '').split(focusedPath).length - 1,
    1,
    'previsual-qa:harness:test exact-once wiring',
  );
});

test('SeatMapHoverPreview persisted evidence has exact scenario identity and PNG hashes', async () => {
  const report = JSON.parse(await readFile(new URL('../../reports/seat-map-hover-preview-component-states.json', import.meta.url), 'utf8')) as {
    pageMode: string;
    viewport: { width: number; height: number };
    captureHeightMode: string;
    screenshots: { directory: string; mode: string };
    summary: { total: number; passed: number; failed: number; recovered: number; ok: boolean };
    results: Array<{ attempts: number; componentId: string; scenarioId: string; screenshot: string; sha256: string; status: string }>;
  };
  assert.deepEqual(report.summary, { total: 18, passed: 18, failed: 0, recovered: 0, ok: true });
  assert.deepEqual(report.viewport, { width: 320, height: 844 });
  assert.equal(report.pageMode, 'fresh');
  assert.equal(report.captureHeightMode, 'expand-tall-flow');
  assert.deepEqual(report.screenshots, { mode: 'captured', directory: 'reports/seat-map-hover-preview-screenshots' });
  assert.equal(report.results.length, 18);
  assert.equal(report.results.filter(({ status }) => status === 'pass').length, 18);
  assert.ok(report.results.every(({ attempts }) => attempts === 1));
  assert.deepEqual(new Set(report.results.map(({ scenarioId }) => scenarioId)), expectedScenarioIds);
  assert.ok(report.results.every((result) => result.componentId === componentId));
  const screenshots = await Promise.all(report.results.map(async ({ screenshot, sha256 }) => {
    assert.ok(screenshot.startsWith(`${report.screenshots.directory}/`), `${screenshot} must stay inside its component directory`);
    const path = new URL(`../../${screenshot}`, import.meta.url);
    const bytes = await readFile(path);
    assert.ok(bytes.byteLength > 0, `${screenshot} must be nonzero`);
    assert.match(sha256, /^[a-f0-9]{64}$/, `${screenshot} must include a SHA-256`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), sha256, `${screenshot} hash`);
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
  assert.equal(metrics.textDisplay, 'block', `${width}px badge text must own a constrained block`);
  assert.equal(metrics.textOverflow, 'ellipsis', `${width}px badge text must truncate`);
  assert.equal(metrics.textWhiteSpace, 'nowrap', `${width}px badge text must not wrap`);
  assert.ok(metrics.documentOverflow <= 2, `${width}px document overflow: ${metrics.documentOverflow}`);
  assert.ok(metrics.previewOverflow <= 2, `${width}px preview overflow: ${metrics.previewOverflow}`);
  assert.ok(metrics.badgeOverflow <= 2, `${width}px badge overflow: ${metrics.badgeOverflow}`);
  assert.ok(metrics.badgeWidth <= metrics.previewWidth * 0.42 + 2, `${width}px badge exceeds max width`);
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
    const externalRequests: string[] = [];
    const harnessOrigin = new URL(address).origin;
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== harnessOrigin) externalRequests.push(request.url());
    });
    await assertConstrainedBadge(page, address, 320, 844);
    await assertConstrainedBadge(page, address, 390, 1000);
    assert.deepEqual(externalRequests, [], 'real leaf browser run must issue zero external requests');
  } finally {
    await closeResources(resources);
  }
});

test('SeatMapHoverPreview renders every adapter-backed semantic state across both themes', async () => {
  const resources: { browser?: Browser; server?: ViteDevServer; cacheDir?: string } = {};
  try {
    const started = await startServer();
    resources.server = started.server;
    resources.cacheDir = started.cacheDir;
    resources.browser = await chromium.launch({ headless: true });
    const page = await resources.browser.newPage();
    const address = serverAddress(resources.server);
    const externalRequests: string[] = [];
    const themeBackgrounds = new Map<string, string>();
    const harnessOrigin = new URL(address).origin;
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== harnessOrigin) externalRequests.push(request.url());
    });

    for (const data of dataStates) {
      for (const theme of ['light', 'dark'] as const) {
        await page.setViewportSize({ width: 320, height: 844 });
        await page.goto(`${address}${pagePath}?data=${data}&theme=${theme}`, { waitUntil: 'networkidle' });
        const metrics = await page.locator('[data-testid="seat-map-hover-preview"]').evaluate((preview) => {
          const elements = [...preview.querySelectorAll<HTMLElement>('strong, p, span')];
          const badge = preview.lastElementChild as HTMLElement | null;
          const badgeText = badge?.firstElementChild as HTMLElement | null;
          const rect = preview.getBoundingClientRect();
          return {
            badgeBackgroundColor: badge ? getComputedStyle(badge).backgroundColor : null,
            badgePresent: badge?.classList.contains('inline-flex') ?? false,
            badgeText: badgeText?.textContent,
            badgeTextOverflow: badgeText ? getComputedStyle(badgeText).textOverflow : null,
            badgeTextWhiteSpace: badgeText ? getComputedStyle(badgeText).whiteSpace : null,
            backgroundColor: getComputedStyle(preview).backgroundColor,
            borderColor: getComputedStyle(preview).borderColor,
            componentOverflow: preview.scrollWidth - preview.clientWidth,
            documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            dotBackgroundColor: getComputedStyle(preview.querySelector('span') as HTMLElement).backgroundColor,
            height: rect.height,
            paragraphs: [...preview.querySelectorAll('p')].map((paragraph) => paragraph.textContent),
            textBounds: elements.map((element) => {
              const textRect = element.getBoundingClientRect();
              return { left: textRect.left, right: textRect.right };
            }),
            previewLeft: rect.left,
            previewRight: rect.right,
            themeClass: document.documentElement.classList.contains('dark'),
            title: preview.querySelector('strong')?.textContent,
            subtitle: preview.querySelector('p')?.textContent,
          };
        });
        assert.ok(metrics.documentOverflow <= 2, `${data}/${theme} document overflow`);
        assert.ok(metrics.componentOverflow <= 2, `${data}/${theme} component overflow`);
        assert.ok(metrics.textBounds.every(({ left, right }) => left >= metrics.previewLeft - 2 && right <= metrics.previewRight + 2), `${data}/${theme} text bounds`);
        assert.equal(metrics.themeClass, theme === 'dark', `${data}/${theme} dark class`);
        themeBackgrounds.set(`${data}/${theme}`, metrics.backgroundColor);
        if (data === 'empty') {
          assert.equal(metrics.badgePresent, false, `${data}/${theme} hides badge`);
          assert.equal(metrics.title, '구역 정보');
          assert.equal(metrics.subtitle, '좌석도 정보');
          assert.equal(metrics.dotBackgroundColor, 'rgb(148, 163, 184)');
          assert.ok(metrics.height >= 76, `${data}/${theme} preserves placeholder`);
        } else {
          assert.ok(metrics.height >= 76, `${data}/${theme} preserves minimum height`);
          assert.equal(metrics.dotBackgroundColor, data === 'maximum-supported' ? 'rgb(124, 58, 237)' : 'rgb(37, 99, 235)');
        }
        if (data === 'single') {
          assert.equal(metrics.title, '중앙 내야 구역');
          assert.deepEqual(metrics.paragraphs, ['좌석 구역']);
        }
        if (data === 'partial') {
          assert.equal(metrics.title, '구역 정보');
          assert.deepEqual(metrics.paragraphs, ['모바일 좌석 안내']);
        }
        if (data === 'null-optional') {
          assert.equal(metrics.title, '구역 정보');
          assert.deepEqual(metrics.paragraphs, ['관람 위치와 이동 경로를 확인하세요.']);
        }
        if (data === 'boundary-minimum') assert.equal(metrics.badgeText, '잔여 좌석');
        if (data === 'populated') {
          assert.equal(metrics.badgeText, '잔여 12석');
          assert.deepEqual(metrics.paragraphs, ['1루 응원석', '가까운 출입구를 이용하세요.']);
          assert.equal(metrics.borderColor, 'rgb(37, 99, 235)');
          assert.equal(metrics.badgeBackgroundColor, 'rgb(37, 99, 235)');
        }
        if (data === 'long-korean') {
          assert.equal(metrics.badgeText, '긴 한국어 배지 안내 문구');
          assert.match(metrics.title ?? '', /긴 한국어 좌석 구역 제목/);
          assert.equal(metrics.paragraphs.length, 2);
        }
        if (data === 'unbroken-token') {
          assert.equal(metrics.badgeText, 'SEATMAPUNBROKENBADGE0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
          assert.equal(metrics.badgeTextOverflow, 'ellipsis');
          assert.equal(metrics.badgeTextWhiteSpace, 'nowrap');
        }
        if (data === 'maximum-supported') {
          assert.equal(metrics.badgeText, '특별');
          assert.equal(metrics.borderColor, 'rgb(124, 58, 237)');
          assert.equal(metrics.badgeBackgroundColor, 'rgb(124, 58, 237)');
        }
      }
    }
    for (const data of dataStates) {
      assert.notEqual(themeBackgrounds.get(`${data}/light`), themeBackgrounds.get(`${data}/dark`), `${data} changes computed surface for dark theme`);
    }
    assert.deepEqual(externalRequests, [], 'matrix must issue zero external requests');
  } finally {
    await closeResources(resources);
  }
});

const serverAddress = (server: ViteDevServer) => {
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Vite test server did not expose a TCP address');
  return `http://127.0.0.1:${address.port}`;
};
