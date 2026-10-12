#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
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
const BASE_URL = process.env.MYPAGE_READ_01_BASE_URL ?? 'http://127.0.0.1:5196';
const OUTPUT_ROOT = resolve(process.env.MYPAGE_READ_01_OUTPUT_ROOT ?? join(PROJECT_ROOT, '..', 'output', 'mobile-uiux-batch-20260917-mypage-read-01', 'custom'));
const WIDTHS = [320, 390];
const THEMES = ['light', 'dark'];
const SCALES = [1, 2];
const EXTRA_STATES = [
  { name: 'zero-light-320-200', fixture: 'zero', width: 320, theme: 'light', scale: 2 },
  { name: 'zero-dark-320-200', fixture: 'zero', width: 320, theme: 'dark', scale: 2 },
  { name: 'error-light-320-200', fixture: 'error', width: 320, theme: 'light', scale: 2 },
  { name: 'error-dark-320-200', fixture: 'error', width: 320, theme: 'dark', scale: 2 },
];

const sha256 = async (path) => createHash('sha256').update(await (await import('node:fs/promises')).readFile(path)).digest('hex');

const responseFor = (fixture, pathname) => {
  // AuthenticatedLayoutChrome also performs these read-only bootstrap calls on
  // /mypage. Keep them explicit so unrelated shell requests are distinguishable
  // from genuinely missing batch fixtures.
  if (/^\/api\/chat\/my\/unread-counts(?:\?|$)/.test(pathname)) return jsonResponse({ success: true, data: 0 });
  if (/^\/api\/dm\/rooms\/my(?:\?|$)/.test(pathname)) return jsonResponse({ success: true, data: [] });
  if (MYPAGE_READ_01_REQUESTS.profile.test(pathname)) {
    return jsonResponse({ success: true, data: fixture.profile });
  }
  if (MYPAGE_READ_01_REQUESTS.followCounts.test(pathname)) return jsonResponse(fixture.followCounts);
  if (MYPAGE_READ_01_REQUESTS.entries.test(pathname)) return jsonResponse(fixture.entries);
  if (MYPAGE_READ_01_REQUESTS.statistics.test(pathname)) {
    return fixture.statistics ? jsonResponse(fixture.statistics) : jsonResponse({ success: false, code: 'MYPAGE_READ_01_STATS_ERROR' }, 503);
  }
  return null;
};

const waitForPaint = async (page) => {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(150);
};

const textOf = (element) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();

const pageProbe = async () => {
  const root = document.documentElement;
  const viewportWidth = root.clientWidth;
  const viewportHeight = root.clientHeight;
  const textOf = (element) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const selectors = [
    '.mypage-season-name',
    '.mypage-season-handle',
    '.mypage-season-chip',
    '.mypage-season-head h1',
    '.mypage-season-stat-label',
    '.mypage-season-stat-value',
    '.mypage-season-stat-sub',
    '.mypage-season-panel-title',
    '.mypage-season-vs-name',
    '.mypage-season-vs-record',
    '.mypage-season-bar-label',
    '.mypage-season-filter-count',
  ];
  const measure = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      selector,
      text: textOf(element).slice(0, 180),
      rect: { left: Math.round(rect.left * 100) / 100, top: Math.round(rect.top * 100) / 100, width: Math.round(rect.width * 100) / 100, height: Math.round(rect.height * 100) / 100, right: Math.round(rect.right * 100) / 100, bottom: Math.round(rect.bottom * 100) / 100 },
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
  const styleOf = (element) => {
    const style = getComputedStyle(element);
    return { overflowX: style.overflowX, overflowY: style.overflowY, position: style.position, zIndex: style.zIndex };
  };
  const label = (element) => `${element.tagName.toLowerCase()}${typeof element.className === 'string' && element.className ? `.${element.className.trim().split(/\s+/).slice(0, 3).join('.')}` : ''}`.slice(0, 120);
  const rawOverflow = [];
  for (const element of document.querySelectorAll('body *')) {
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || rect.right <= viewportWidth + 1 || rect.left >= -1) continue;
    const style = getComputedStyle(element);
    rawOverflow.push({ label: label(element), text: textOf(element).slice(0, 80), right: Math.round(rect.right), overflowPx: Math.round(rect.right - viewportWidth), overflowX: style.overflowX });
  }
  const intentionalRegions = ['.mypage-season-nav', '.mypage-season-heat-scroll', '.mypage-season-tabs'].map((selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const style = getComputedStyle(element);
    return { selector, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, overflowX: style.overflowX, intentional: ['auto', 'scroll'].includes(style.overflowX) };
  }).filter(Boolean);
  window.scrollTo(0, document.documentElement.scrollHeight);
  await new Promise((resolve) => setTimeout(resolve, 500));
  const lastContent = document.querySelector('[data-screen-label="나의 기록"]') ?? document.querySelector('main');
  const lastRect = lastContent?.getBoundingClientRect();
  const fixedCoverHits = [];
  for (const element of document.querySelectorAll('body *')) {
    const style = getComputedStyle(element);
    if (!['fixed', 'sticky'].includes(style.position)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || rect.bottom <= 0 || rect.top >= viewportHeight) continue;
    if (lastRect && rect.bottom > lastRect.top && rect.top < lastRect.bottom) {
      fixedCoverHits.push({ label: label(element), rect: { top: Math.round(rect.top), bottom: Math.round(rect.bottom), left: Math.round(rect.left), right: Math.round(rect.right) }, position: style.position, zIndex: style.zIndex });
    }
  }
  return {
    viewport: { width: viewportWidth, height: viewportHeight },
    document: { clientWidth: root.clientWidth, scrollWidth: root.scrollWidth, scrollHeight: root.scrollHeight, bodyScrollWidth: document.body.scrollWidth, horizontalOverflowPx: root.scrollWidth - root.clientWidth },
    measurements: selectors.map(measure).filter(Boolean),
    rawOverflow: rawOverflow.sort((a, b) => b.overflowPx - a.overflowPx).slice(0, 12),
    intentionalRegions,
    fixedCoverHits,
    scrollY: window.scrollY,
  };
};

const runScenario = async ({ browser, scenario }) => {
  const browserName = browser.browserType().name();
  const context = await browser.newContext({
    viewport: { width: scenario.width, height: 844 },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
    colorScheme: scenario.theme,
  });
  const requests = { api: [], external: [], methods: [], unmatchedLocal: [], nonReadBlocked: [], responseUsed: [] };
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
    const response = responseFor(MYPAGE_READ_01_FIXTURES[scenario.fixture], url.pathname + url.search);
    if (!response) {
      requests.unmatchedLocal.push({ method: request.method(), url: request.url(), action: 'fulfilled-503', responseUsed: false });
      await route.fulfill(jsonResponse({ success: false, code: 'MYPAGE_READ_01_UNMATCHED_LOCAL' }, 503));
      return;
    }
    requests.api.push({ method: request.method(), url: request.url(), fixture: scenario.fixture, responseUsed: true, status: response.status });
    requests.responseUsed.push(request.url());
    await route.fulfill(response);
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto(`${BASE_URL}/mypage`, { waitUntil: 'domcontentloaded' });
  await settle(page);
  await page.waitForSelector('[data-testid="mypage-season-sidebar"]', { timeout: 8000 });
  await page.evaluate((scale) => { document.documentElement.style.fontSize = `${16 * scale}px`; }, scenario.scale);
  await waitForPaint(page);
  const profileBeforeStats = await page.evaluate(pageProbe);
  const statsToggle = page.locator('[data-testid="mypage-toggle-stats"]');
  await statsToggle.focus();
  const focusBeforeTab = await page.evaluate(() => ({ tag: document.activeElement?.tagName, testId: document.activeElement?.getAttribute('data-testid'), text: document.activeElement?.textContent?.trim() }));
  await page.keyboard.press('Tab');
  const focusAfterTab = await page.evaluate(() => ({ tag: document.activeElement?.tagName, testId: document.activeElement?.getAttribute('data-testid'), text: document.activeElement?.textContent?.trim() }));
  await statsToggle.click();
  await page.waitForSelector('[data-screen-label="나의 기록"]', { timeout: 8000 });
  await waitForPaint(page);
  const statsState = await page.evaluate(() => ({
    sectionText: document.querySelector('[data-screen-label="나의 기록"]')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 1000) ?? '',
    monthlyVisible: Boolean(document.querySelector('[data-testid="mypage-monthly-visit-bars"]')),
    emptyVisible: Boolean(document.querySelector('.mypage-season-empty')),
    busy: Boolean(document.querySelector('[aria-busy="true"]')),
  }));
  const scopeActions = [];
  for (const label of ['홈', '원정']) {
    const button = page.getByRole('tab', { name: label, exact: true });
    if (await button.count() === 0) continue;
    const disabled = await button.isDisabled();
    if (disabled) {
      scopeActions.push({ label, action: 'not-clicked', disabled: true });
      continue;
    }
    await button.click();
    await waitForPaint(page);
    scopeActions.push({ label, action: 'clicked', disabled: false, selected: await button.getAttribute('aria-selected'), sectionText: (await page.locator('[data-screen-label="나의 기록"]').innerText()).replace(/\s+/g, ' ').trim().slice(0, 600) });
  }
  const stats = await page.evaluate(pageProbe);
  await page.screenshot({ path: join(OUTPUT_ROOT, `${scenario.name}-stats.png`), fullPage: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(OUTPUT_ROOT, `${scenario.name}-profile.png`), fullPage: false });
  await context.close();
  return {
    scenario,
    browser: browserName,
    rootFontSizeMethod: 'document.documentElement.style.fontSize = 16px * scale; browser zoom 100%; deviceScaleFactor 1; OS text size not changed',
    profileBeforeStats,
    statsState,
    scopeActions,
    stats,
    focusBeforeTab,
    focusAfterTab,
    requests,
    serviceWorkers: 'block',
    pageErrors,
    consoleErrors,
  };
};

const main = async () => {
  await mkdir(OUTPUT_ROOT, { recursive: true });
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const scenarios = [
    ...WIDTHS.flatMap((width) => THEMES.flatMap((theme) => SCALES.map((scale) => ({ name: `populated-${theme}-${width}-${scale * 100}`, fixture: 'populated', width, theme, scale })))),
    ...EXTRA_STATES,
  ];
  const results = [];
  for (const scenario of scenarios) {
    results.push(await runScenario({ browser, scenario }));
  }
  await browser.close();
  const sourceFiles = [
    'src/components/MyPageRuntime.tsx',
    'src/components/mypage/MyPageSidebarRuntime.tsx',
    'src/components/mypage/Diarystatistics.tsx',
    'src/components/mypage/MyPageSeason.css',
    'scripts/mypage-read-01-fixtures.mjs',
    'scripts/mypage-read-01-audit.mjs',
  ];
  const sourceHashes = {};
  for (const source of sourceFiles) sourceHashes[source] = await sha256(join(PROJECT_ROOT, source));
  const report = {
    batch: 'MYPAGE-READ-01',
    route: '/mypage',
    baseUrl: BASE_URL,
    browser: 'chromium',
    matrix: { widths: WIDTHS, themes: THEMES, rootScales: SCALES, extraStates: EXTRA_STATES },
    sourceHashes,
    results,
    counts: { total: results.length, pageErrors: results.filter((result) => result.pageErrors.length).length, consoleErrors: results.filter((result) => result.consoleErrors.length).length, nonReadBlocked: results.reduce((count, result) => count + result.requests.nonReadBlocked.length, 0), unmatchedLocal: results.reduce((count, result) => count + result.requests.unmatchedLocal.length, 0), externalBlocked: results.reduce((count, result) => count + result.requests.external.length, 0) },
  };
  await writeFile(join(OUTPUT_ROOT, 'mypage-read-01-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ output: join(OUTPUT_ROOT, 'mypage-read-01-audit.json'), counts: report.counts, scenarios: results.map(({ scenario, stats, statsState }) => ({ scenario: scenario.name, horizontalOverflowPx: stats.document.horizontalOverflowPx, fixedCoverHits: stats.fixedCoverHits.length, monthlyVisible: statsState.monthlyVisible, emptyVisible: statsState.emptyVisible })) }, null, 2));
};

main().catch((error) => { console.error(error); process.exitCode = 1; });
