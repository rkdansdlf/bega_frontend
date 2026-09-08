import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type Plugin, type ViteDevServer } from 'vite';

const componentId = 'src/components/stadiumSeatMap/SeatMapTemplateShell.tsx#SeatMapTemplateShell';
const pagePath = '/__seat-map-template-shell-test.html';
const entryPath = '/__seat-map-template-shell-test.tsx';
const moduleId = '\0virtual:seat-map-template-shell-test';
const overflowMutation = process.env.SEAT_MAP_TEMPLATE_SHELL_MUTATE_OVERFLOW === '1';

const genericCompositions = [
  'base',
  'optional-populated',
  'null-optional',
  'filter-fallback',
  'filter-override',
  'auxiliary-guide',
  'toast',
  'fullscreen',
  'fullscreen-toast',
] as const;
const mobileCompositions = [
  'mobile-secondary',
  'mobile-legacy-side',
  'mobile-bottom-sheet',
  'mobile-side-reserve',
] as const;
const desktopCompositions = ['desktop-secondary', 'desktop-side', 'desktop-both'] as const;
const pressures = ['default', 'long-korean', 'unbroken-token', 'maximum-supported'] as const;
const themes = ['light', 'dark'] as const;
const layouts = ['mobile', 'desktop'] as const;
const interactions = ['default', 'focus-visible', 'selected'] as const;

type Composition = typeof genericCompositions[number]
  | typeof mobileCompositions[number]
  | typeof desktopCompositions[number];
type Layout = typeof layouts[number];
type Pressure = typeof pressures[number];
type Theme = typeof themes[number];
type Interaction = typeof interactions[number];
type Scenario = {
  composition: Composition;
  layout: Layout;
  pressure: Pressure;
  theme: Theme;
  interaction: Interaction;
};

const compositionLayouts: Array<{ composition: Composition; layout: Layout }> = [
  ...genericCompositions.flatMap((composition) => layouts.map((layout) => ({ composition, layout }))),
  ...mobileCompositions.map((composition) => ({ composition, layout: 'mobile' as const })),
  ...desktopCompositions.map((composition) => ({ composition, layout: 'desktop' as const })),
];
const scenarios: Scenario[] = [
  ...compositionLayouts.flatMap(({ composition, layout }) => (
    pressures.flatMap((pressure) => themes.map((theme) => ({
      composition,
      layout,
      pressure,
      theme,
      interaction: 'default' as const,
    })))
  )),
  ...(['fullscreen', 'fullscreen-toast'] as const).flatMap((composition) => (
    layouts.flatMap((layout) => pressures.flatMap((pressure) => themes.flatMap((theme) => (
      (['focus-visible', 'selected'] as const).map((interaction) => ({
        composition,
        layout,
        pressure,
        theme,
        interaction,
      }))
    ))))
  )),
];

const createTemplateShellPlugin = (): Plugin => ({
  name: 'seat-map-template-shell-actual-browser-test',
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
    if (!id.split('?')[0].endsWith('/src/components/stadiumSeatMap/SeatMapTemplateShell.tsx')) return undefined;
    if (!overflowMutation) return undefined;
    const mutations = [
      ['flex min-w-0 justify-between', 'flex justify-between'],
      [
        'min-w-0 flex-1 line-clamp-3 break-words [overflow-wrap:anywhere]',
        'min-w-0 flex-1 break-words [overflow-wrap:anywhere]',
      ],
      [
        'min-w-0 max-w-[50%] line-clamp-3 break-words text-right [overflow-wrap:anywhere]',
        'max-w-[50%] break-words text-right',
      ],
      ['max-w-full line-clamp-3 break-words', 'max-w-full break-words'],
      ['min-w-0 flex-1', ''],
      ['shrink-0 flex', 'flex'],
    ] as const;
    let transformed = code;
    for (const [from, to] of mutations) {
      const next = transformed.replace(from, to);
      assert.notEqual(next, transformed, `SeatMapTemplateShell overflow mutation target missing: ${from}`);
      transformed = next;
    }
    return transformed;
  },
  load(id) {
    if (id !== moduleId) return undefined;
    return `
      import React, { createElement, useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import { SeatMapTemplateShell } from '/src/components/stadiumSeatMap/SeatMapTemplateShell.tsx';
      import '/src/index.css';

      const query = new URLSearchParams(window.location.search);
      const compositionValues = ${JSON.stringify([...genericCompositions, ...mobileCompositions, ...desktopCompositions])};
      const pressureValues = ${JSON.stringify(pressures)};
      const layoutValues = ${JSON.stringify(layouts)};
      const interactionValues = ${JSON.stringify(interactions)};
      const composition = query.get('composition');
      const pressure = query.get('pressure');
      const layout = query.get('layout');
      const interaction = query.get('interaction');
      if (!compositionValues.includes(composition)) throw new Error('Unsupported composition: ' + composition);
      if (!pressureValues.includes(pressure)) throw new Error('Unsupported pressure: ' + pressure);
      if (!layoutValues.includes(layout)) throw new Error('Unsupported layout: ' + layout);
      if (!interactionValues.includes(interaction)) throw new Error('Unsupported interaction: ' + interaction);
      const theme = query.get('theme') === 'dark' ? 'dark' : 'light';
      const unbroken = 'SEATMAPTEMPLATESHELL' + 'X'.repeat(220);
      const maximum = '최대지원합성좌석도템플릿문구'.repeat(40) + unbroken;
      const textPresets = {
        default: {
          title: '합성 좌석도',
          subtitle: '비생산 자료',
          toast: '합성 알림',
          fullscreenTitle: '합성 전체화면 좌석도',
          fullscreenSubtitle: '비생산 합성 자료',
        },
        'long-korean': {
          title: '모바일 화면에서도 자연스럽게 여러 줄로 표시되어야 하는 매우 긴 합성 좌석도 제목',
          subtitle: '모바일에서 다른 요소를 가리지 않아야 하는 매우 긴 합성 부제목',
          toast: '모바일 화면에서 좌우 가장자리를 벗어나지 않고 자연스럽게 줄바꿈되어야 하는 매우 긴 합성 알림입니다',
          fullscreenTitle: '닫기 버튼을 가리지 않고 자연스럽게 여러 줄로 표시되어야 하는 매우 긴 합성 전체화면 좌석도 제목',
          fullscreenSubtitle: '전체화면 헤더 안에서 잘리지 않아야 하는 매우 긴 합성 부제목',
        },
        'unbroken-token': {
          title: unbroken,
          subtitle: unbroken,
          toast: unbroken,
          fullscreenTitle: unbroken,
          fullscreenSubtitle: unbroken,
        },
        'maximum-supported': {
          title: maximum,
          subtitle: maximum,
          toast: maximum,
          fullscreenTitle: maximum,
          fullscreenSubtitle: maximum,
        },
      };
      const texts = textPresets[pressure];
      const node = (testId, text) => createElement('div', {
        className: 'min-w-0 max-w-full break-words rounded-lg border border-slate-300 p-2 text-xs [overflow-wrap:anywhere] dark:border-slate-700',
        'data-testid': testId,
      }, text);
      const isAuxiliary = composition === 'auxiliary-guide';
      const hasOptional = composition === 'optional-populated';
      const hasSharedFilter = hasOptional || composition === 'filter-fallback' || composition === 'filter-override' || isAuxiliary;
      const hasOverrideFilter = composition === 'filter-override';
      const hasMobileSecondary = composition === 'mobile-secondary' || hasOptional || isAuxiliary;
      const hasMobileLegacy = composition === 'mobile-legacy-side';
      const hasMobileBottomSheet = composition === 'mobile-bottom-sheet' || isAuxiliary;
      const hasMobileReserve = composition === 'mobile-side-reserve';
      const hasDesktopSecondary = composition === 'desktop-secondary' || composition === 'desktop-both' || hasOptional || isAuxiliary;
      const hasDesktopSide = composition === 'desktop-side' || composition === 'desktop-both' || isAuxiliary;
      const hasToast = composition === 'toast' || composition === 'fullscreen-toast';
      const startsFullscreen = composition === 'fullscreen' || composition === 'fullscreen-toast' || isAuxiliary;

      function App() {
        const [fullscreenOpen, setFullscreenOpen] = useState(startsFullscreen);
        const [closeCount, setCloseCount] = useState(0);
        const close = () => {
          setCloseCount((count) => count + 1);
          setFullscreenOpen(false);
        };
        return createElement(
          'div',
          {
            className: 'w-full min-w-0 p-2',
            'data-testid': 'seat-map-template-shell-host',
            'data-theme': theme,
            'data-close-count': closeCount,
            style: {
              '--mobile-content-safe-bottom': '13px',
              '--mobile-footer-safe-bottom': '29px',
            },
          },
          createElement(SeatMapTemplateShell, {
            mode: theme,
            title: texts.title,
            subtitle: texts.subtitle,
            titleAccentColor: theme === 'dark' ? '#86efac' : '#166534',
            seatMapTestId: 'synthetic-seat-map',
            isMobile: layout === 'mobile',
            isAuxiliaryGuideActive: isAuxiliary,
            filterBar: hasSharedFilter ? node('shared-filter', '공통 합성 필터') : null,
            mobileFilterBar: hasOverrideFilter ? node('mobile-filter', '모바일 합성 필터') : null,
            desktopFilterBar: hasOverrideFilter ? node('desktop-filter', '데스크톱 합성 필터') : null,
            mapContent: node('map-content', '합성 좌석도 본문'),
            attribution: node('attribution', '비생산 합성 자료'),
            legend: hasOptional ? node('legend', '합성 범례') : null,
            mobileSidePanel: hasMobileLegacy ? node('mobile-legacy-side', '모바일 레거시 패널') : null,
            mobileSecondaryPanel: hasMobileSecondary ? node('mobile-secondary', '모바일 보조 패널') : null,
            mobileBottomSheet: hasMobileBottomSheet ? node('mobile-bottom-sheet', '모바일 하단 시트') : null,
            mobileHasSidePanel: hasMobileReserve,
            desktopSidePanel: hasDesktopSide ? node('desktop-side', '데스크톱 사이드 패널') : null,
            desktopSecondaryPanel: hasDesktopSecondary ? node('desktop-secondary', '데스크톱 보조 패널') : null,
            toast: hasToast ? texts.toast : null,
            isFullscreenOpen: fullscreenOpen,
            fullscreenMapContent: node('fullscreen-map-content', '합성 전체화면 좌석도 본문'),
            onFullscreenClose: close,
            fullscreenDialogTestId: 'synthetic-fullscreen',
            fullscreenCloseTestId: 'synthetic-fullscreen-close',
            fullscreenTitle: texts.fullscreenTitle,
            fullscreenSubtitle: texts.fullscreenSubtitle,
          }),
        );
      }

      document.documentElement.classList.toggle('dark', theme === 'dark');
      createRoot(document.getElementById('root')).render(createElement(App));
    `;
  },
});

const startServer = async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'seat-map-template-shell-vite-'));
  const server = await createServer({
    root: process.cwd(),
    appType: 'custom',
    cacheDir,
    plugins: [createTemplateShellPlugin()],
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
  if (errors.length > 1) throw new Error(`SeatMapTemplateShell test cleanup failed: ${errors.length}`);
};

const serverAddress = (server: ViteDevServer) => {
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Vite test server did not expose a TCP address');
  return `http://127.0.0.1:${address.port}`;
};

const focusByKeyboard = async (page: Page, selector: string) => {
  const target = page.locator(selector);
  for (let attempt = 0; attempt < 32; attempt += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`keyboard focus did not reach ${selector}`);
};

test('SeatMapTemplateShell cleanup closes every resource after an earlier closer fails', async () => {
  const calls: string[] = [];
  const cacheDir = await mkdtemp(join(tmpdir(), 'seat-map-template-shell-cleanup-'));
  await assert.rejects(() => closeResources({
    browser: { close: async () => { calls.push('browser'); throw new Error('browser close'); } } as unknown as Browser,
    server: { close: async () => { calls.push('server'); } } as unknown as ViteDevServer,
    cacheDir,
  }), /browser close/);
  assert.deepEqual(calls, ['browser', 'server']);
  await assert.rejects(() => access(cacheDir));
});

test('SeatMapTemplateShell cleanup removes cache after a server close failure', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'seat-map-template-shell-cleanup-'));
  await assert.rejects(() => closeResources({
    server: { close: async () => { throw new Error('server close'); } } as unknown as ViteDevServer,
    cacheDir,
  }), /server close/);
  await assert.rejects(() => access(cacheDir));
});

test('SeatMapTemplateShell contains all 264 approved composition states at mobile widths', async () => {
  assert.equal(compositionLayouts.length, 25);
  assert.equal(scenarios.length, 264);
  assert.equal(new Set(scenarios.map((scenario) => JSON.stringify(scenario))).size, 264);
  const resources: { browser?: Browser; server?: ViteDevServer; cacheDir?: string } = {};
  try {
    const started = await startServer();
    resources.server = started.server;
    resources.cacheDir = started.cacheDir;
    resources.browser = await chromium.launch({ headless: true });
    const page = await resources.browser.newPage();
    const address = serverAddress(resources.server);
    const harnessOrigin = new URL(address).origin;
    const externalRequests: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== harnessOrigin) externalRequests.push(request.url());
    });

    for (const [width, height] of [[320, 844], [390, 1000]] as const) {
      await page.setViewportSize({ width, height });
      for (const scenario of scenarios) {
        const query = new URLSearchParams(scenario);
        await page.goto(`${address}${pagePath}?${query}`, { waitUntil: 'domcontentloaded' });
        const host = page.locator('[data-testid="seat-map-template-shell-host"]');
        const map = page.locator('[data-testid="synthetic-seat-map"]');
        await map.waitFor({ state: 'visible' });

        const expectsFullscreen = scenario.composition === 'fullscreen' || scenario.composition === 'fullscreen-toast';
        const dialog = page.locator('[data-testid="synthetic-fullscreen"]');
        if (expectsFullscreen) await dialog.waitFor({ state: 'visible' });

        const metrics = await host.evaluate((hostElement) => {
          const visibleElements = [hostElement, ...hostElement.querySelectorAll<HTMLElement>('*')].filter((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          });
          const mapElement = hostElement.querySelector<HTMLElement>('[data-testid="synthetic-seat-map"]');
          if (!mapElement) throw new Error('SeatMapTemplateShell map frame missing');
          const mapHeader = mapElement.firstElementChild as HTMLElement | null;
          const toastElement = [...hostElement.children].find((element) => (
            element instanceof HTMLElement
              && element.classList.contains('fixed')
              && element.getAttribute('role') !== 'dialog'
          )) as HTMLElement | undefined;
          const fullscreenDialog = hostElement.querySelector<HTMLElement>('[data-testid="synthetic-fullscreen"]');
          const fullscreenHeader = fullscreenDialog?.firstElementChild?.firstElementChild as HTMLElement | undefined;
          const textSurfaceElements: Array<[string, Element | null | undefined]> = [
            ['map-title', mapHeader?.children[0]],
            ['map-subtitle', mapHeader?.children[1]],
            ['toast', toastElement],
            ['fullscreen-title', fullscreenHeader?.children[0]?.children[0]],
            ['fullscreen-subtitle', fullscreenHeader?.children[0]?.children[1]],
          ];
          const hostRect = hostElement.getBoundingClientRect();
          const mapRect = mapElement.getBoundingClientRect();
          const mobileRoot = mapElement.parentElement;
          const visibleTestIds = visibleElements
            .map((element) => element.dataset.testid)
            .filter((value): value is string => Boolean(value));
          return {
            documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            viewportWidth: document.documentElement.clientWidth,
            hostOverflow: hostElement.scrollWidth - hostElement.clientWidth,
            mapOverflow: mapElement.scrollWidth - mapElement.clientWidth,
            hostBounds: { left: hostRect.left, right: hostRect.right },
            mapBounds: { left: mapRect.left, right: mapRect.right },
            mapHeader: mapHeader ? {
              clientWidth: mapHeader.clientWidth,
              scrollWidth: mapHeader.scrollWidth,
              children: [...mapHeader.children].map((element) => {
                const htmlElement = element as HTMLElement;
                const rect = htmlElement.getBoundingClientRect();
                return {
                  clientWidth: htmlElement.clientWidth,
                  scrollWidth: htmlElement.scrollWidth,
                  left: rect.left,
                  right: rect.right,
                  flex: getComputedStyle(htmlElement).flex,
                };
              }),
            } : null,
            ownedTextSurfaces: textSurfaceElements
              .filter((entry): entry is [string, HTMLElement] => entry[1] instanceof HTMLElement)
              .map(([label, element]) => {
                const style = getComputedStyle(element);
                const fontSize = Number.parseFloat(style.fontSize);
                const parsedLineHeight = Number.parseFloat(style.lineHeight);
                const verticalPadding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
                return {
                  label,
                  height: element.getBoundingClientRect().height - verticalPadding,
                  lineHeight: Number.isFinite(parsedLineHeight) ? parsedLineHeight : fontSize * 1.2,
                };
              }),
            outOfBounds: visibleElements.filter((element) => {
              const rect = element.getBoundingClientRect();
              return rect.left < -2 || rect.right > document.documentElement.clientWidth + 2;
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
              className: element.className,
              text: element.textContent?.slice(0, 80) ?? '',
              overflow: element.scrollWidth - element.clientWidth,
            })),
            visibleTestIds,
            mobilePaddingBottom: mobileRoot ? getComputedStyle(mobileRoot).paddingBottom : null,
            theme: (hostElement as HTMLElement).dataset.theme,
            documentIsDark: document.documentElement.classList.contains('dark'),
            desktopPanelOrder: [...hostElement.querySelectorAll<HTMLElement>('[data-testid="desktop-secondary"], [data-testid="desktop-side"]')]
              .map((element) => element.dataset.testid),
          };
        });

        const context = `${width}x${height} ${scenario.composition}/${scenario.layout}/${scenario.pressure}/${scenario.theme}/${scenario.interaction}`;
        assert.ok(
          metrics.documentOverflow <= 2,
          `${context} document overflow: ${metrics.documentOverflow}; outOfBounds=${JSON.stringify(metrics.outOfBounds)}`,
        );
        assert.ok(metrics.hostOverflow <= 2, `${context} host overflow: ${metrics.hostOverflow}`);
        assert.ok(
          metrics.mapOverflow <= 2,
          `${context} map overflow: ${metrics.mapOverflow}; outOfBounds=${JSON.stringify(metrics.outOfBounds)}; `
            + `contentOverflow=${JSON.stringify(metrics.contentOverflow)}; header=${JSON.stringify(metrics.mapHeader)}`,
        );
        assert.ok(
          metrics.hostBounds.left >= -2 && metrics.hostBounds.right <= metrics.viewportWidth + 2,
          `${context} host bounds`,
        );
        assert.ok(
          metrics.mapBounds.left >= metrics.hostBounds.left - 2 && metrics.mapBounds.right <= metrics.hostBounds.right + 2,
          `${context} map bounds`,
        );
        assert.deepEqual(metrics.outOfBounds, [], `${context} descendant bounds`);
        assert.deepEqual(metrics.contentOverflow, [], `${context} descendant content overflow`);
        for (const surface of metrics.ownedTextSurfaces) {
          assert.ok(
            surface.height <= surface.lineHeight * 3 + 2,
            `${context} ${surface.label} must not exceed three lines: ${surface.height}/${surface.lineHeight}`,
          );
        }
        assert.equal(metrics.theme, scenario.theme, `${context} host theme`);
        assert.equal(metrics.documentIsDark, scenario.theme === 'dark', `${context} document dark class`);

        const visible = new Set(metrics.visibleTestIds);
        const auxiliary = scenario.composition === 'auxiliary-guide';
        const expectedFilter = auxiliary
          ? null
          : scenario.composition === 'filter-override'
            ? (scenario.layout === 'mobile' ? 'mobile-filter' : 'desktop-filter')
            : (scenario.composition === 'filter-fallback' || scenario.composition === 'optional-populated')
              ? 'shared-filter'
              : null;
        for (const filterId of ['shared-filter', 'mobile-filter', 'desktop-filter']) {
          assert.equal(visible.has(filterId), filterId === expectedFilter, `${context} ${filterId} visibility`);
        }
        assert.equal(visible.has('legend'), scenario.composition === 'optional-populated', `${context} legend visibility`);
        assert.equal(
          visible.has('mobile-secondary'),
          scenario.layout === 'mobile' && !auxiliary
            && (scenario.composition === 'mobile-secondary' || scenario.composition === 'optional-populated'),
          `${context} mobile secondary visibility`,
        );
        assert.equal(
          visible.has('mobile-legacy-side'),
          scenario.layout === 'mobile' && scenario.composition === 'mobile-legacy-side',
          `${context} mobile legacy visibility`,
        );
        assert.equal(
          visible.has('mobile-bottom-sheet'),
          scenario.layout === 'mobile' && scenario.composition === 'mobile-bottom-sheet',
          `${context} mobile bottom sheet visibility`,
        );
        assert.equal(
          visible.has('desktop-secondary'),
          scenario.layout === 'desktop' && !auxiliary
            && ['optional-populated', 'desktop-secondary', 'desktop-both'].includes(scenario.composition),
          `${context} desktop secondary visibility`,
        );
        assert.equal(
          visible.has('desktop-side'),
          scenario.layout === 'desktop' && !auxiliary
            && ['desktop-side', 'desktop-both'].includes(scenario.composition),
          `${context} desktop side visibility`,
        );
        if (scenario.composition === 'desktop-both') {
          assert.deepEqual(metrics.desktopPanelOrder, ['desktop-secondary', 'desktop-side'], `${context} desktop panel order`);
        }
        assert.equal(
          visible.has('synthetic-fullscreen'),
          expectsFullscreen,
          `${context} fullscreen visibility`,
        );
        assert.equal(
          visible.has('synthetic-fullscreen-close'),
          expectsFullscreen,
          `${context} fullscreen close visibility`,
        );

        if (scenario.layout === 'mobile') {
          const expectedPadding = scenario.composition === 'mobile-bottom-sheet' || scenario.composition === 'mobile-side-reserve'
            ? '333px'
            : ['mobile-secondary', 'mobile-legacy-side', 'optional-populated'].includes(scenario.composition)
              ? '29px'
              : '13px';
          assert.equal(metrics.mobilePaddingBottom, expectedPadding, `${context} mobile bottom reserve`);
        }

        if (scenario.interaction === 'focus-visible') {
          await focusByKeyboard(page, '[data-testid="synthetic-fullscreen-close"]');
          assert.equal(
            await page.locator('[data-testid="synthetic-fullscreen-close"]').evaluate((element) => element === document.activeElement),
            true,
            `${context} close keyboard focus`,
          );
        } else if (scenario.interaction === 'selected') {
          await page.locator('[data-testid="synthetic-fullscreen-close"]').click();
          await dialog.waitFor({ state: 'hidden' });
          assert.equal(await host.getAttribute('data-close-count'), '1', `${context} close callback count`);
        } else {
          assert.equal(await host.getAttribute('data-close-count'), '0', `${context} unexpected close callback`);
        }
      }
    }

    assert.deepEqual(externalRequests, [], 'real template-shell browser run must issue zero external requests');
  } finally {
    await closeResources(resources);
  }
});

test('SeatMapTemplateShell browser test is wired exactly once into both visual-QA gates', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const testPath = 'src/components/stadiumSeatMap/SeatMapTemplateShell.mobile.test.tsx';
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

test('SeatMapTemplateShell component-state evidence is complete and content-addressed', async () => {
  const report = JSON.parse(
    await readFile(new URL('../../../reports/seat-map-template-shell-component-states.json', import.meta.url), 'utf8'),
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
  const expectedScenarioIds = new Set(scenarios.map((scenario) => {
    const values = [
      'data=populated',
      `interactions=${scenario.interaction}`,
      `variant.composition=${scenario.composition}`,
      `variant.pressure=${scenario.pressure}`,
      `variant.layout=${scenario.layout}`,
      `variant.theme=${scenario.theme}`,
    ];
    if (scenario.interaction !== 'default') values.push('interactionTarget=close');
    return `state:${componentId}:${values.join('|')}`;
  }));

  assert.equal(report.pageMode, 'fresh');
  assert.equal(report.captureHeightMode, 'expand-tall-flow');
  assert.deepEqual(report.viewport, { width: 320, height: 844 });
  assert.deepEqual(report.screenshots, {
    mode: 'captured',
    directory: 'reports/seat-map-template-shell-screenshots',
  });
  assert.deepEqual(report.summary, { total: 264, passed: 264, failed: 0, recovered: 0, ok: true });
  assert.equal(report.results?.length, 264);
  const results = report.results ?? [];
  assert.deepEqual(new Set(results.map(({ scenarioId }) => scenarioId)), expectedScenarioIds);

  const screenshotPaths = new Set<string>();
  const screenshotDirectoryUrl = new URL('../../../reports/seat-map-template-shell-screenshots/', import.meta.url);
  for (const result of results) {
    assert.equal(result.componentId, componentId);
    assert.equal(result.status, 'pass');
    assert.equal(result.attempts, 1);
    assert.equal(typeof result.screenshot, 'string');
    assert.match(result.screenshot ?? '', /^reports\/seat-map-template-shell-screenshots\/[^/]+\.png$/);
    screenshotPaths.add(result.screenshot ?? '');
    const screenshotUrl = new URL(`../../../${result.screenshot}`, import.meta.url);
    assert.equal(screenshotUrl.href.startsWith(screenshotDirectoryUrl.href), true);
    const png = await readFile(screenshotUrl);
    assert.ok(png.byteLength > 0, `${result.scenarioId} screenshot must be nonempty`);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.match(result.sha256 ?? '', /^[a-f0-9]{64}$/);
    assert.equal(createHash('sha256').update(png).digest('hex'), result.sha256);
  }
  assert.equal(screenshotPaths.size, 264);
});
