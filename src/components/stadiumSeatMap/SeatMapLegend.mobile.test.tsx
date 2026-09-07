import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { chromium, type Browser } from 'playwright';
import { createServer, type Plugin, type ViteDevServer } from 'vite';

const pagePath = '/__seat-map-legend-test.html';
const entryPath = '/__seat-map-legend-test.tsx';
const moduleId = '\0virtual:seat-map-legend-test';
const overflowMutation = process.env.SEAT_MAP_LEGEND_MUTATE_OVERFLOW === '1';

const categories = {
  alpha: { label: '합성 일반석', light: '#16a34a', dark: '#86efac' },
  beta: { label: '합성 응원석', light: '#ea580c', dark: '#fdba74' },
  gamma: { label: '합성 테이블석', light: '#7c3aed', dark: '#c4b5fd' },
  delta: { label: '합성 가족석', light: '#be123c', dark: '#fda4af' },
  long: { label: '합성 모바일 긴 이름 좌석 구역 안내', light: '#2563eb', dark: '#93c5fd' },
  token: {
    label: 'SEATMAPLEGENDUNBROKENTOKEN0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    light: '#0f766e',
    dark: '#5eead4',
  },
  epsilon: { label: '합성 외야 지정석', light: '#ca8a04', dark: '#fde047' },
  zeta: { label: '합성 스카이박스', light: '#0369a1', dark: '#7dd3fc' },
} as const;

const createLegendPlugin = (): Plugin => ({
  name: 'seat-map-legend-actual-browser-test',
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
    if (!id.split('?')[0].endsWith('/src/components/stadiumSeatMap/SeatMapLegend.tsx')) return undefined;
    const afterMaxWidth = overflowMutation
      ? code.replace('max-w-full ', '')
      : code;
    if (overflowMutation) {
      assert.notEqual(afterMaxWidth, code, 'SeatMapLegend max-w-full mutation target missing');
    }
    const transformed = overflowMutation
      ? afterMaxWidth.replace('break-all ', '')
      : code;
    if (overflowMutation) {
      assert.notEqual(transformed, afterMaxWidth, 'SeatMapLegend break-all mutation target missing');
      assert.equal(transformed.includes('max-w-full'), false);
      assert.equal(transformed.includes('break-all'), false);
    }
    return transformed === code ? undefined : transformed;
  },
  load(id) {
    if (id !== moduleId) return undefined;
    return `
      import React, { createElement } from 'react';
      import { createRoot } from 'react-dom/client';
      import { SeatMapLegend } from '/src/components/stadiumSeatMap/SeatMapLegend.tsx';
      import { resolveComponentStateAdapter } from '/src/visual-qa/stateAdapters.ts';
      import '/src/index.css';
      const query = new URLSearchParams(window.location.search);
      const dataValues = ['empty', 'single', 'null-optional', 'populated', 'long-korean', 'unbroken-token', 'maximum-supported'];
      const requestedData = query.get('data');
      if (requestedData !== null && !dataValues.includes(requestedData)) {
        throw new Error('Unsupported SeatMapLegend data state: ' + requestedData);
      }
      const data = requestedData ?? 'empty';
      const mode = query.get('theme') === 'dark' ? 'dark' : 'light';
      const resolved = resolveComponentStateAdapter('seat-map-legend', {
        componentId: 'src/components/stadiumSeatMap/SeatMapLegend.tsx#SeatMapLegend',
        states: { data },
        variants: { theme: mode },
      });
      document.documentElement.classList.toggle('dark', mode === 'dark');
      createRoot(document.getElementById('root')).render(createElement(
        'div', {
          className: 'w-full p-2',
          'data-testid': 'seat-map-legend-theme-host',
          'data-mode': resolved.props.mode,
        },
        createElement(SeatMapLegend, resolved.props),
      ));
    `;
  },
});

const startServer = async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'seat-map-legend-vite-'));
  const server = await createServer({
    root: process.cwd(),
    appType: 'custom',
    cacheDir,
    plugins: [createLegendPlugin()],
    server: { host: '127.0.0.1', port: 0 },
  });
  await server.listen();
  return { cacheDir, server };
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
  if (errors.length > 1) throw new Error(`SeatMapLegend test cleanup failed: ${errors.length}`);
};

test('SeatMapLegend cleanup closes every resource after an earlier closer fails', async () => {
  const calls: string[] = [];
  const cacheDir = await mkdtemp(join(tmpdir(), 'seat-map-legend-cleanup-'));
  await assert.rejects(() => closeResources({
    browser: { close: async () => { calls.push('browser'); throw new Error('browser close'); } } as unknown as Browser,
    server: { close: async () => { calls.push('server'); } } as unknown as ViteDevServer,
    cacheDir,
  }), /browser close/);
  assert.deepEqual(calls, ['browser', 'server']);
  await assert.rejects(() => access(cacheDir));
});

test('SeatMapLegend cleanup removes cache after a server close failure', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'seat-map-legend-cleanup-'));
  await assert.rejects(() => closeResources({
    server: { close: async () => { throw new Error('server close'); } } as unknown as ViteDevServer,
    cacheDir,
  }), /server close/);
  await assert.rejects(() => access(cacheDir));
});

test('SeatMapLegend renders all synthetic data and theme states without mobile overflow', async () => {
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
    const dataStates = [
      'empty',
      'single',
      'null-optional',
      'populated',
      'long-korean',
      'unbroken-token',
      'maximum-supported',
    ] as const;
    const themes = ['light', 'dark'] as const;
    const scenarioPairs = dataStates.flatMap((data) => themes.map((theme) => ({ data, theme })));
    assert.equal(scenarioPairs.length, 14);
    assert.equal(new Set(scenarioPairs.map(({ data, theme }) => `${data}|${theme}`)).size, 14);
    const expectedRenderedIds = {
      empty: [],
      single: ['alpha'],
      'null-optional': ['beta'],
      populated: ['alpha', 'beta', 'gamma'],
      'long-korean': ['long', 'beta', 'gamma'],
      'unbroken-token': ['token', 'alpha'],
      'maximum-supported': ['alpha', 'beta', 'gamma', 'delta', 'long', 'token', 'epsilon', 'zeta'],
    } as const;
    for (const [width, height] of [[320, 844], [390, 1000]] as const) {
      await page.setViewportSize({ width, height });
      for (const { data, theme } of scenarioPairs) {
        await page.goto(`${address}${pagePath}?data=${data}&theme=${theme}`, { waitUntil: 'networkidle' });
        const renderedIds = expectedRenderedIds[data];
        const expectedPills = renderedIds.map((id) => ({
          label: categories[id].label,
          color: categories[id][theme],
        }));
        const metrics = await page.locator('[data-testid="seat-map-legend-theme-host"]').evaluate(
          (host, expected) => {
            const legend = host.firstElementChild as HTMLElement;
            const pills = [...legend.querySelectorAll<HTMLElement>(':scope > span')];
            const hostRect = host.getBoundingClientRect();
            const legendRect = legend.getBoundingClientRect();
            const expectedColors = new Map<string, string>();
            for (const { label, color } of expected.expectedPills) {
              const probe = document.createElement('span');
              probe.style.backgroundColor = color;
              document.body.appendChild(probe);
              const normalized = getComputedStyle(probe).backgroundColor;
              probe.remove();
              expectedColors.set(label, normalized);
            }
            return {
              documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              viewportWidth: document.documentElement.clientWidth,
              hostOverflow: host.scrollWidth - host.clientWidth,
              legendOverflow: legend.scrollWidth - legend.clientWidth,
              hostBounds: { left: hostRect.left, right: hostRect.right },
              legendBounds: { left: legendRect.left, right: legendRect.right },
              hostMode: (host as HTMLElement).dataset.mode,
              documentIsDark: document.documentElement.classList.contains('dark'),
              flexWrap: getComputedStyle(legend).flexWrap,
              pills: pills.map((pill) => {
                const rect = pill.getBoundingClientRect();
                const label = pill.textContent?.trim() ?? '';
                const dot = pill.firstElementChild as HTMLElement | null;
                return {
                  label,
                  overflow: pill.scrollWidth - pill.clientWidth,
                  left: rect.left,
                  right: rect.right,
                  top: rect.top,
                  dotColor: dot ? getComputedStyle(dot).backgroundColor : '',
                  expectedDotColor: expectedColors.get(label),
                };
              }),
            };
          },
          { expectedPills },
        );
        const context = `${width}x${height} ${data}/${theme}`;
        assert.equal(metrics.pills.length, expectedPills.length, `${context} rendered pill count`);
        assert.ok(metrics.documentOverflow <= 2, `${context} document overflow: ${metrics.documentOverflow}`);
        assert.ok(metrics.hostOverflow <= 2, `${context} host overflow: ${metrics.hostOverflow}`);
        assert.ok(metrics.legendOverflow <= 2, `${context} legend overflow: ${metrics.legendOverflow}`);
        assert.ok(
          metrics.hostBounds.left >= -2 && metrics.hostBounds.right <= metrics.viewportWidth + 2,
          `${context} host bounds`,
        );
        assert.ok(
          metrics.legendBounds.left >= metrics.hostBounds.left - 2
            && metrics.legendBounds.right <= metrics.hostBounds.right + 2,
          `${context} legend bounds`,
        );
        assert.ok(metrics.pills.every(({ overflow }) => overflow <= 2), `${context} pill content overflow`);
        assert.ok(
          metrics.pills.every(({ left, right }) => (
            left >= metrics.legendBounds.left - 2 && right <= metrics.legendBounds.right + 2
          )),
          `${context} pill bounds`,
        );
        assert.deepEqual(metrics.pills.map(({ label }) => label), expectedPills.map(({ label }) => label));
        assert.ok(
          metrics.pills.every(({ dotColor, expectedDotColor }) => dotColor === expectedDotColor),
          `${context} themed dot colors`,
        );
        assert.equal(metrics.documentIsDark, theme === 'dark', `${context} document dark class`);
        assert.equal(metrics.hostMode, theme, `${context} resolved mode`);
        if (data === 'null-optional') {
          assert.equal(metrics.pills.some(({ label }) => label === 'missing'), false);
          assert.equal(metrics.pills.some(({ label }) => label === categories.beta.label), true);
        }
        if (data === 'maximum-supported') {
          assert.equal(metrics.flexWrap, 'wrap');
          assert.ok(new Set(metrics.pills.map(({ top }) => Math.round(top * 100) / 100)).size > 1, `${context} vertical growth`);
        }
        if (data === 'long-korean') {
          assert.equal(metrics.pills.some(({ label }) => label === categories.long.label), true);
        }
        if (data === 'unbroken-token') {
          assert.equal(metrics.pills.some(({ label }) => label === categories.token.label), true);
        }
      }
    }
    assert.deepEqual(externalRequests, [], 'real leaf browser run must issue zero external requests');
  } finally {
    await closeResources(resources);
  }
});

const serverAddress = (server: ViteDevServer) => {
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Vite test server did not expose a TCP address');
  return `http://127.0.0.1:${address.port}`;
};

test('SeatMapLegend browser test is wired exactly once into both visual-QA gates', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const testPath = 'src/components/stadiumSeatMap/SeatMapLegend.mobile.test.tsx';
  const scripts = packageJson.scripts ?? {};
  const assertPackageCoverage = (candidateScripts: Record<string, string>) => {
    const unitScript = candidateScripts['test:unit'] ?? '';
    const preHarnessScript = candidateScripts['previsual-qa:harness:test'] ?? '';
    const harnessScript = candidateScripts['visual-qa:harness:test'] ?? '';
    assert.match(unitScript, /["']src\/\*\*\/\*\.test\.tsx["']/, 'test:unit must cover the shared TSX test glob');
    assert.equal(unitScript.split(testPath).length - 1, 0, 'test:unit must rely on its shared TSX glob without a duplicate direct entry');
    assert.equal(preHarnessScript.split(testPath).length - 1, 1, 'previsual-qa:harness:test must include the focused browser test exactly once');
    assert.equal(harnessScript.split(testPath).length - 1, 0, 'visual-qa:harness:test must not duplicate the pre-harness browser test');
  };
  assertPackageCoverage(scripts);
  assert.throws(
    () => assertPackageCoverage({ ...scripts, 'previsual-qa:harness:test': (scripts['previsual-qa:harness:test'] ?? '').replace(testPath, '') }),
    /previsual-qa:harness:test must include the focused browser test exactly once/,
  );
  assert.throws(
    () => assertPackageCoverage({ ...scripts, 'previsual-qa:harness:test': `${scripts['previsual-qa:harness:test'] ?? ''} ${testPath}` }),
    /previsual-qa:harness:test must include the focused browser test exactly once/,
  );
});

test('SeatMapLegend component-state evidence is complete and content-addressed', async () => {
  const report = JSON.parse(
    await readFile(new URL('../../../reports/seat-map-legend-component-states.json', import.meta.url), 'utf8'),
  ) as {
    pageMode?: string;
    captureHeightMode?: string;
    viewport?: { width?: number; height?: number };
    screenshots?: { mode?: string; directory?: string };
    summary?: { total?: number; passed?: number; failed?: number; recovered?: number; ok?: boolean };
    results?: Array<{
      scenarioId?: string;
      componentId?: string;
      status?: string;
      screenshot?: string;
      attempts?: number;
      sha256?: string;
    }>;
  };
  const componentId = 'src/components/stadiumSeatMap/SeatMapLegend.tsx#SeatMapLegend';
  const dataStates = [
    'empty',
    'single',
    'null-optional',
    'populated',
    'long-korean',
    'unbroken-token',
    'maximum-supported',
  ] as const;
  const expectedScenarioIds = new Set(dataStates.flatMap((data) => [
    `state:${componentId}:data=${data}|variant.theme=light`,
    `state:${componentId}:data=${data}|variant.theme=dark`,
  ]));

  assert.equal(report.pageMode, 'fresh');
  assert.equal(report.captureHeightMode, 'expand-tall-flow');
  assert.deepEqual(report.viewport, { width: 320, height: 844 });
  assert.deepEqual(report.screenshots, {
    mode: 'captured',
    directory: 'reports/seat-map-legend-screenshots',
  });
  assert.deepEqual(report.summary, { total: 14, passed: 14, failed: 0, recovered: 0, ok: true });
  assert.equal(report.results?.length, 14);
  const results = report.results ?? [];
  assert.deepEqual(
    new Set(results.map(({ scenarioId }) => scenarioId)),
    expectedScenarioIds,
  );

  const screenshotPaths = new Set<string>();
  const screenshotDirectoryUrl = new URL('../../../reports/seat-map-legend-screenshots/', import.meta.url);
  for (const result of results) {
    assert.equal(result.componentId, componentId);
    assert.equal(result.status, 'pass');
    assert.equal(result.attempts, 1);
    assert.equal(typeof result.screenshot, 'string');
    assert.match(result.screenshot ?? '', /^reports\/seat-map-legend-screenshots\/[^/]+\.png$/);
    screenshotPaths.add(result.screenshot ?? '');
    const screenshotUrl = new URL(`../../../${result.screenshot}`, import.meta.url);
    assert.equal(screenshotUrl.href.startsWith(screenshotDirectoryUrl.href), true);
    const png = await readFile(screenshotUrl);
    assert.ok(png.byteLength > 0, `${result.scenarioId} screenshot must be nonempty`);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.match(result.sha256 ?? '', /^[a-f0-9]{64}$/);
    assert.equal(createHash('sha256').update(png).digest('hex'), result.sha256);
  }
  assert.equal(screenshotPaths.size, 14);
});
