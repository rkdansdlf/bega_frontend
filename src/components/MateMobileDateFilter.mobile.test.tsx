import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';
import { createServer, type Plugin } from 'vite';

const componentSource = readFileSync(new URL('./MateMobileDateFilter.tsx', import.meta.url), 'utf8');
const frontendRoot = fileURLToPath(new URL('../../', import.meta.url));
const pagePath = '/__mate-mobile-date-filter-test.html';
const entryPath = '/__mate-mobile-date-filter-test.tsx';
const moduleId = '\0virtual:mate-mobile-date-filter-test';
const reciprocalMutation = process.env.MATE_MOBILE_DATE_FILTER_MUTATE_RECIPROCAL === '1';
const missingCallbackMutation = process.env.MATE_MOBILE_DATE_FILTER_MUTATE_MISSING_CALLBACK === '1';

const createDateFilterPlugin = (): Plugin => ({
  name: 'mate-mobile-date-filter-actual-mount-test',
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
      import Filter from '/src/components/MateMobileDateFilter.tsx';

      const calls = { date: [], unrelated: [], fetch: 0, xhr: 0, beacon: 0 };
      const originalFetch = window.fetch.bind(window);
      const originalXhrOpen = XMLHttpRequest.prototype.open;
      const originalSendBeacon = navigator.sendBeacon?.bind(navigator);
      window.fetch = (...args) => {
        calls.fetch += 1;
        return Promise.reject(new Error('blocked fetch: ' + String(args[0])));
      };
      XMLHttpRequest.prototype.open = function (...args) {
        calls.xhr += 1;
        throw new Error('blocked xhr: ' + String(args[1]));
      };
      navigator.sendBeacon = (...args) => {
        calls.beacon += 1;
        return false;
      };

      const reciprocal = ${reciprocalMutation ? 'true' : 'false'};
      const missing = ${missingCallbackMutation ? 'true' : 'false'};
      const dateString = (date) => {
        if (!date) return 'all';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
      };
      const fixtures = {
        empty: [],
        single: [new Date(2027, 11, 24)],
        long: [new Date(2027, 11, 31)],
        boundary: Array.from({ length: 4 }, (_, index) => new Date(2027, 11, 24 + index)),
        maximum: Array.from({ length: 14 }, (_, index) => new Date(2027, 11, 24 + index)),
      };
      const selectedFor = (dateItems, selection) => {
        if (selection === 'all') return null;
        if (selection === 'outside') return new Date(2028, 0, 7);
        if (selection === 'first') return dateItems[0] ?? null;
        if (selection === 'middle') return dateItems[7] ?? null;
        return dateItems.at(-1) ?? null;
      };

      function Host({ fixture, initialSelection }) {
        const dateItems = fixtures[fixture];
        const [selectedDate, setSelectedDate] = useState(() => selectedFor(dateItems, initialSelection));
        const onDateSelect = (requestedDate) => {
          if (missing) return;
          let nextDate = requestedDate;
          if (reciprocal && requestedDate) {
            const requestedValue = dateString(requestedDate);
            if (requestedValue === '2027-12-24') nextDate = dateItems[7] ?? requestedDate;
            if (requestedValue === '2027-12-31') nextDate = dateItems[0] ?? requestedDate;
          }
          calls.date.push(dateString(nextDate));
          setSelectedDate((current) => (
            current && nextDate && dateString(current) === dateString(nextDate) ? null : nextDate
          ));
        };
        return createElement(Filter, { dateItems, selectedDate, onDateSelect });
      }

      const root = createRoot(document.getElementById('root'));
      let generation = 0;
      const mount = (fixture = 'maximum', initialSelection = 'all') => {
        generation += 1;
        root.render(createElement(StrictMode, null, createElement(Host, {
          key: generation,
          fixture,
          initialSelection,
        })));
      };
      const reset = () => {
        calls.date.length = 0;
        calls.unrelated.length = 0;
      };
      window.__MATE_MOBILE_DATE_FILTER_TEST__ = {
        calls,
        mount,
        reset,
        restore: () => {
          window.fetch = originalFetch;
          XMLHttpRequest.prototype.open = originalXhrOpen;
          if (originalSendBeacon) navigator.sendBeacon = originalSendBeacon;
        },
      };
      mount();
    `;
  },
});

test('mobile date filter declares stable semantic targets and emitted interaction classes', () => {
  assert.match(componentSource, /data-testid="mate-mobile-date-filter"/);
  assert.match(componentSource, /data-testid="mate-mobile-date-filter-selected-label"/);
  assert.match(componentSource, /data-testid="mate-mobile-date-filter-scroller"/);
  assert.match(componentSource, /data-testid="mate-mobile-date-filter-all"/);
  assert.match(componentSource, /data-testid=\{`mate-mobile-date-filter-date-\$\{dateString\}`\}/);
  assert.doesNotMatch(componentSource, /h-\[42px\]/);
  assert.match(componentSource, /h-11/);
  assert.match(componentSource, /active:scale-\[0\.98\]/);
  assert.match(componentSource, /motion-reduce:transform-none/);
  assert.doesNotMatch(componentSource, /from ['"](?:\.\.\/)*api\//);
  assert.doesNotMatch(componentSource, /\b(?:axios|fetch|useQuery|useMutation)\b/);
});

test('actual mobile date filter keeps touch, rail, badge, keyboard, and callback contracts', {
  timeout: 90_000,
}, async () => {
  const server = await createServer({
    configFile: fileURLToPath(new URL('../../vite.visual-qa.config.ts', import.meta.url)),
    logLevel: 'silent',
    plugins: [createDateFilterPlugin()],
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

    type Calls = { date: string[]; unrelated: string[]; fetch: number; xhr: number; beacon: number };
    const mount = (fixture: string, initialSelection = 'all') => page.evaluate(({ nextFixture, nextSelection }) => {
      (window as unknown as { __MATE_MOBILE_DATE_FILTER_TEST__: {
        mount: (fixture: string, initialSelection: string) => void;
      } }).__MATE_MOBILE_DATE_FILTER_TEST__.mount(nextFixture, nextSelection);
    }, { nextFixture: fixture, nextSelection: initialSelection });
    const reset = () => page.evaluate(() => {
      (window as unknown as { __MATE_MOBILE_DATE_FILTER_TEST__: { reset: () => void } })
        .__MATE_MOBILE_DATE_FILTER_TEST__.reset();
    });
    const readCalls = () => page.evaluate(() => JSON.parse(JSON.stringify(
      (window as unknown as { __MATE_MOBILE_DATE_FILTER_TEST__: { calls: Calls } })
        .__MATE_MOBILE_DATE_FILTER_TEST__.calls,
    )) as Calls);
    const problems: string[] = [];
    const metrics: Record<string, unknown> = {};

    const inspectFixture = async (fixture: 'boundary' | 'maximum', viewportWidth: 320 | 390) => {
      await page.setViewportSize({ width: viewportWidth, height: viewportWidth === 320 ? 844 : 1000 });
      await mount(fixture);
      const section = page.getByRole('region', { name: '경기 날짜' });
      await section.waitFor({ timeout: 15_000 }).catch((error: unknown) => {
        throw new Error(`${String(error)}\n${diagnostics.join('\n')}`);
      });
      const scroller = section.getByLabel('경기 날짜 빠른 선택, 좌우로 스크롤');
      const buttons = section.getByRole('button');
      const rects = await buttons.evaluateAll((nodes) => nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return { height: rect.height, width: rect.width };
      }));
      const rail = await scroller.evaluate((node) => ({
        clientWidth: node.clientWidth,
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        scrollLeft: node.scrollLeft,
        scrollWidth: node.scrollWidth,
      }));
      metrics[`${fixture}-${viewportWidth}`] = { rail, rects };
      if (rects.some((rect) => rect.height < 44 || rect.width < 44)) {
        problems.push(`${fixture}/${viewportWidth} touch target below 44px: ${JSON.stringify(rects)}`);
      }
      if (rail.scrollWidth <= rail.clientWidth) problems.push(`${fixture}/${viewportWidth} does not overflow locally`);
      if (rail.documentOverflow !== 0) problems.push(`${fixture}/${viewportWidth} document overflow ${rail.documentOverflow}`);
      return { scroller, section };
    };

    for (const viewportWidth of [320, 390] as const) {
      await inspectFixture('boundary', viewportWidth);
      const { scroller, section } = await inspectFixture('maximum', viewportWidth);
      const sectionBox = await section.boundingBox();
      const headingBox = await section.getByRole('heading', { name: '경기 날짜' }).boundingBox();
      const label = section.locator('span').first();
      const labelBox = await label.boundingBox();
      metrics[`surface-${viewportWidth}`] = { sectionBox, headingBox, labelBox };
      if (!sectionBox || sectionBox.x < 0 || sectionBox.x + sectionBox.width > viewportWidth) {
        problems.push(`section escapes ${viewportWidth}px viewport`);
      }
      if (!headingBox || !labelBox || headingBox.x + headingBox.width > labelBox.x + 0.5) {
        problems.push(`heading and selected label overlap at ${viewportWidth}px`);
      }
      const gradients = section.locator('.pointer-events-none');
      if (await gradients.count() !== 2) problems.push('gradient count changed');
      for (let index = 0; index < await gradients.count(); index += 1) {
        if (await gradients.nth(index).evaluate((node) => getComputedStyle(node).pointerEvents) !== 'none') {
          problems.push('gradient intercepts pointer events');
        }
      }

      await scroller.focus();
      const beforeArrow = await scroller.evaluate((node) => node.scrollLeft);
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(
        ({ selector, before }) => (document.querySelector(selector)?.scrollLeft ?? 0) > before,
        { before: beforeArrow, selector: '[aria-label="경기 날짜 빠른 선택, 좌우로 스크롤"]' },
      ).catch(() => problems.push(`ArrowRight did not scroll at ${viewportWidth}px`));
      await scroller.evaluate((node) => { node.scrollLeft = 0; });
      await scroller.focus();
      await page.keyboard.press('Tab');
      const all = section.getByRole('button', { name: /전체 날짜 필터/ });
      if (!await all.evaluate((node) => node.matches(':focus-visible'))) {
        problems.push(`Tab did not move focus-visible to all at ${viewportWidth}px`);
      }
      const focusShadow = await all.evaluate((node) => getComputedStyle(node).boxShadow);
      if (focusShadow === 'none') problems.push(`all focus ring missing at ${viewportWidth}px`);

      for (const dateString of ['2027-12-24', '2027-12-31', '2028-01-06']) {
        const [month, day] = dateString.slice(5).split('-');
        const target = section.locator(`[aria-label^="${Number(month)}월 ${Number(day)}일"]`);
        await target.scrollIntoViewIfNeeded();
        const targetBox = await target.boundingBox();
        const scrollerBox = await scroller.boundingBox();
        if (!targetBox || !scrollerBox
          || targetBox.x < scrollerBox.x - 0.5
          || targetBox.x + targetBox.width > scrollerBox.x + scrollerBox.width + 0.5) {
          problems.push(`${dateString} not reachable at ${viewportWidth}px`);
        }
      }
    }

    await page.setViewportSize({ width: 320, height: 844 });
    await mount('long', 'first');
    const longSection = page.getByRole('region', { name: '경기 날짜' });
    await longSection.waitFor();
    const longLabel = longSection.locator('span').first();
    if (!/12월 31일 금/.test(await longLabel.textContent() ?? '')) problems.push('long Korean label is not visible');

    await mount('maximum', 'all');
    const first = page.locator('[aria-label^="12월 24일"]');
    await first.waitFor();
    await reset();
    await first.click();
    await page.locator('[aria-label^="12월 24일"][aria-pressed="true"]').waitFor({ timeout: 2_000 }).catch(() => {});
    let calls = await readCalls();
    if (JSON.stringify(calls.date) !== JSON.stringify(['2027-12-24']) || calls.unrelated.length !== 0) {
      problems.push(`first callback identity/count failed: ${JSON.stringify(calls)}`);
    }
    await first.click();
    await page.locator('[aria-label^="전체 날짜 필터"][aria-pressed="true"]').waitFor({ timeout: 2_000 }).catch(() => {});
    calls = await readCalls();
    if (JSON.stringify(calls.date) !== JSON.stringify(['2027-12-24', '2027-12-24'])) {
      problems.push(`same-date toggle callback failed: ${JSON.stringify(calls)}`);
    }

    await mount('maximum', 'outside');
    const outsideLabel = page.getByRole('region', { name: '경기 날짜' }).locator('span').first();
    await outsideLabel.waitFor();
    if (!/1월 7일/.test(await outsideLabel.textContent() ?? '')) problems.push('outside-range label missing');
    if (await page.getByRole('group', { name: '경기 날짜 필터' }).locator('button[aria-pressed="true"]:not([aria-label^="전체"])').count() !== 0) {
      problems.push('outside-range state selected an in-range date');
    }
    await reset();
    await page.locator('[aria-label^="전체 날짜 필터"]').click();
    await page.locator('[aria-label^="전체 날짜 필터"][aria-pressed="true"]').waitFor({ timeout: 2_000 }).catch(() => {});
    calls = await readCalls();
    if (JSON.stringify(calls.date) !== JSON.stringify(['all']) || calls.unrelated.length !== 0) {
      problems.push(`outside clear callback failed: ${JSON.stringify(calls)}`);
    }
    const stableCalls = JSON.stringify(calls);
    const scroller = page.getByLabel('경기 날짜 빠른 선택, 좌우로 스크롤');
    await scroller.evaluate((node) => { node.scrollLeft = Math.min(16, node.scrollWidth); });
    await scroller.focus();
    await page.keyboard.press('ArrowRight');
    await page.setViewportSize({ width: 390, height: 1000 });
    if (JSON.stringify(await readCalls()) !== stableCalls) problems.push('scroll/keyboard/resize replayed callback');
    calls = await readCalls();
    if (calls.fetch !== 0 || calls.xhr !== 0 || calls.beacon !== 0) {
      problems.push(`network activity detected: ${JSON.stringify(calls)}`);
    }
    if (diagnostics.length > 0) problems.push(`browser diagnostics: ${JSON.stringify(diagnostics)}`);

    assert.equal(problems.length, 0, `metrics=${JSON.stringify(metrics)} problems=${JSON.stringify(problems)}`);
  } finally {
    await browser?.close();
    await server.close();
  }
});
