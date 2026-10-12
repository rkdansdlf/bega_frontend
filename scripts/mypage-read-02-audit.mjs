#!/usr/bin/env node
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadPlaywright, settle } from './reflow-320-audit.mjs';
import {
  jsonResponse,
  MYPAGE_READ_01_FIXTURES,
  MYPAGE_READ_01_REQUESTS,
} from './mypage-read-01-fixtures.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..');
const BASE_URL = process.env.MYPAGE_READ_02_BASE_URL ?? 'http://127.0.0.1:5198';
const OUTPUT_ROOT = resolve(
  process.env.MYPAGE_READ_02_OUTPUT_ROOT
    ?? join(PROJECT_ROOT, '..', 'output', 'mobile-uiux-batch-20260917-mypage-read-02', 'before'),
);
const WIDTHS = (process.env.MYPAGE_READ_02_WIDTHS ?? '320')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);

const waitForPaint = async (page) => {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(150);
};

const pageProbe = async (page) => page.evaluate(async () => {
  const root = document.documentElement;
  const viewportWidth = root.clientWidth;
  const viewportHeight = root.clientHeight;
  const textOf = (element) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const selectors = [
    '.mypage-season-name',
    '.mypage-season-handle',
    '.mypage-season-head h1',
    '.mypage-season-stat-label',
    '.mypage-season-stat-value',
    '.mypage-season-stat-sub',
    '.mypage-season-panel-title',
    '.mypage-season-seg button',
    '.mypage-season-empty-title',
    '.mypage-season-empty-copy',
  ];
  const measure = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      selector,
      text: textOf(element).slice(0, 180),
      rect: {
        left: Math.round(rect.left * 100) / 100,
        top: Math.round(rect.top * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
        right: Math.round(rect.right * 100) / 100,
        bottom: Math.round(rect.bottom * 100) / 100,
      },
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      overflowWrap: style.overflowWrap,
      whiteSpace: style.whiteSpace,
      wordBreak: style.wordBreak,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      clipped: element.scrollWidth > element.clientWidth + 1,
    };
  };
  const label = (element) => `${element.tagName.toLowerCase()}${typeof element.className === 'string' && element.className ? `.${element.className.trim().split(/\s+/).slice(0, 3).join('.')}` : ''}`.slice(0, 120);
  const rawOverflow = [];
  for (const element of document.querySelectorAll('body *')) {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || rect.right <= viewportWidth + 1 || rect.left >= -1) continue;
    const style = getComputedStyle(element);
    rawOverflow.push({
      label: label(element),
      text: textOf(element).slice(0, 80),
      right: Math.round(rect.right),
      overflowPx: Math.round(rect.right - viewportWidth),
      overflowX: style.overflowX,
    });
  }
  const fixedCoverHits = [];
  const lastContent = document.querySelector('[data-screen-label="나의 기록"]') ?? document.querySelector('main');
  const lastRect = lastContent?.getBoundingClientRect();
  for (const element of document.querySelectorAll('body *')) {
    const style = getComputedStyle(element);
    if (!['fixed', 'sticky'].includes(style.position)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || rect.bottom <= 0 || rect.top >= viewportHeight) continue;
    if (lastRect && rect.bottom > lastRect.top && rect.top < lastRect.bottom) {
      fixedCoverHits.push({
        label: label(element),
        rect: { top: Math.round(rect.top), bottom: Math.round(rect.bottom), left: Math.round(rect.left), right: Math.round(rect.right) },
        position: style.position,
        zIndex: style.zIndex,
      });
    }
  }
  const toastTexts = [...document.querySelectorAll('[data-sonner-toast], [role="alert"]')]
    .map((element) => textOf(element))
    .filter(Boolean);
  return {
    viewport: { width: viewportWidth, height: viewportHeight },
    document: {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      scrollHeight: root.scrollHeight,
      bodyScrollWidth: document.body.scrollWidth,
      horizontalOverflowPx: root.scrollWidth - root.clientWidth,
    },
    metrics: selectors.map(measure).filter(Boolean),
    rawOverflow: rawOverflow.sort((a, b) => b.overflowPx - a.overflowPx).slice(0, 12),
    fixedCoverHits,
    toastTexts,
    browser: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      visualViewportScale: window.visualViewport?.scale ?? null,
      rootFontSize: getComputedStyle(root).fontSize,
    },
    scrollY: window.scrollY,
  };
});

const responseFor = (fixture, pathname) => {
  if (/^\/api\/chat\/my\/unread-counts(?:\?|$)/.test(pathname)) return jsonResponse({ success: true, data: 0 });
  if (/^\/api\/dm\/rooms\/my(?:\?|$)/.test(pathname)) return jsonResponse({ success: true, data: [] });
  if (MYPAGE_READ_01_REQUESTS.profile.test(pathname)) return jsonResponse({ success: true, data: fixture.profile });
  if (MYPAGE_READ_01_REQUESTS.followCounts.test(pathname)) return jsonResponse(fixture.followCounts);
  if (MYPAGE_READ_01_REQUESTS.entries.test(pathname)) return jsonResponse(fixture.entries);
  if (MYPAGE_READ_01_REQUESTS.statistics.test(pathname)) {
    return fixture.statistics
      ? jsonResponse(fixture.statistics)
      : jsonResponse({ success: false, code: 'MYPAGE_READ_02_STATS_ERROR' }, 503);
  }
  return null;
};

const waitForFinalStatisticsFailure = async (page, statisticsRequests) => {
  const deadline = Date.now() + 16000;
  const observations = [];
  let lastObservation = '';
  while (statisticsRequests.length < 2 && Date.now() < deadline) {
    await page.waitForTimeout(250);
  }
  const observationDeadline = Date.now() + 5000;
  while (Date.now() < observationDeadline) {
    const observation = await page.evaluate(() => ({
      at: Date.now(),
      emptyTitle: document.querySelector('.mypage-season-empty-title')?.textContent?.trim() ?? '',
      sectionText: document.querySelector('[data-screen-label="나의 기록"]')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 300) ?? '',
      toastTexts: [...document.querySelectorAll('[data-sonner-toast], [role="alert"]')]
        .map((element) => element.textContent?.replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    }));
    const signature = JSON.stringify({ emptyTitle: observation.emptyTitle, sectionText: observation.sectionText, toastTexts: observation.toastTexts });
    if (signature !== lastObservation) {
      observations.push(observation);
      lastObservation = signature;
    }
    await page.waitForTimeout(250);
  }
  await waitForPaint(page);
  return {
    observedAttempts: statisticsRequests.length,
    finalFailureObserved: statisticsRequests.length >= 2,
    waitedMs: 16000 - Math.max(0, deadline - Date.now()),
    observations,
  };
};

const attemptBrowserZoom = async (page) => {
  const before = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    visualViewportScale: window.visualViewport?.scale ?? null,
    rootFontSize: getComputedStyle(document.documentElement).fontSize,
  }));
  const shortcuts = ['Control+Shift+Equal', 'Meta+Shift+Equal'];
  const attempts = [];
  for (const shortcut of shortcuts) {
    await page.keyboard.press(shortcut).catch((error) => attempts.push({ shortcut, error: String(error) }));
    await page.waitForTimeout(250);
    attempts.push({ shortcut, state: await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      visualViewportScale: window.visualViewport?.scale ?? null,
      rootFontSize: getComputedStyle(document.documentElement).fontSize,
    })) });
  }
  const after = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    visualViewportScale: window.visualViewport?.scale ?? null,
    rootFontSize: getComputedStyle(document.documentElement).fontSize,
  }));
  return {
    method: 'Playwright keyboard browser-zoom shortcuts in headless Chromium; no CSS transform, root override, viewport resize, or DPR change',
    shortcuts,
    before,
    attempts,
    after,
    changed: JSON.stringify(before) !== JSON.stringify(after),
    reliableActualBrowserZoomObserved: false,
  };
};

const runScenario = async ({ browser, scenario }) => {
  const context = await browser.newContext({
    viewport: { width: scenario.width, height: 844 },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
    colorScheme: scenario.theme,
  });
  const requests = { api: [], external: [], methods: [], unmatchedLocal: [], nonReadBlocked: [] };
  const statisticsRequests = [];
  const webSockets = [];
  const pageErrors = [];
  const consoleErrors = [];
  await context.addInitScript(({ theme }) => {
    localStorage.setItem('auth-bootstrap-hint', '1');
    localStorage.setItem('kbo-theme', theme);
  }, { theme: scenario.theme });
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requests.methods.push({ method: request.method(), url: request.url() });
    if (url.origin !== new URL(BASE_URL).origin) {
      requests.external.push({ method: request.method(), url: request.url(), responseUsed: false, action: 'aborted' });
      await route.abort('blockedbyclient');
      return;
    }
    if (!url.pathname.startsWith('/api')) {
      await route.continue();
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method())) {
      requests.nonReadBlocked.push({ method: request.method(), url: request.url(), action: 'aborted' });
      await route.abort('blockedbyclient');
      return;
    }
    const pathname = url.pathname + url.search;
    const response = responseFor(MYPAGE_READ_01_FIXTURES[scenario.fixture], pathname);
    if (!response) {
      requests.unmatchedLocal.push({ method: request.method(), url: request.url(), action: 'fulfilled-503', responseUsed: false });
      await route.fulfill(jsonResponse({ success: false, code: 'MYPAGE_READ_02_UNMATCHED_LOCAL' }, 503));
      return;
    }
    const record = { method: request.method(), url: request.url(), fixture: scenario.fixture, responseUsed: true, status: response.status };
    requests.api.push(record);
    if (MYPAGE_READ_01_REQUESTS.statistics.test(pathname)) statisticsRequests.push(record);
    await route.fulfill(response);
  });
  const page = await context.newPage();
  page.on('websocket', (webSocket) => {
    const record = { url: webSocket.url(), framesSent: [], framesReceived: [], errors: [], closed: false };
    webSockets.push(record);
    webSocket.on('framesent', (payload) => record.framesSent.push(String(payload).slice(0, 300)));
    webSocket.on('framereceived', (payload) => record.framesReceived.push(String(payload).slice(0, 300)));
    webSocket.on('socketerror', (error) => record.errors.push(String(error)));
    webSocket.on('close', () => { record.closed = true; });
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto(`${BASE_URL}/mypage`, { waitUntil: 'domcontentloaded' });
  await settle(page);
  await page.waitForSelector('[data-testid="mypage-season-sidebar"]', { timeout: 8000 });
  if (scenario.rootScale !== 1) {
    await page.evaluate((scale) => { document.documentElement.style.fontSize = `${16 * scale}px`; }, scenario.rootScale);
    await waitForPaint(page);
  }
  const profileProbe = await pageProbe(page);
  const browserZoom = scenario.attemptBrowserZoom ? await attemptBrowserZoom(page) : null;
  const statsToggle = page.locator('[data-testid="mypage-toggle-stats"]');
  await statsToggle.click();
  await page.waitForSelector('[data-screen-label="나의 기록"]', { timeout: 8000 });
  const errorObservation = scenario.fixture === 'error'
    ? await waitForFinalStatisticsFailure(page, statisticsRequests)
    : null;
  if (scenario.fixture !== 'error') await waitForPaint(page);
  const statsProbe = await pageProbe(page);
  const statsState = await page.evaluate(() => {
    const section = document.querySelector('[data-screen-label="나의 기록"]');
    const text = (section?.textContent ?? '').replace(/\s+/g, ' ').trim();
    return {
      sectionText: text.slice(0, 1200),
      monthlyVisible: Boolean(document.querySelector('[data-testid="mypage-monthly-visit-bars"]')),
      emptyVisible: Boolean(document.querySelector('.mypage-season-empty')),
      emptyTitle: document.querySelector('.mypage-season-empty-title')?.textContent?.trim() ?? '',
      emptyDescription: document.querySelector('.mypage-season-empty-copy')?.textContent?.trim() ?? '',
      errorAlertTexts: [...document.querySelectorAll('[role="alert"]')].map((element) => element.textContent?.replace(/\s+/g, ' ').trim()).filter(Boolean),
      sonnerTexts: [...document.querySelectorAll('[data-sonner-toast]')].map((element) => element.textContent?.replace(/\s+/g, ' ').trim()).filter(Boolean),
    };
  });
  await page.screenshot({ path: join(OUTPUT_ROOT, `${scenario.name}.png`), fullPage: true });
  await context.close();
  return {
    scenario,
    browser: 'chromium',
    rootFontSizeMethod: scenario.rootScale === 1
      ? 'root default; browser zoom 100%; deviceScaleFactor 1; OS text size unchanged'
      : `document.documentElement.style.fontSize = 16px * ${scenario.rootScale}; browser zoom 100%; deviceScaleFactor 1; OS text size unchanged; layout stress only`,
    browserZoom,
    profileProbe,
    statsProbe,
    statsState,
    errorObservation,
    statisticsRequests,
    requests,
    webSockets,
    serviceWorkers: 'block',
    pageErrors,
    consoleErrors,
  };
};

const sha256 = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');

const main = async () => {
  await mkdir(OUTPUT_ROOT, { recursive: true });
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const scenarios = [
    ...WIDTHS.flatMap((width) => ['light', 'dark'].flatMap((theme) => [
      { name: `populated-${theme}-${width}-root16`, fixture: 'populated', width, theme, rootScale: 1, attemptBrowserZoom: width === 320 },
      { name: `populated-${theme}-${width}-root32`, fixture: 'populated', width, theme, rootScale: 2, attemptBrowserZoom: false },
      { name: `zero-${theme}-${width}-root32`, fixture: 'zero', width, theme, rootScale: 2, attemptBrowserZoom: false },
      { name: `error-${theme}-${width}-root32`, fixture: 'error', width, theme, rootScale: 2, attemptBrowserZoom: false },
    ])),
  ];
  const results = [];
  for (const scenario of scenarios) results.push(await runScenario({ browser, scenario }));
  await browser.close();
  const sourceFiles = [
    'src/hooks/useDiaryStatistics.ts',
    'src/components/mypage/DiaryStatistics.tsx',
    'src/components/mypage/MyPageSeasonEmptyState.tsx',
    'src/components/mypage/MyPageSeason.css',
    'src/components/MyPageRuntime.tsx',
    'scripts/mypage-read-01-fixtures.mjs',
    'scripts/mypage-read-01-audit.mjs',
    'scripts/mypage-read-02-audit.mjs',
  ];
  const sourceHashes = {};
  for (const source of sourceFiles) sourceHashes[source] = await sha256(join(PROJECT_ROOT, source));
  const report = {
    batch: 'MYPAGE-READ-02',
    route: '/mypage',
    baseUrl: BASE_URL,
    browser: 'chromium headless',
    matrix: {
      widths: WIDTHS,
      themes: ['light', 'dark'],
      rootScales: [1, 2],
      fixtures: ['populated', 'zero', 'error'],
      actualBrowserZoom: 'attempted by keyboard shortcut only; no reliable effect observed',
    },
    sourceHashes,
    results,
    counts: {
      total: results.length,
      pageErrors: results.filter((result) => result.pageErrors.length).length,
      consoleErrors: results.filter((result) => result.consoleErrors.length).length,
      nonReadBlocked: results.reduce((count, result) => count + result.requests.nonReadBlocked.length, 0),
      unmatchedLocal: results.reduce((count, result) => count + result.requests.unmatchedLocal.length, 0),
      externalBlocked: results.reduce((count, result) => count + result.requests.external.length, 0),
      actualBrowserZoomObserved: results.filter((result) => result.browserZoom?.reliableActualBrowserZoomObserved).length,
    },
  };
  const reportPath = join(OUTPUT_ROOT, 'mypage-read-02-audit.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    output: reportPath,
    counts: report.counts,
    states: results.map(({ scenario, statsState, statisticsRequests, browserZoom }) => ({
      scenario: scenario.name,
      statisticsStatuses: statisticsRequests.map((request) => request.status),
      emptyTitle: statsState.emptyTitle,
      monthlyVisible: statsState.monthlyVisible,
      toastTexts: statsState.sonnerTexts,
      browserZoomChanged: browserZoom?.changed ?? null,
      overflowPx: statsState.emptyVisible ? undefined : undefined,
    })),
  }, null, 2));
};

main().catch((error) => { console.error(error); process.exitCode = 1; });
