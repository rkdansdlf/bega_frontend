import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';
import { createServer, type Plugin } from 'vite';

const statusSource = readFileSync(new URL('./MateStatusTabs.tsx', import.meta.url), 'utf8');
const sortSource = readFileSync(new URL('./MateSortDropdown.tsx', import.meta.url), 'utf8');
const seatSource = readFileSync(new URL('./MateSeatFilterButtons.tsx', import.meta.url), 'utf8');
const harnessSource = readFileSync(
  new URL('./visual-qa/MateListControlLeavesHarnesses.tsx', import.meta.url),
  'utf8',
);
const frontendRoot = fileURLToPath(new URL('../../', import.meta.url));
const pagePath = '/__mate-list-control-leaves-test.html';
const entryPath = '/__mate-list-control-leaves-test.tsx';
const moduleId = '\0virtual:mate-list-control-leaves-test';
const reciprocalMutation = process.env.MATE_LIST_LEAVES_MUTATE_RECIPROCAL === '1';
const missingCallbackMutation = process.env.MATE_LIST_LEAVES_MUTATE_MISSING_CALLBACK === '1';

const createLeavesPlugin = (): Plugin => ({
  name: 'mate-list-control-leaves-actual-mount-test',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (request.url?.split('?')[0] !== pagePath) {
        next();
        return;
      }
      try {
        const html = await server.transformIndexHtml(
          pagePath,
          `<!doctype html><html><body><button id="outside" type="button">outside</button><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`,
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
  load(id) {
    if (id !== moduleId) return undefined;
    return `
      import React, { StrictMode, createElement, useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import '/src/index.css';
      import Status from '/src/components/MateStatusTabs.tsx';
      import Sort from '/src/components/MateSortDropdown.tsx';
      import Seat from '/src/components/MateSeatFilterButtons.tsx';

      const calls = { status: [], sort: [], seat: [], network: 0 };
      const originalFetch = window.fetch.bind(window);
      const originalXhrOpen = XMLHttpRequest.prototype.open;
      window.fetch = (...args) => {
        calls.network += 1;
        return Promise.reject(new Error('blocked fetch: ' + String(args[0])));
      };
      XMLHttpRequest.prototype.open = function (...args) {
        calls.network += 1;
        throw new Error('blocked xhr: ' + String(args[1]));
      };
      const reciprocal = ${reciprocalMutation ? 'true' : 'false'};
      const missing = ${missingCallbackMutation ? 'true' : 'false'};

      function Host({ mode, initial = '' }) {
        const [activeTab, setActiveTab] = useState('all');
        const [activeSortKey, setActiveSortKey] = useState('latest');
        const [inputValue, setInputValue] = useState(initial || 'lg 오렌지석 레드석 프리미엄석 테이블석');
        const onStatus = (value) => {
          if (reciprocal) calls.sort.push(value);
          else calls.status.push(value);
          setActiveTab(value);
        };
        const onSort = (value) => {
          if (reciprocal) calls.status.push(value);
          else calls.sort.push(value);
          setActiveSortKey(value);
        };
        const onSeat = (value) => {
          if (missing) return;
          calls.seat.push(value);
          setInputValue((current) => current.includes(value)
            ? current.replace(value, '').replace(/\\s+/g, ' ').trim()
            : (current + ' ' + value).trim());
        };
        if (mode === 'status') return createElement(Status, { activeTab, onTabChange: onStatus });
        if (mode === 'sort') return createElement(Sort, { activeSortKey, onSortChange: onSort });
        return createElement(Seat, { layout: mode === 'seat-rail' ? 'rail' : 'toolbar', inputValue, onToggleSeat: onSeat });
      }

      const root = createRoot(document.getElementById('root'));
      let generation = 0;
      const mount = (mode, initial = '') => {
        generation += 1;
        root.render(createElement(StrictMode, null, createElement(Host, { key: generation, mode, initial })));
      };
      const reset = () => {
        calls.status.length = 0;
        calls.sort.length = 0;
        calls.seat.length = 0;
      };
      window.__MATE_LIST_CONTROL_LEAVES_TEST__ = {
        calls,
        mount,
        reset,
        restore: () => {
          window.fetch = originalFetch;
          XMLHttpRequest.prototype.open = originalXhrOpen;
        },
      };
      mount('status');
    `;
  },
});

test('three control leaves expose stable roots, targets, ARIA, and owned pressed feedback', () => {
  assert.match(statusSource, /data-testid="mate-status-tabs"/);
  assert.match(statusSource, /data-testid=\{`mate-status-tab-\$\{tab\.key\}`\}/);
  assert.match(statusSource, /relative h-11/);
  assert.match(statusSource, /active:scale-\[0\.98\]/);
  assert.match(statusSource, /motion-reduce:transform-none/);

  assert.match(sortSource, /data-testid="mate-sort-dropdown"/);
  assert.match(sortSource, /data-testid="mate-sort-trigger"/);
  assert.match(sortSource, /ariaLabel="메이트 정렬"/);
  assert.match(sortSource, /align="start"/);
  assert.match(sortSource, /data-testid=\{`mate-sort-option-\$\{option\.key\}`\}/);
  assert.match(sortSource, /active:scale-\[0\.98\]/);

  assert.match(seatSource, /data-testid="mate-seat-filter-buttons"/);
  assert.match(seatSource, /role="group"/);
  assert.match(seatSource, /aria-label="좌석 필터"/);
  assert.match(seatSource, /data-testid=\{`mate-seat-filter-\$\{option\.id\.toLowerCase\(\)\}`\}/);
  assert.match(seatSource, /active:scale-\[0\.98\]/);
  for (const source of [statusSource, sortSource, seatSource]) {
    assert.doesNotMatch(source, /from ['"](?:\.\.\/)*api\//);
    assert.doesNotMatch(source, /\b(?:axios|fetch|useQuery|useMutation)\b/);
  }
});

test('lower-camel Visual QA wrappers stay tree-shakeable and expose controlled audit state', () => {
  assert.match(harnessSource, /export function mateStatusTabsVisualQaHarness/);
  assert.match(harnessSource, /data-testid="mate-status-tabs-stateful-host"/);
  assert.match(harnessSource, /data-vqa-callback-count=\{callbackCount\}/);
  assert.match(harnessSource, /data-vqa-effective-value=\{activeTab\}/);

  assert.match(harnessSource, /export function mateSortDropdownVisualQaHarness/);
  assert.match(harnessSource, /data-testid="mate-sort-dropdown-stateful-host"/);
  assert.match(harnessSource, /data-vqa-effective-value=\{activeSortKey\}/);

  assert.match(harnessSource, /export function mateSeatFilterButtonsVisualQaHarness/);
  assert.match(harnessSource, /data-testid="mate-seat-filter-buttons-stateful-host"/);
  assert.match(harnessSource, /data-vqa-effective-value=\{inputValue\}/);
  for (const source of [statusSource, sortSource, seatSource]) {
    assert.doesNotMatch(source, /VisualQaHarness|MateListControlLeavesHarnesses/);
  }
  assert.doesNotMatch(harnessSource, /export (?:const|function) [A-Z][A-Za-z]+VisualQa/);
});

test('actual mobile DOM keeps touch targets, menu, rail, callbacks, and keyboard state valid', {
  timeout: 90_000,
}, async () => {
  const server = await createServer({
    configFile: fileURLToPath(new URL('../../vite.visual-qa.config.ts', import.meta.url)),
    logLevel: 'silent',
    plugins: [createLeavesPlugin()],
    root: frontendRoot,
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  });
  let browser;
  try {
    await server.listen();
    const address = server.httpServer?.address();
    assert.ok(address && typeof address !== 'string');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 320, height: 844 } });
    const diagnostics: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') diagnostics.push(message.text());
    });
    page.on('pageerror', (error) => diagnostics.push(error.message));
    const response = await page.goto(`http://127.0.0.1:${address.port}${pagePath}`);
    assert.equal(response?.status(), 200);

    const mount = (mode: string, initial = '') => page.evaluate(({ nextMode, nextInitial }) => {
      (window as unknown as { __MATE_LIST_CONTROL_LEAVES_TEST__: {
        mount: (mode: string, initial?: string) => void;
      } }).__MATE_LIST_CONTROL_LEAVES_TEST__.mount(nextMode, nextInitial);
    }, { nextMode: mode, nextInitial: initial });
    const reset = () => page.evaluate(() => {
      (window as unknown as { __MATE_LIST_CONTROL_LEAVES_TEST__: { reset: () => void } })
        .__MATE_LIST_CONTROL_LEAVES_TEST__.reset();
    });
    const readCalls = () => page.evaluate(() => JSON.parse(JSON.stringify(
      (window as unknown as { __MATE_LIST_CONTROL_LEAVES_TEST__: {
        calls: { status: string[]; sort: string[]; seat: string[]; network: number };
      } }).__MATE_LIST_CONTROL_LEAVES_TEST__.calls,
    )) as { status: string[]; sort: string[]; seat: string[]; network: number });
    const problems: string[] = [];
    const metrics: Record<string, unknown> = {};

    const statusGroup = page.getByRole('group', { name: '파티 상태 필터' });
    await statusGroup.waitFor({ timeout: 15_000 }).catch((error: unknown) => {
      throw new Error(`${String(error)}\n${diagnostics.join('\n')}`);
    });
    const statusButtons = statusGroup.getByRole('button');
    const statusBoxes = await statusButtons.evaluateAll((nodes) => nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { bottom: rect.bottom, height: rect.height, left: rect.left, right: rect.right, top: rect.top, width: rect.width };
    }));
    metrics.statusBoxes = statusBoxes;
    if (statusBoxes.some((box) => box.height < 44 || box.width < 44)) {
      problems.push(`status touch target below 44px: ${JSON.stringify(statusBoxes)}`);
    }
    for (let index = 1; index < statusBoxes.length; index += 1) {
      if (statusBoxes[index - 1]!.right > statusBoxes[index]!.left + 0.5) problems.push('status buttons overlap');
    }
    await reset();
    await page.getByRole('button', { name: '모집 중' }).click();
    if (JSON.stringify(await readCalls()) !== JSON.stringify({ status: ['recruiting'], sort: [], seat: [], network: 0 })) {
      problems.push(`status callback isolation failed: ${JSON.stringify(await readCalls())}`);
    }
    if (await page.getByRole('button', { name: '모집 중' }).getAttribute('aria-pressed') !== 'true') {
      problems.push('status controlled selected state did not update');
    }
    await mount('status');
    await page.getByRole('button', { name: '전체' }).focus();
    await page.keyboard.press('Tab');
    if (!await page.getByRole('button', { name: '모집 중' }).evaluate((node) => node.matches(':focus-visible'))) {
      problems.push('status Tab did not move focus-visible to recruiting');
    }

    await mount('sort');
    const sortTrigger = page.getByRole('button', { name: /정렬:/ });
    await sortTrigger.waitFor();
    await reset();
    await sortTrigger.click();
    const menu = page.locator('[role="menu"]');
    await menu.waitFor();
    const menuBox320 = await menu.boundingBox();
    metrics.menuBox320 = menuBox320;
    if (!menuBox320 || menuBox320.x < 0 || menuBox320.x + menuBox320.width > 320) {
      problems.push(`sort menu escapes 320 viewport: ${JSON.stringify(menuBox320)}`);
    }
    const sortTriggerBox = await sortTrigger.boundingBox();
    const optionBoxes = await page.getByRole('menuitemradio').evaluateAll((nodes) => nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { height: rect.height, width: rect.width };
    }));
    metrics.sortTriggerBox = sortTriggerBox;
    metrics.sortOptionBoxes = optionBoxes;
    if (!sortTriggerBox || sortTriggerBox.height < 44 || sortTriggerBox.width < 44
      || optionBoxes.some((box) => box.height < 44 || box.width < 44)) {
      problems.push('sort touch target below 44px');
    }
    if (await menu.getAttribute('aria-label') !== '메이트 정렬') problems.push('sort menu accessible name missing');
    if ((await readCalls()).sort.length !== 0) problems.push('sort open invoked selection callback');
    await page.getByRole('menuitemradio', { name: /인기순/ }).click();
    const afterSort = await readCalls();
    if (JSON.stringify(afterSort) !== JSON.stringify({ status: [], sort: ['popular'], seat: [], network: 0 })) {
      problems.push(`sort callback isolation failed: ${JSON.stringify(afterSort)}`);
    }
    if (await menu.isVisible()) problems.push('sort selection did not close menu');
    await sortTrigger.click();
    await page.keyboard.press('Escape');
    if (await menu.isVisible()) problems.push('Escape did not close sort menu');
    if ((await readCalls()).sort.length !== 1) problems.push('Escape replayed sort callback');
    await sortTrigger.click();
    await page.locator('#outside').click();
    if (await menu.isVisible()) problems.push('outside pointer did not close sort menu');
    if ((await readCalls()).sort.length !== 1) problems.push('outside pointer invoked sort callback');
    await page.setViewportSize({ width: 390, height: 1000 });
    await sortTrigger.click();
    const menuBox390 = await menu.boundingBox();
    metrics.menuBox390 = menuBox390;
    if (!menuBox390 || menuBox390.x < 0 || menuBox390.x + menuBox390.width > 390) {
      problems.push(`sort menu escapes 390 viewport: ${JSON.stringify(menuBox390)}`);
    }
    if ((await readCalls()).sort.length !== 1) problems.push('resize/open replayed sort callback');

    await page.setViewportSize({ width: 320, height: 844 });
    await mount('seat-rail', 'lg 오렌지석 레드석 프리미엄석 테이블석');
    const orange = page.getByRole('button', { name: /오렌지석/ });
    await orange.waitFor();
    const rail = orange.locator('..');
    const railMetrics = await rail.evaluate((node) => ({
      clientWidth: node.clientWidth,
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      scrollWidth: node.scrollWidth,
    }));
    metrics.rail = railMetrics;
    if (railMetrics.documentOverflow !== 0) problems.push(`rail document overflow ${railMetrics.documentOverflow}`);
    await mount('seat-toolbar', 'lg 오렌지석 레드석 프리미엄석 테이블석');
    const toolbarOrange = page.getByRole('button', { name: /오렌지석/ });
    await toolbarOrange.waitFor();
    const toolbar = toolbarOrange.locator('..');
    const toolbarBefore = await toolbar.evaluate((node) => ({ clientWidth: node.clientWidth, scrollWidth: node.scrollWidth }));
    await toolbar.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
    const last = page.getByRole('button', { name: /테이블석/ });
    const toolbarAfter = await toolbar.evaluate((node) => ({
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      scrollLeft: node.scrollLeft,
    }));
    metrics.toolbar = { before: toolbarBefore, after: toolbarAfter, last: await last.boundingBox() };
    if (toolbarAfter.documentOverflow !== 0 || toolbarAfter.scrollLeft <= 0) problems.push('toolbar did not scroll locally');
    await reset();
    await toolbarOrange.click();
    const afterSeat = await readCalls();
    if (JSON.stringify(afterSeat) !== JSON.stringify({ status: [], sort: [], seat: ['오렌지석'], network: 0 })) {
      problems.push(`seat callback isolation failed: ${JSON.stringify(afterSeat)}`);
    }
    if (await toolbarOrange.getAttribute('aria-pressed') !== 'false') problems.push('seat controlled selected state did not update');
    await page.setViewportSize({ width: 390, height: 1000 });
    if ((await readCalls()).seat.length !== 1) problems.push('seat resize replayed callback');

    assert.equal(problems.length, 0, `metrics=${JSON.stringify(metrics)} problems=${JSON.stringify(problems)}`);
  } finally {
    await browser?.close();
    await server.close();
  }
});
