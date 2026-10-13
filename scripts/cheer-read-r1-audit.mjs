import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '/Users/mac/project/KBO_platform/bega_frontend/node_modules/playwright/index.mjs';
import { findFixture } from '/Users/mac/project/KBO_platform/bega_frontend/scripts/reflow-320-fixtures.mjs';
import {
  cheerReadR1FixtureForRequest,
  imageAssetForPath,
  READ_R1_IMAGE_PATHS,
} from './cheer-read-r1-fixtures.mjs';

const outputRoot = path.resolve(process.env.AUDIT_OUTPUT_ROOT || '/Users/mac/project/KBO_platform/output/mobile-uiux-batch-20260916-cheer-read-r1/before');
const baseUrl = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5194';
const baseOrigin = new URL(baseUrl).origin;
const executable = process.env.AUDIT_BROWSER_EXECUTABLE || '/Users/mac/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const token = 'cheer-read-r1-local-read-only-token';
const widths = [320, 390];
const themes = ['light', 'dark'];
const scales = [100, 200];

const authUser = {
  id: 123,
  email: 'cheer-read-r1@example.com',
  name: '응원 읽기 검증 사용자',
  handle: 'cheer-read-r1',
  favoriteTeam: 'HH',
  role: 'ROLE_USER',
  hasPassword: true,
  profileImageUrl: null,
};

const jsonResponse = (body, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const fixtureBody = (url) => {
  const fixture = findFixture(url);
  return fixture ? fixture.body(url, { pagePathname: new URL(url).pathname }) : null;
};

const fixtureForRequest = (request) => {
  const url = new URL(request.url());
  const { pathname, search } = url;
  if (pathname === '/api/auth/mypage') return jsonResponse({ success: true, data: authUser });
  if (pathname === '/api/auth/reissue') return jsonResponse({ success: false, code: 'LOCAL_READ_ONLY_NO_REISSUE' }, 401);
  if (pathname === '/api/kbo/schedule') return jsonResponse([]);
  if (pathname === '/api/franchises/code/HH') return jsonResponse({ id: 1, name: '한화 이글스', originalCode: 'HH', currentCode: 'HH' });
  if (pathname === '/api/franchises/1/metadata') return jsonResponse({ summary: '응원 읽기 로컬 검증 정보입니다.' });
  if (pathname === '/api/cheer/posts/changes') return jsonResponse({ latestId: 5, newCount: 0, posts: [] });
  if (pathname === '/api/cheer/posts/1' || pathname === '/api/cheer/posts/1/comments' || pathname === '/api/cheer/posts/1/images') {
    return jsonResponse(cheerReadR1FixtureForRequest(request.url()));
  }
  const fixture = fixtureBody(request.url());
  return fixture === null ? null : jsonResponse(fixture);
};

const slug = ({ width, theme, scale }) => `cheer-read-r1-${width}-${theme}-${scale}`;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const seedStorage = async (page, theme) => {
  await page.addInitScript(({ selectedTheme, user, authToken }) => {
    window.__cheerScrollTrace = [];
    const originalScrollTo = window.scrollTo.bind(window);
    window.scrollTo = (...args) => {
      window.__cheerScrollTrace.push({ type: 'call', args, before: window.scrollY });
      return originalScrollTo(...args);
    };
    window.addEventListener('scroll', () => {
      window.__cheerScrollTrace.push({ type: 'event', y: window.scrollY });
    }, { passive: true });
    window.localStorage.setItem('auth-storage', JSON.stringify({
      state: { user, isLoggedIn: true, isAdmin: false, isAuthLoading: false },
      version: 0,
    }));
    window.localStorage.setItem('accessToken', authToken);
    window.localStorage.setItem('auth-bootstrap-hint', '1');
    window.localStorage.setItem('kbo-theme', selectedTheme);
    window.document.cookie = `Authorization=${authToken}; path=/`;
    window.sessionStorage.setItem('cypress:skip-public-auth-bootstrap', '1');
  }, { selectedTheme: theme, user: authUser, authToken: token });
};

const inspect = async (page, phase) => page.evaluate((phaseName) => {
  const visible = (element) => {
    if (!element) return false;
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0.01;
  };
  const bounds = (element) => {
    if (!element) return null;
    const value = element.getBoundingClientRect();
    return {
      left: Math.round(value.left * 100) / 100,
      right: Math.round(value.right * 100) / 100,
      top: Math.round(value.top * 100) / 100,
      bottom: Math.round(value.bottom * 100) / 100,
      width: Math.round(value.width * 100) / 100,
      height: Math.round(value.height * 100) / 100,
    };
  };
  const label = (element) => element?.getAttribute('data-testid') || element?.getAttribute('aria-label') || element?.tagName?.toLowerCase() || null;
  const intentionalParent = (element) => {
    let parent = element.parentElement;
    while (parent && parent !== document.documentElement) {
      const style = getComputedStyle(parent);
      if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && parent.scrollWidth > parent.clientWidth) return true;
      parent = parent.parentElement;
    }
    return false;
  };
  const overflowing = [...document.querySelectorAll('body *')]
    .filter(visible)
    .map((element) => ({ element, value: element.getBoundingClientRect() }))
    .filter(({ element, value }) => !intentionalParent(element) && (value.left < -1 || value.right > window.innerWidth + 1))
    .map(({ element, value }) => ({ label: label(element), text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120), rect: bounds(element) }))
    .slice(0, 30);
  const nav = document.querySelector('[data-testid="cheer-mobile-bottom-nav"], [data-testid="public-mobile-bottom-nav"]');
  const navBounds = visible(nav) ? nav.getBoundingClientRect() : null;
  const protectedElements = [...document.querySelectorAll('button, a[href], input, textarea, select, [role="button"], [role="list"], [role="listitem"]')].filter(visible);
  const navCovers = navBounds ? protectedElements.filter((element) => {
    if (nav?.contains(element)) return false;
    const value = element.getBoundingClientRect();
    return value.top >= 0 && value.bottom <= window.innerHeight
      && value.left < navBounds.right && value.right > navBounds.left
      && value.top < navBounds.bottom && value.bottom > navBounds.top;
  }).map(label) : [];
  const textSizes = [
    '[data-testid="cheer-post-card"]',
    'article',
    '[role="listitem"]',
    '[role="img"]',
    '[aria-label="댓글 목록"]',
  ].flatMap((selector) => [...document.querySelectorAll(selector)].filter(visible).slice(0, 4).map((element) => {
    const style = getComputedStyle(element);
    return { selector, text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100), fontSize: style.fontSize, lineHeight: style.lineHeight, rect: bounds(element) };
  }));
  const imageElements = [...document.querySelectorAll('img[alt^="게시 이미지"]')].map((element) => ({
    alt: element.getAttribute('alt'),
    src: element.getAttribute('src'),
    complete: element.complete,
    naturalWidth: element.naturalWidth,
    naturalHeight: element.naturalHeight,
    display: visible(element),
    rect: bounds(element),
  }));
  const failedImages = [...document.querySelectorAll('[role="img"][aria-label^="게시 이미지"]')].map((element) => ({
    label: element.getAttribute('aria-label'),
    rect: bounds(element),
    display: visible(element),
  }));
  const commentsSection = document.querySelector('#cheer-comments-section');
  const list = document.querySelector('[role="list"][aria-label="댓글 목록"]');
  const listItems = [...document.querySelectorAll('[role="listitem"]')];
  const lastListItem = listItems.at(-1);
  const lastListItemBounds = lastListItem?.getBoundingClientRect();
  return {
    phase: phaseName,
    route: window.location.pathname + window.location.search,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    scrollY: window.scrollY,
    document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
    rootFontSize: getComputedStyle(document.documentElement).fontSize,
    bodyFontSize: getComputedStyle(document.body).fontSize,
    textSizes,
    images: imageElements,
    failedImages,
    comments: {
      section: bounds(commentsSection),
      loading: Boolean(commentsSection?.querySelector('[aria-busy="true"]')),
      text: (commentsSection?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 500),
      list: bounds(list),
      listItemCount: listItems.length,
      lastItemText: (listItems.at(-1)?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240),
      lastItemVisible: Boolean(lastListItemBounds && lastListItemBounds.top >= 0 && lastListItemBounds.bottom <= window.innerHeight),
    },
    overflowCount: overflowing.length,
    overflowSample: overflowing,
    nav: bounds(nav),
    navCovers,
    activeElement: label(document.activeElement),
  };
}, phase);

const waitForFeed = async (page) => {
  await page.locator('[data-testid="cheer-feed-section"]').waitFor({ timeout: 15_000 });
  await page.locator('[data-testid="cheer-post-card"]').first().waitFor({ timeout: 15_000 });
};

const waitForDetailShell = async (page) => {
  await page.locator('article').first().waitFor({ timeout: 15_000 });
  await page.getByRole('button', { name: '이전으로' }).waitFor({ timeout: 15_000 });
  await page.locator('#cheer-comments-section').waitFor({ timeout: 15_000 });
};

const runScenario = async (browser, scenario) => {
  const context = await browser.newContext({
    viewport: { width: scenario.width, height: 844 },
    serviceWorkers: 'block',
    colorScheme: scenario.theme,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const requestLog = [];
  const imageRequests = [];
  const unmatchedLocalRequests = [];
  const externalRequestsBlocked = [];
  const nonReadRequestsBlocked = [];
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requestLog.push({ method: request.method(), origin: url.origin, pathname: url.pathname, search: url.search });
    if (url.origin !== baseOrigin) {
      externalRequestsBlocked.push({ method: request.method(), url: request.url(), responseUsed: false });
      await route.abort();
      return;
    }
    const imageAsset = request.method() === 'GET' ? imageAssetForPath(url.pathname) : null;
    if (imageAsset) {
      const event = { path: url.pathname, method: request.method(), status: imageAsset.status, started: Date.now(), completed: false, responseUsed: false };
      imageRequests.push(event);
      if (imageAsset.delayMs) await delay(imageAsset.delayMs);
      await route.fulfill({ status: imageAsset.status, contentType: imageAsset.contentType, body: imageAsset.body });
      event.completed = true;
      event.responseUsed = imageAsset.status >= 200 && imageAsset.status < 300;
      event.completedAt = Date.now();
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      if (request.method() !== 'GET' && request.method() !== 'HEAD') {
        nonReadRequestsBlocked.push({ method: request.method(), url: request.url(), responseUsed: false });
        await route.abort();
        return;
      }
      const response = fixtureForRequest(request);
      if (!response) {
        unmatchedLocalRequests.push({ method: request.method(), url: request.url() });
        await route.abort();
        return;
      }
      if (url.pathname === '/api/cheer/posts/1/comments') await delay(700);
      await route.fulfill(response);
      return;
    }
    await route.continue();
  });

  await seedStorage(page, scenario.theme);
  await page.goto(`${baseUrl}/cheer`, { waitUntil: 'domcontentloaded' });
  await waitForFeed(page);
  if (scenario.scale === 200) {
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await page.waitForTimeout(250);
  }

  const evidence = {
    scenario,
    textScaleMethod: scenario.scale === 200
      ? 'html { font-size: 200% !important; } (root font-size; browser zoom 100%; deviceScaleFactor 1)'
      : 'root font-size unchanged (100%; browser zoom 100%; deviceScaleFactor 1)',
    actions: [],
  };
  evidence.listInitial = await inspect(page, 'list-initial');
  await page.screenshot({ path: path.join(outputRoot, `${slug(scenario)}-list-initial.png`), fullPage: false });

  await page.evaluate(() => window.scrollTo({ top: Math.min(620, document.documentElement.scrollHeight), left: 0, behavior: 'instant' }));
  await page.waitForTimeout(100);
  evidence.listScrolled = await inspect(page, 'list-scrolled');
  evidence.actions.push({ type: 'list-scroll', scrollY: evidence.listScrolled.scrollY });
  await page.screenshot({ path: path.join(outputRoot, `${slug(scenario)}-list-scrolled.png`), fullPage: false });

  await page.locator('[data-testid="cheer-post-card"]').first().click();
  await page.waitForURL(/\/cheer\/1$/, { timeout: 15_000 });
  await waitForDetailShell(page);
  evidence.actions.push({ type: 'card-to-detail', route: new URL(page.url()).pathname });
  evidence.detailShell = await inspect(page, 'detail-shell');
  await page.screenshot({ path: path.join(outputRoot, `${slug(scenario)}-detail-shell.png`), fullPage: false });

  const imageLocators = page.locator('img[alt^="게시 이미지"]');
  await imageLocators.nth(0).waitFor({ timeout: 15_000 });
  await imageLocators.nth(0).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('img[alt="게시 이미지 1"]')?.complete && (document.querySelector('img[alt="게시 이미지 1"]')?.naturalWidth ?? 0) > 0, undefined, { timeout: 15_000 });
  if (await imageLocators.count() > 1) await imageLocators.nth(1).scrollIntoViewIfNeeded();
  if (await imageLocators.count() > 2) await imageLocators.nth(2).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Boolean(document.querySelector('[role="img"][aria-label="게시 이미지 3을 불러올 수 없습니다"]')), undefined, { timeout: 15_000 });
  evidence.imagesPending = await inspect(page, 'images-requested');
  await page.screenshot({ path: path.join(outputRoot, `${slug(scenario)}-images-requested.png`), fullPage: false });

  const readingTop = await page.evaluate(() => {
    const article = document.querySelector('article');
    const articleTop = (article?.getBoundingClientRect().top ?? 0) + window.scrollY;
    const target = articleTop + Math.min(360, Math.max(160, (article?.getBoundingClientRect().height ?? 500) * 0.35));
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight - 8);
    const next = Math.min(max, Math.max(0, target));
    window.scrollTo({ top: next, left: 0, behavior: 'instant' });
    return next;
  });
  evidence.readingPending = await inspect(page, 'reading-while-assets-pending');
  await page.waitForFunction(() => {
    const delayed = [...document.querySelectorAll('img[alt="게시 이미지 2"]')].at(0);
    return !delayed || delayed.complete;
  }, undefined, { timeout: 15_000 });
  await page.waitForTimeout(150);
  evidence.readingAfterAssets = await inspect(page, 'reading-after-assets');
  evidence.actions.push({ type: 'image-reading-stability', requestedScrollY: readingTop, pendingScrollY: evidence.readingPending.scrollY, afterScrollY: evidence.readingAfterAssets.scrollY });
  await page.screenshot({ path: path.join(outputRoot, `${slug(scenario)}-reading-after-assets.png`), fullPage: false });

  await page.evaluate(() => document.getElementById('cheer-comments-section')?.scrollIntoView({ behavior: 'instant', block: 'start' }));
  evidence.commentsPending = await inspect(page, 'comments-pending');
  await page.waitForFunction(() => document.querySelectorAll('[role="list"][aria-label="댓글 목록"] [role="listitem"]').length === 3, undefined, { timeout: 15_000 });
  await page.locator('[role="list"][aria-label="댓글 목록"] [role="listitem"]').last().evaluate((element) => {
    element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' });
  });
  await page.waitForTimeout(150);
  evidence.commentsLoaded = await inspect(page, 'comments-loaded');
  evidence.actions.push({ type: 'comments-read', listItemCount: evidence.commentsLoaded.comments.listItemCount, lastCommentText: evidence.commentsLoaded.comments.lastItemText });
  await page.screenshot({ path: path.join(outputRoot, `${slug(scenario)}-comments-loaded.png`), fullPage: false });

  const refetchBeforeScroll = await page.evaluate(() => {
    const section = document.querySelector('#cheer-comments-section');
    const sectionTop = (section?.getBoundingClientRect().top ?? 0) + window.scrollY;
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight - 8);
    const next = Math.min(max, Math.max(0, sectionTop - 80));
    window.scrollTo({ top: next, left: 0, behavior: 'instant' });
    return next;
  });
  const detailRequestsBeforeRefetch = requestLog.filter((request) => request.pathname === '/api/cheer/posts/1').length;
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(650);
  const detailRequestsAfterRefetch = requestLog.filter((request) => request.pathname === '/api/cheer/posts/1').length;
  evidence.samePostRefetch = {
    trigger: 'window focus + document visibilitychange (GET-only query revalidation path)',
    productPolicy: 'not available on the successful detail state: the app QueryClient sets refetchOnWindowFocus=false and staleTime=60s; the visible same-post retry exists only in the error state',
    requestCountBefore: detailRequestsBeforeRefetch,
    requestCountAfter: detailRequestsAfterRefetch,
    executed: detailRequestsAfterRefetch > detailRequestsBeforeRefetch,
    before: refetchBeforeScroll,
    after: (await inspect(page, 'same-post-after-refetch')).scrollY,
  };
  evidence.actions.push({ type: 'same-post-refetch', ...evidence.samePostRefetch });
  await page.screenshot({ path: path.join(outputRoot, `${slug(scenario)}-same-post-refetch.png`), fullPage: false });

  await page.goBack({ waitUntil: 'domcontentloaded' });
  await waitForFeed(page);
  evidence.browserBack = await inspect(page, 'browser-back-list');
  evidence.actions.push({ type: 'browser-back', route: new URL(page.url()).pathname, scrollY: evidence.browserBack.scrollY });
  await page.goForward({ waitUntil: 'domcontentloaded' });
  await waitForDetailShell(page);
  evidence.browserForward = await inspect(page, 'browser-forward-detail');
  evidence.actions.push({ type: 'browser-forward', route: new URL(page.url()).pathname, scrollY: evidence.browserForward.scrollY });
  await page.getByRole('button', { name: '이전으로' }).click();
  await page.waitForURL((url) => url.pathname === '/cheer', { timeout: 15_000 });
  await waitForFeed(page);
  evidence.uiBack = await inspect(page, 'ui-back-list');
  evidence.actions.push({ type: 'ui-back', route: new URL(page.url()).pathname, scrollY: evidence.uiBack.scrollY });
  await page.screenshot({ path: path.join(outputRoot, `${slug(scenario)}-ui-back-list.png`), fullPage: false });

  const phases = [
    evidence.listInitial,
    evidence.listScrolled,
    evidence.detailShell,
    evidence.imagesPending,
    evidence.readingPending,
    evidence.readingAfterAssets,
    evidence.commentsPending,
    evidence.commentsLoaded,
    evidence.browserBack,
    evidence.browserForward,
    evidence.uiBack,
  ].filter(Boolean);
  evidence.network = {
    requestCount: requestLog.length,
    methods: [...new Set(requestLog.map((request) => request.method))],
    nonReadRequestsBlocked,
    unmatchedLocalRequests,
    externalRequestsBlocked,
    imageRequests,
    serviceWorkers: context.serviceWorkers().length,
  };
  evidence.scrollTrace = await page.evaluate(() => window.__cheerScrollTrace ?? []);
  evidence.consoleErrors = consoleErrors;
  evidence.pageErrors = pageErrors;
  const imageSuccess = evidence.readingAfterAssets.images.some((image) => image.naturalWidth > 0 && image.complete);
  const imageFailure = evidence.readingAfterAssets.failedImages.some((image) => image.label === '게시 이미지 3을 불러올 수 없습니다');
  const documentOverflow = phases.map((phase) => ({ phase: phase.phase, overflow: phase.document.scrollWidth - phase.document.clientWidth }));
  const visibleOverflowCount = phases.reduce((sum, phase) => sum + phase.overflowCount, 0);
  const navCoverage = phases.map((phase) => ({ phase: phase.phase, navCovers: phase.navCovers }));
  evidence.verdict = {
    imageSuccess,
    imageFailure,
    commentsLoaded: evidence.commentsLoaded.comments.listItemCount === 3 && evidence.commentsLoaded.comments.lastItemText.includes('마지막 댓글') && evidence.commentsLoaded.comments.lastItemVisible,
    delayedAssetScrollStable: Math.abs(evidence.readingPending.scrollY - evidence.readingAfterAssets.scrollY) <= 2,
    samePostRefetchScrollStable: evidence.samePostRefetch.executed && Math.abs(evidence.samePostRefetch.before - evidence.samePostRefetch.after) <= 2,
    documentOverflow,
    visibleOverflowCount,
    navCoverage,
    noNonReadRequests: nonReadRequestsBlocked.length === 0,
    noUnmatchedLocalRequests: unmatchedLocalRequests.length === 0,
    backForwardObserved: evidence.browserBack.route === '/cheer' && evidence.browserForward.route === '/cheer/1' && evidence.uiBack.route === '/cheer',
    pass: imageSuccess
      && imageFailure
      && evidence.commentsLoaded.comments.listItemCount === 3
      && evidence.commentsLoaded.comments.lastItemText.includes('마지막 댓글')
      && evidence.commentsLoaded.comments.lastItemVisible
      && Math.abs(evidence.readingPending.scrollY - evidence.readingAfterAssets.scrollY) <= 2
      && evidence.samePostRefetch.executed
      && Math.abs(evidence.samePostRefetch.before - evidence.samePostRefetch.after) <= 2
      && visibleOverflowCount === 0
      && phases.every((phase) => phase.document.scrollWidth <= phase.document.clientWidth)
      && nonReadRequestsBlocked.length === 0
      && unmatchedLocalRequests.length === 0
      && evidence.browserBack.route === '/cheer'
      && evidence.browserForward.route === '/cheer/1'
      && evidence.uiBack.route === '/cheer',
  };
  await fs.writeFile(path.join(outputRoot, `${slug(scenario)}.json`), JSON.stringify(evidence, null, 2));
  await context.close();
  return evidence;
};

await fs.mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ executablePath: executable, headless: true });
const results = [];
try {
  for (const width of widths) {
    for (const theme of themes) {
      for (const scale of scales) {
        results.push(await runScenario(browser, { width, theme, scale }));
      }
    }
  }
} finally {
  await browser.close();
}

const summary = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  browser: 'Chromium Google Chrome for Testing chromium-1243',
  viewportHeight: 844,
  textScale: 'root font-size 200% injection; browser zoom 100%; deviceScaleFactor 1',
  serviceWorkers: 'block',
  scenarios: results.map((result) => ({
    scenario: result.scenario,
    pass: result.verdict.pass,
    verdict: result.verdict,
    actions: result.actions,
    network: result.network,
    consoleErrorCount: result.consoleErrors.length,
    pageErrorCount: result.pageErrors.length,
  })),
  counts: {
    total: results.length,
    pass: results.filter((result) => result.verdict.pass).length,
    fail: results.filter((result) => !result.verdict.pass).length,
  },
};
await fs.writeFile(path.join(outputRoot, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
