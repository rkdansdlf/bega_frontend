import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { chromium, type Browser } from 'playwright';
import { createServer, type Plugin, type ViteDevServer } from 'vite';

const componentId = 'src/components/stadiumSeatMap/SeatMapRuntimeShell.tsx#SeatMapRuntimeShell';
const pagePath = '/__seat-map-runtime-shell-test.html';
const entryPath = '/__seat-map-runtime-shell-test.tsx';
const moduleId = '\0virtual:seat-map-runtime-shell-test';
const overflowMutation = process.env.SEAT_MAP_RUNTIME_SHELL_MUTATE_OVERFLOW === '1';

const dataStates = [
  'empty',
  'populated',
  'null-optional',
  'long-korean',
  'unbroken-token',
  'maximum-supported',
] as const;
const systemStates = ['idle', 'loading', 'error-503'] as const;
const geometries = ['coordinate', 'non-coordinate'] as const;
const themes = ['light', 'dark'] as const;

const createRuntimeShellPlugin = (): Plugin => ({
  name: 'seat-map-runtime-shell-actual-browser-test',
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
    if (!id.split('?')[0].endsWith('/src/components/StadiumSeatMapStates.tsx')) return undefined;
    if (!overflowMutation) return undefined;
    const withoutWidthContainment = code.replace('max-w-full break-words ', '');
    assert.notEqual(withoutWidthContainment, code, 'SeatMapRuntimeShell max-width mutation target missing');
    const transformed = withoutWidthContainment.replace(' [overflow-wrap:anywhere]', '');
    assert.notEqual(transformed, withoutWidthContainment, 'SeatMapRuntimeShell wrapping mutation target missing');
    return transformed;
  },
  load(id) {
    if (id !== moduleId) return undefined;
    return `
      import React, { createElement } from 'react';
      import { createRoot } from 'react-dom/client';
      import { SeatMapRuntimeShell } from '/src/components/stadiumSeatMap/SeatMapRuntimeShell.tsx';
      import '/src/index.css';

      const query = new URLSearchParams(window.location.search);
      const dataValues = ${JSON.stringify(dataStates)};
      const systemValues = ${JSON.stringify(systemStates)};
      const geometryValues = ${JSON.stringify(geometries)};
      const requestedData = query.get('data');
      const requestedSystem = query.get('system');
      const requestedGeometry = query.get('geometry');
      if (!dataValues.includes(requestedData)) throw new Error('Unsupported SeatMapRuntimeShell data: ' + requestedData);
      if (!systemValues.includes(requestedSystem)) throw new Error('Unsupported SeatMapRuntimeShell system: ' + requestedSystem);
      if (!geometryValues.includes(requestedGeometry)) throw new Error('Unsupported SeatMapRuntimeShell geometry: ' + requestedGeometry);
      const theme = query.get('theme') === 'dark' ? 'dark' : 'light';
      const retryMode = query.get('retry') === '1';
      const unbroken = 'SEATMAPRUNTIMESHELL' + 'X'.repeat(220);
      const maximum = '최대지원좌석도상태'.repeat(48) + unbroken;
      const presets = {
        empty: { badgeLabel: '', stadiumName: undefined, child: '' },
        populated: { badgeLabel: '합성 공식 좌석도', stadiumName: '합성 테스트 구장', child: '합성 좌석도 콘텐츠' },
        'null-optional': { badgeLabel: '합성 공식 좌석도', stadiumName: null, child: '선택한 구장 좌석도' },
        'long-korean': {
          badgeLabel: '모바일에서 여러 줄과 잘림 상태를 확인하는 합성 공식 좌석도 안내',
          stadiumName: '모바일 화면에서 자연스럽게 줄바꿈되어야 하는 매우 긴 합성 테스트 구장 이름',
          child: '모바일 화면에서 자식 좌석도 콘텐츠가 자연스럽게 여러 줄로 표시되는지 확인합니다.',
        },
        'unbroken-token': { badgeLabel: unbroken, stadiumName: unbroken, child: unbroken },
        'maximum-supported': { badgeLabel: maximum, stadiumName: maximum, child: maximum },
      };
      const preset = presets[requestedData];
      const pending = new Promise(() => {});
      let shouldThrow = requestedSystem === 'error-503';

      function RuntimeChild() {
        if (requestedSystem === 'loading') throw pending;
        if (requestedSystem === 'error-503' && shouldThrow) {
          throw new Error('Synthetic SeatMapRuntimeShell render failure');
        }
        return createElement('div', {
          className: 'min-w-0 max-w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-900 [overflow-wrap:anywhere] dark:border-slate-700 dark:bg-slate-900 dark:text-white',
          'data-testid': retryMode ? 'seat-map-runtime-recovered' : 'seat-map-runtime-resolved',
        }, preset.child);
      }

      document.documentElement.classList.toggle('dark', theme === 'dark');
      const root = document.getElementById('root');
      if (retryMode) {
        root.addEventListener('click', (event) => {
          if (event.target instanceof Element && event.target.closest('button')) shouldThrow = false;
        }, true);
      }
      createRoot(root).render(createElement(
        'div',
        {
          className: 'w-full min-w-0 p-2',
          'data-testid': 'seat-map-runtime-host',
          'data-theme': theme,
        },
        createElement(SeatMapRuntimeShell, {
          template: 'standard',
          usesCoordinateGeometry: requestedGeometry === 'coordinate',
          badgeLabel: preset.badgeLabel,
          stadiumName: preset.stadiumName,
          resetKey: requestedGeometry + ':' + requestedData + ':' + requestedSystem,
        }, createElement(RuntimeChild)),
      ));
    `;
  },
});

const startServer = async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'seat-map-runtime-shell-vite-'));
  const server = await createServer({
    root: process.cwd(),
    appType: 'custom',
    cacheDir,
    plugins: [createRuntimeShellPlugin()],
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
  if (errors.length > 1) throw new Error(`SeatMapRuntimeShell test cleanup failed: ${errors.length}`);
};

const serverAddress = (server: ViteDevServer) => {
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Vite test server did not expose a TCP address');
  return `http://127.0.0.1:${address.port}`;
};

test('SeatMapRuntimeShell cleanup closes every resource after an earlier closer fails', async () => {
  const calls: string[] = [];
  const cacheDir = await mkdtemp(join(tmpdir(), 'seat-map-runtime-shell-cleanup-'));
  await assert.rejects(() => closeResources({
    browser: { close: async () => { calls.push('browser'); throw new Error('browser close'); } } as unknown as Browser,
    server: { close: async () => { calls.push('server'); } } as unknown as ViteDevServer,
    cacheDir,
  }), /browser close/);
  assert.deepEqual(calls, ['browser', 'server']);
  await assert.rejects(() => access(cacheDir));
});

test('SeatMapRuntimeShell cleanup removes cache after a server close failure', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'seat-map-runtime-shell-cleanup-'));
  await assert.rejects(() => closeResources({
    server: { close: async () => { throw new Error('server close'); } } as unknown as ViteDevServer,
    cacheDir,
  }), /server close/);
  await assert.rejects(() => access(cacheDir));
});

test('SeatMapRuntimeShell contains every synthetic runtime state at mobile widths and recovers on retry', async () => {
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
    const scenarios = dataStates.flatMap((data) => (
      systemStates.flatMap((system) => (
        geometries.flatMap((geometry) => themes.map((theme) => ({ data, system, geometry, theme })))
      ))
    ));
    assert.equal(scenarios.length, 72);
    assert.equal(new Set(scenarios.map(({ data, system, geometry, theme }) => (
      `${data}|${system}|${geometry}|${theme}`
    ))).size, 72);

    for (const [width, height] of [[320, 844], [390, 1000]] as const) {
      await page.setViewportSize({ width, height });
      for (const scenario of scenarios) {
        const query = new URLSearchParams(scenario);
        await page.goto(`${address}${pagePath}?${query}`, { waitUntil: 'domcontentloaded' });
        const activeSelector = scenario.system === 'loading'
          ? '[data-testid="stadium-seatmap-loading"]'
          : scenario.system === 'error-503'
            ? '[data-testid="stadium-seatmap-error"]'
            : '[data-testid="seat-map-runtime-resolved"]';
        const active = page.locator(activeSelector);
        await active.waitFor({ state: 'visible' });
        const metrics = await page.locator('[data-testid="seat-map-runtime-host"]').evaluate((host, selector) => {
          const surface = host.querySelector<HTMLElement>(selector);
          if (!surface) throw new Error(`SeatMapRuntimeShell surface missing: ${selector}`);
          const hostRect = host.getBoundingClientRect();
          const surfaceRect = surface.getBoundingClientRect();
          const visibleElements = [surface, ...surface.querySelectorAll<HTMLElement>('*')].filter((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          });
          return {
            documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            viewportWidth: document.documentElement.clientWidth,
            hostOverflow: host.scrollWidth - host.clientWidth,
            surfaceOverflow: surface.scrollWidth - surface.clientWidth,
            hostBounds: { left: hostRect.left, right: hostRect.right },
            surfaceBounds: { left: surfaceRect.left, right: surfaceRect.right },
            outOfBounds: visibleElements.filter((element) => {
              const rect = element.getBoundingClientRect();
              return rect.left < hostRect.left - 2 || rect.right > hostRect.right + 2;
            }).map((element) => ({
              tag: element.tagName,
              testId: element.dataset.testid ?? null,
              text: element.textContent?.slice(0, 80) ?? '',
            })),
            contentOverflow: visibleElements.filter((element) => {
              const style = getComputedStyle(element);
              return element.scrollWidth - element.clientWidth > 2
                && !['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX);
            }).map((element) => ({
              tag: element.tagName,
              testId: element.dataset.testid ?? null,
              overflow: element.scrollWidth - element.clientWidth,
            })),
            text: surface.textContent ?? '',
            role: surface.getAttribute('role'),
            theme: (host as HTMLElement).dataset.theme,
            documentIsDark: document.documentElement.classList.contains('dark'),
          };
        }, activeSelector);
        const context = `${width}x${height} ${scenario.data}/${scenario.system}/${scenario.geometry}/${scenario.theme}`;
        assert.ok(
          metrics.documentOverflow <= 2,
          `${context} document overflow: ${metrics.documentOverflow}; `
            + `outOfBounds=${JSON.stringify(metrics.outOfBounds)}; `
            + `contentOverflow=${JSON.stringify(metrics.contentOverflow)}`,
        );
        assert.ok(metrics.hostOverflow <= 2, `${context} host overflow: ${metrics.hostOverflow}`);
        assert.ok(metrics.surfaceOverflow <= 2, `${context} surface overflow: ${metrics.surfaceOverflow}`);
        assert.ok(
          metrics.hostBounds.left >= -2 && metrics.hostBounds.right <= metrics.viewportWidth + 2,
          `${context} host bounds`,
        );
        assert.ok(
          metrics.surfaceBounds.left >= metrics.hostBounds.left - 2
            && metrics.surfaceBounds.right <= metrics.hostBounds.right + 2,
          `${context} surface bounds`,
        );
        assert.deepEqual(metrics.outOfBounds, [], `${context} descendant bounds`);
        assert.deepEqual(metrics.contentOverflow, [], `${context} descendant content overflow`);
        assert.equal(metrics.theme, scenario.theme, `${context} host theme`);
        assert.equal(metrics.documentIsDark, scenario.theme === 'dark', `${context} document dark class`);
        if (scenario.system === 'loading') assert.equal(metrics.role, 'status', `${context} loading role`);
        if (scenario.system === 'error-503') assert.equal(metrics.role, 'alert', `${context} error role`);
        if (scenario.data === 'unbroken-token') assert.match(metrics.text, /SEATMAPRUNTIMESHELLX{20}/);
        if (scenario.data === 'maximum-supported') assert.match(metrics.text, /최대지원좌석도상태/);
        if ((scenario.data === 'empty' || scenario.data === 'null-optional') && scenario.system !== 'idle') {
          assert.match(metrics.text, /선택한 구장/);
        }
      }
    }

    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(
      `${address}${pagePath}?data=unbroken-token&system=error-503&geometry=coordinate&theme=dark&retry=1`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.locator('[data-testid="stadium-seatmap-error"] button').click();
    await page.locator('[data-testid="seat-map-runtime-recovered"]').waitFor({ state: 'visible' });
    assert.deepEqual(externalRequests, [], 'real runtime-shell browser run must issue zero external requests');
  } finally {
    await closeResources(resources);
  }
});

test('SeatMapRuntimeShell browser test is wired exactly once into both visual-QA gates', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const testPath = 'src/components/stadiumSeatMap/SeatMapRuntimeShell.mobile.test.tsx';
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
    () => assertPackageCoverage({
      ...scripts,
      'previsual-qa:harness:test': (scripts['previsual-qa:harness:test'] ?? '').replace(testPath, ''),
    }),
    /previsual-qa:harness:test must include the focused browser test exactly once/,
  );
  assert.throws(
    () => assertPackageCoverage({
      ...scripts,
      'previsual-qa:harness:test': `${scripts['previsual-qa:harness:test'] ?? ''} ${testPath}`,
    }),
    /previsual-qa:harness:test must include the focused browser test exactly once/,
  );
});

test('SeatMapRuntimeShell component-state evidence is complete and content-addressed', async () => {
  const report = JSON.parse(
    await readFile(new URL('../../../reports/seat-map-runtime-shell-component-states.json', import.meta.url), 'utf8'),
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
  const expectedScenarioIds = new Set(dataStates.flatMap((data) => (
    systemStates.flatMap((system) => geometries.flatMap((geometry) => themes.map((theme) => (
      `state:${componentId}:data=${data}|system=${system}|variant.geometry=${geometry}|variant.theme=${theme}`
    ))))
  )));

  assert.equal(report.pageMode, 'fresh');
  assert.equal(report.captureHeightMode, 'expand-tall-flow');
  assert.deepEqual(report.viewport, { width: 320, height: 844 });
  assert.deepEqual(report.screenshots, {
    mode: 'captured',
    directory: 'reports/seat-map-runtime-shell-screenshots',
  });
  assert.deepEqual(report.summary, { total: 72, passed: 72, failed: 0, recovered: 0, ok: true });
  assert.equal(report.results?.length, 72);
  const results = report.results ?? [];
  assert.deepEqual(new Set(results.map(({ scenarioId }) => scenarioId)), expectedScenarioIds);

  const screenshotPaths = new Set<string>();
  const screenshotDirectoryUrl = new URL('../../../reports/seat-map-runtime-shell-screenshots/', import.meta.url);
  for (const result of results) {
    assert.equal(result.componentId, componentId);
    assert.equal(result.status, 'pass');
    assert.equal(result.attempts, 1);
    assert.equal(typeof result.screenshot, 'string');
    assert.match(result.screenshot ?? '', /^reports\/seat-map-runtime-shell-screenshots\/[^/]+\.png$/);
    screenshotPaths.add(result.screenshot ?? '');
    const screenshotUrl = new URL(`../../../${result.screenshot}`, import.meta.url);
    assert.equal(screenshotUrl.href.startsWith(screenshotDirectoryUrl.href), true);
    const png = await readFile(screenshotUrl);
    assert.ok(png.byteLength > 0, `${result.scenarioId} screenshot must be nonempty`);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.match(result.sha256 ?? '', /^[a-f0-9]{64}$/);
    assert.equal(createHash('sha256').update(png).digest('hex'), result.sha256);
  }
  assert.equal(screenshotPaths.size, 72);
});
