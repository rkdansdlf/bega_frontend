import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type Plugin, type ViteDevServer } from 'vite';

const pagePath = '/__seat-map-section-finder-test.html';
const entryPath = '/__seat-map-section-finder-test.tsx';
const moduleId = '\0virtual:seat-map-section-finder-test';
const componentId = 'src/components/stadiumSeatMap/SeatMapSectionFinder.tsx#SeatMapSectionFinder';
const overflowMutation = process.env.SEAT_MAP_SECTION_FINDER_MUTATE_OVERFLOW === '1';

const dataStates = [
  'empty',
  'single',
  'null-optional',
  'populated',
  'long-korean',
  'unbroken-token',
  'maximum-supported',
] as const;
const interactions = [
  'default',
  'input',
  'focus-visible',
  'hover',
  'selected',
  'keyboard-navigation',
] as const;
const themes = ['light', 'dark'] as const;
const filters = ['all', 'restricted'] as const;

type DataState = typeof dataStates[number];
type Interaction = typeof interactions[number];
type InteractionTarget = 'none' | 'match-query' | 'no-result-query' | 'search' | 'item' | 'enter' | 'space';

type Scenario = {
  data: DataState;
  interaction: Interaction;
  target: InteractionTarget;
  theme: typeof themes[number];
  filter: typeof filters[number];
};

const itemTargets = (data: DataState, interaction: Interaction): InteractionTarget[] => {
  if (interaction === 'default') return ['none'];
  if (interaction === 'input') return data === 'empty'
    ? ['no-result-query']
    : ['match-query', 'no-result-query'];
  if (interaction === 'focus-visible') return data === 'empty' ? ['search'] : ['search', 'item'];
  if (data === 'empty') return [];
  if (interaction === 'keyboard-navigation') return ['enter', 'space'];
  return ['item'];
};

const scenarios: Scenario[] = dataStates.flatMap((data) => (
  interactions.flatMap((interaction) => (
    itemTargets(data, interaction).flatMap((target) => (
      themes.flatMap((theme) => filters.map((filter) => ({ data, interaction, target, theme, filter })))
    ))
  ))
));

const createSectionFinderPlugin = (): Plugin => ({
  name: 'seat-map-section-finder-actual-browser-test',
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
    if (!id.split('?')[0].endsWith('/src/components/stadiumSeatMap/SeatMapSectionFinder.tsx')) return undefined;
    if (!overflowMutation) return undefined;
    const mutations = [
      ['flex min-w-0 items-center', 'flex items-center'],
      ['min-w-0 max-w-[50%] shrink-0 truncate ', 'shrink-0 '],
      ['flex min-w-0 max-w-full flex-wrap', 'flex flex-wrap'],
      ['max-w-[50%] shrink-0 truncate whitespace-nowrap rounded-full ', 'shrink-0 whitespace-nowrap rounded-full '],
      ['min-w-0 max-w-full break-words text-xs ', 'text-xs '],
    ] as const;
    let transformed = code;
    for (const [from, to] of mutations) {
      const next = transformed.replace(from, to);
      assert.notEqual(next, transformed, `SeatMapSectionFinder overflow mutation target missing: ${from}`);
      transformed = next;
    }
    return transformed;
  },
  load(id) {
    if (id !== moduleId) return undefined;
    return `
      import React, { createElement } from 'react';
      import { createRoot } from 'react-dom/client';
      import { SeatMapSectionFinder } from '/src/components/stadiumSeatMap/SeatMapSectionFinder.tsx';
      import '/src/index.css';

      const query = new URLSearchParams(window.location.search);
      const dataValues = ${JSON.stringify(dataStates)};
      const interactionValues = ${JSON.stringify(interactions)};
      const targetValues = ['none', 'match-query', 'no-result-query', 'search', 'item', 'enter', 'space'];
      const filterValues = ${JSON.stringify(filters)};
      const data = query.get('data');
      const interaction = query.get('interaction');
      const target = query.get('target');
      const filter = query.get('filter');
      if (!dataValues.includes(data)) throw new Error('Unsupported SeatMapSectionFinder data: ' + data);
      if (!interactionValues.includes(interaction)) throw new Error('Unsupported SeatMapSectionFinder interaction: ' + interaction);
      if (!targetValues.includes(target)) throw new Error('Unsupported SeatMapSectionFinder target: ' + target);
      if (!filterValues.includes(filter)) throw new Error('Unsupported SeatMapSectionFinder filter: ' + filter);
      const theme = query.get('theme') === 'dark' ? 'dark' : 'light';
      const autoFocusInput = query.get('autofocus') === '1';
      const unbroken = 'SEATMAPSECTIONFINDER' + 'X'.repeat(220);
      const maximum = '최대지원합성좌석구역'.repeat(36) + unbroken;

      const makeBlock = (index, overrides = {}) => ({
        id: 'synthetic-' + index,
        name: '합성 좌석 구역 ' + (index + 1),
        block: 'S' + (index + 1),
        categoryId: index % 2 === 0 ? 'alpha' : 'beta',
        level: '합성 레벨',
        officialBlocks: ['SYNTHETIC-MATCH-' + index],
        side: index % 2 === 0 ? '합성 1루 방향' : '합성 3루 방향',
        fan: '합성 응원 역할',
        sourceLabel: '비생산 합성 자료',
        sourceNote: 'Visual QA 전용 합성 설명',
        seatViewSections: ['SYNTHETIC-VIEW-' + index],
        ...overrides,
      });
      const alpha = makeBlock(0);
      const blocksByData = {
        empty: [],
        single: [alpha],
        'null-optional': [makeBlock(0, { categoryId: 'missing', side: '', fan: '' })],
        populated: [alpha, makeBlock(1), makeBlock(2)],
        'long-korean': [
          makeBlock(0, {
            name: '모바일 화면에서 자연스럽게 여러 줄로 표시되어야 하는 매우 긴 합성 좌석 구역 이름',
            block: '모바일긴합성블록코드',
            side: '모바일에서도 내용이 잘리지 않아야 하는 매우 긴 합성 방향 설명',
            fan: '모바일에서 자연스럽게 표시되어야 하는 매우 긴 합성 응원 역할 설명',
          }),
          makeBlock(1),
          makeBlock(2),
        ],
        'unbroken-token': [makeBlock(0, { name: unbroken, block: unbroken }), makeBlock(1)],
        'maximum-supported': Array.from({ length: 24 }, (_, index) => (
          makeBlock(index, index === 0 ? { name: maximum, block: maximum } : {})
        )),
      };
      const labelsByData = {
        empty: '합성구장',
        single: '합성구장',
        'null-optional': '합성구장',
        populated: '합성구장',
        'long-korean': '모바일 화면에서 잘리지 않고 표시되어야 하는 매우 긴 합성 구장 벳지',
        'unbroken-token': unbroken,
        'maximum-supported': maximum,
      };
      const blocks = blocksByData[data];
      const adapter = {
        getId: (block) => block.id,
        getName: (block) => block.name,
        getBlock: (block) => block.block,
        getCategoryId: (block) => block.categoryId,
        getLevel: (block) => block.level,
        getOfficialBlocks: (block) => block.officialBlocks,
        getSideLabel: (block) => block.side,
        getFanRoleLabel: (block) => block.fan,
        getSourceLabel: (block) => block.sourceLabel,
        getSourceNote: (block) => block.sourceNote,
        getSeatViewSections: (block) => block.seatViewSections,
      };
      const categories = {
        alpha: { label: '합성 일반 구역', light: '#166534', dark: '#86efac' },
        beta: { label: '합성 응원 구역', light: '#9a3412', dark: '#fdba74' },
      };
      const events = { selectIds: [], hoverValues: [] };
      window.__SEAT_MAP_SECTION_FINDER_EVENTS__ = events;
      window.__SEAT_MAP_SECTION_FINDER_BLOCK_IDS__ = blocks.map((block) => block.id);
      document.documentElement.classList.toggle('dark', theme === 'dark');
      createRoot(document.getElementById('root')).render(createElement(
        'div',
        {
          className: 'w-full min-w-0 p-2',
          'data-testid': 'seat-map-section-finder-host',
          'data-theme': theme,
        },
        createElement(SeatMapSectionFinder, {
          blocks,
          adapter,
          categories,
          filterCats: filter === 'restricted' ? ['alpha', 'missing'] : null,
          selected: interaction === 'selected' && blocks.length > 0 ? blocks[0] : null,
          onSelect: (block) => events.selectIds.push(block.id),
          onHoverChange: (value) => events.hoverValues.push(value),
          mode: theme,
          testIdPrefix: 'synthetic',
          accentColor: '#2563eb',
          stadiumShortLabel: labelsByData[data],
          autoFocusInput,
        }),
      ));
    `;
  },
});

const startServer = async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'seat-map-section-finder-vite-'));
  const server = await createServer({
    root: process.cwd(),
    appType: 'custom',
    cacheDir,
    plugins: [createSectionFinderPlugin()],
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
  if (errors.length > 1) throw new Error(`SeatMapSectionFinder test cleanup failed: ${errors.length}`);
};

const serverAddress = (server: ViteDevServer) => {
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Vite test server did not expose a TCP address');
  return `http://127.0.0.1:${address.port}`;
};

const focusByKeyboard = async (page: Page, selector: string) => {
  const target = page.locator(selector).first();
  for (let attempt = 0; attempt < 32; attempt += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`keyboard focus did not reach ${selector}`);
};

const visibleCounts = {
  all: {
    empty: 0,
    single: 1,
    'null-optional': 1,
    populated: 3,
    'long-korean': 3,
    'unbroken-token': 2,
    'maximum-supported': 24,
  },
  restricted: {
    empty: 0,
    single: 1,
    'null-optional': 1,
    populated: 2,
    'long-korean': 2,
    'unbroken-token': 1,
    'maximum-supported': 12,
  },
} as const;

test('SeatMapSectionFinder cleanup closes every resource after an earlier closer fails', async () => {
  const calls: string[] = [];
  const cacheDir = await mkdtemp(join(tmpdir(), 'seat-map-section-finder-cleanup-'));
  await assert.rejects(() => closeResources({
    browser: { close: async () => { calls.push('browser'); throw new Error('browser close'); } } as unknown as Browser,
    server: { close: async () => { calls.push('server'); } } as unknown as ViteDevServer,
    cacheDir,
  }), /browser close/);
  assert.deepEqual(calls, ['browser', 'server']);
  await assert.rejects(() => access(cacheDir));
});

test('SeatMapSectionFinder cleanup removes cache after a server close failure', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'seat-map-section-finder-cleanup-'));
  await assert.rejects(() => closeResources({
    server: { close: async () => { throw new Error('server close'); } } as unknown as ViteDevServer,
    cacheDir,
  }), /server close/);
  await assert.rejects(() => access(cacheDir));
});

test('SeatMapSectionFinder contains every approved mobile state and invokes each selection once', async () => {
  assert.equal(scenarios.length, 228);
  assert.equal(new Set(scenarios.map((scenario) => JSON.stringify(scenario))).size, 228);
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
        const input = page.locator('[data-testid="synthetic-block-search"]');
        const firstItem = page.locator('[data-testid^="synthetic-section-finder-item-"]').first();
        await page.locator('[data-testid="synthetic-section-finder"]').waitFor({ state: 'visible' });

        if (scenario.interaction === 'input') {
          await input.fill(scenario.target === 'match-query' ? 'SYNTHETIC-MATCH-0' : 'SYNTHETIC-NO-RESULT');
        } else if (scenario.interaction === 'focus-visible') {
          await focusByKeyboard(page, scenario.target === 'search'
            ? '[data-testid="synthetic-block-search"]'
            : '[data-testid^="synthetic-section-finder-item-"]');
        } else if (scenario.interaction === 'hover') {
          await firstItem.hover();
        } else if (scenario.interaction === 'selected') {
          await firstItem.click();
        } else if (scenario.interaction === 'keyboard-navigation') {
          await firstItem.focus();
          await firstItem.press(scenario.target === 'enter' ? 'Enter' : 'Space');
        }
        await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

        const metrics = await page.locator('[data-testid="seat-map-section-finder-host"]').evaluate((host) => {
          const finder = host.querySelector<HTMLElement>('[data-testid="synthetic-section-finder"]');
          if (!finder) throw new Error('SeatMapSectionFinder surface missing');
          const hostRect = host.getBoundingClientRect();
          const finderRect = finder.getBoundingClientRect();
          const visibleElements = [finder, ...finder.querySelectorAll<HTMLElement>('*')].filter((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          });
          const items = [...finder.querySelectorAll<HTMLElement>('[data-testid^="synthetic-section-finder-item-"]')];
          const firstItem = items[0];
          const blockBadge = firstItem?.querySelector<HTMLElement>('span');
          const blockBadgeRect = blockBadge?.getBoundingClientRect();
          const metadata = firstItem?.querySelector<HTMLElement>('p');
          const badge = finder.querySelector<HTMLElement>('header span, div > span');
          const events = (window as unknown as {
            __SEAT_MAP_SECTION_FINDER_EVENTS__: { selectIds: string[]; hoverValues: Array<string | null> };
          }).__SEAT_MAP_SECTION_FINDER_EVENTS__;
          return {
            documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            viewportWidth: document.documentElement.clientWidth,
            hostOverflow: host.scrollWidth - host.clientWidth,
            finderOverflow: finder.scrollWidth - finder.clientWidth,
            hostBounds: { left: hostRect.left, right: hostRect.right },
            finderBounds: { left: finderRect.left, right: finderRect.right },
            itemCount: items.length,
            counter: finder.querySelector('h3 + p')?.textContent?.trim() ?? '',
            metadata: metadata?.textContent?.trim() ?? null,
            badgeText: badge?.textContent?.trim() ?? '',
            blockBadge: blockBadge && blockBadgeRect && firstItem ? {
              width: blockBadgeRect.width,
              height: blockBadgeRect.height,
              itemWidth: firstItem.getBoundingClientRect().width,
              title: blockBadge.getAttribute('title'),
            } : null,
            selectedBackground: firstItem ? getComputedStyle(firstItem).backgroundColor : null,
            activeTestId: (document.activeElement as HTMLElement | null)?.dataset.testid ?? null,
            events,
            outOfBounds: visibleElements.filter((element) => {
              const rect = element.getBoundingClientRect();
              return rect.left < finderRect.left - 2 || rect.right > finderRect.right + 2;
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
            theme: (host as HTMLElement).dataset.theme,
            documentIsDark: document.documentElement.classList.contains('dark'),
          };
        });

        const context = `${width}x${height} ${scenario.data}/${scenario.interaction}/${scenario.target}/${scenario.filter}/${scenario.theme}`;
        assert.ok(
          metrics.documentOverflow <= 2,
          `${context} document overflow: ${metrics.documentOverflow}; outOfBounds=${JSON.stringify(metrics.outOfBounds)}`,
        );
        assert.ok(metrics.hostOverflow <= 2, `${context} host overflow: ${metrics.hostOverflow}`);
        assert.ok(
          metrics.finderOverflow <= 2,
          `${context} finder overflow: ${metrics.finderOverflow}; `
            + `outOfBounds=${JSON.stringify(metrics.outOfBounds)}; `
            + `contentOverflow=${JSON.stringify(metrics.contentOverflow)}`,
        );
        assert.ok(
          metrics.hostBounds.left >= -2 && metrics.hostBounds.right <= metrics.viewportWidth + 2,
          `${context} host bounds`,
        );
        assert.ok(
          metrics.finderBounds.left >= metrics.hostBounds.left - 2
            && metrics.finderBounds.right <= metrics.hostBounds.right + 2,
          `${context} finder bounds`,
        );
        assert.deepEqual(metrics.outOfBounds, [], `${context} descendant bounds`);
        assert.deepEqual(metrics.contentOverflow, [], `${context} descendant content overflow`);
        assert.equal(metrics.theme, scenario.theme, `${context} host theme`);
        assert.equal(metrics.documentIsDark, scenario.theme === 'dark', `${context} document dark class`);

        const initialCount = visibleCounts[scenario.filter][scenario.data];
        const expectedCount = scenario.target === 'no-result-query'
          ? 0
          : scenario.target === 'match-query'
            ? 1
            : initialCount;
        assert.equal(metrics.itemCount, expectedCount, `${context} visible item count`);
        assert.equal(metrics.counter, `${expectedCount}/${visibleCounts.all[scenario.data]}개 표시`, `${context} counter`);
        if (scenario.data === 'null-optional' && expectedCount > 0) {
          assert.equal(metrics.metadata, '', `${context} optional metadata separators`);
        }
        if (expectedCount > 0) {
          assert.ok(metrics.blockBadge, `${context} block badge`);
          assert.ok(metrics.blockBadge.height <= 24, `${context} block badge height: ${metrics.blockBadge.height}`);
          assert.ok(
            metrics.blockBadge.width <= metrics.blockBadge.itemWidth * 0.5,
            `${context} block badge width: ${metrics.blockBadge.width}/${metrics.blockBadge.itemWidth}`,
          );
        }
        if (scenario.data === 'long-korean') assert.match(metrics.badgeText, /매우 긴 합성 구장 벳지/);
        if (scenario.data === 'unbroken-token') {
          assert.match(metrics.badgeText, /SEATMAPSECTIONFINDERX{20}/);
          if (expectedCount > 0) assert.match(metrics.blockBadge?.title ?? '', /SEATMAPSECTIONFINDERX{20}/);
        }
        if (scenario.interaction === 'selected') {
          assert.notEqual(metrics.selectedBackground, 'rgba(0, 0, 0, 0)', `${context} selected background`);
          assert.equal(metrics.events.selectIds.length, 1, `${context} click selection count`);
        } else if (scenario.interaction === 'keyboard-navigation') {
          assert.equal(metrics.events.selectIds.length, 1, `${context} keyboard selection count`);
        } else {
          assert.equal(metrics.events.selectIds.length, 0, `${context} unexpected selection`);
        }
        if (scenario.interaction === 'hover') {
          assert.equal(metrics.events.hoverValues.length, 1, `${context} hover callback count`);
          assert.equal(metrics.events.hoverValues[0], 'synthetic-0', `${context} hover callback value`);
        }
        if (scenario.interaction === 'focus-visible') {
          assert.equal(
            metrics.activeTestId,
            scenario.target === 'search' ? 'synthetic-block-search' : 'synthetic-section-finder-item-synthetic-0',
            `${context} keyboard focus target`,
          );
        }
      }
    }

    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(
      `${address}${pagePath}?data=single&interaction=default&target=none&theme=light&filter=all&autofocus=1`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.locator('[data-testid="synthetic-block-search"]').waitFor({ state: 'visible' });
    assert.equal(
      await page.locator('[data-testid="synthetic-block-search"]').evaluate((element) => element === document.activeElement),
      true,
      'autoFocusInput must focus the real search input',
    );
    assert.deepEqual(externalRequests, [], 'real section-finder browser run must issue zero external requests');
  } finally {
    await closeResources(resources);
  }
});

test('SeatMapSectionFinder browser test is wired exactly once into both visual-QA gates', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const testPath = 'src/components/stadiumSeatMap/SeatMapSectionFinder.mobile.test.tsx';
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

test('SeatMapSectionFinder component-state evidence is complete and content-addressed', async () => {
  const report = JSON.parse(
    await readFile(new URL('../../../reports/seat-map-section-finder-component-states.json', import.meta.url), 'utf8'),
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
      `data=${scenario.data}`,
      `interactions=${scenario.interaction}`,
      `variant.filter=${scenario.filter}`,
      `variant.theme=${scenario.theme}`,
    ];
    if (scenario.target !== 'none') values.push(`interactionTarget=${scenario.target}`);
    return `state:${componentId}:${values.join('|')}`;
  }));

  assert.equal(report.pageMode, 'fresh');
  assert.equal(report.captureHeightMode, 'expand-tall-flow');
  assert.deepEqual(report.viewport, { width: 320, height: 844 });
  assert.deepEqual(report.screenshots, {
    mode: 'captured',
    directory: 'reports/seat-map-section-finder-screenshots',
  });
  assert.deepEqual(report.summary, { total: 228, passed: 228, failed: 0, recovered: 0, ok: true });
  assert.equal(report.results?.length, 228);
  const results = report.results ?? [];
  assert.deepEqual(new Set(results.map(({ scenarioId }) => scenarioId)), expectedScenarioIds);

  const screenshotPaths = new Set<string>();
  const screenshotDirectoryUrl = new URL('../../../reports/seat-map-section-finder-screenshots/', import.meta.url);
  for (const result of results) {
    assert.equal(result.componentId, componentId);
    assert.equal(result.status, 'pass');
    assert.equal(result.attempts, 1);
    assert.equal(typeof result.screenshot, 'string');
    assert.match(result.screenshot ?? '', /^reports\/seat-map-section-finder-screenshots\/[^/]+\.png$/);
    screenshotPaths.add(result.screenshot ?? '');
    const screenshotUrl = new URL(`../../../${result.screenshot}`, import.meta.url);
    assert.equal(screenshotUrl.href.startsWith(screenshotDirectoryUrl.href), true);
    const png = await readFile(screenshotUrl);
    assert.ok(png.byteLength > 0, `${result.scenarioId} screenshot must be nonempty`);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.match(result.sha256 ?? '', /^[a-f0-9]{64}$/);
    assert.equal(createHash('sha256').update(png).digest('hex'), result.sha256);
  }
  assert.equal(screenshotPaths.size, 228);
});
