#!/usr/bin/env node
/**
 * 320px reflow audit (WCAG 2.2 §1.4.10 Reflow, §1.4.4 Resize Text).
 *
 * Fails when a route scrolls horizontally at a 320 CSS px viewport, either at
 * normal text size or with text scaled to 200%.
 *
 * Three traps this script is built to avoid — all of them produced wrong
 * verdicts during the manual audit that preceded it:
 *
 *  1. Deferred content. Heavy runtimes mount behind `scheduleAfterNextPaint`
 *     (two rAFs) and `ViewportDeferred`. A backgrounded/hidden page never fires
 *     rAF, so the route stays on skeletons, issues no API calls, and measures as
 *     a trivially passing shell. We wait for real frames before measuring.
 *  2. A collapsed viewport. If clientWidth is 0 every element reads as
 *     overflowing. We refuse to score such a measurement instead of reporting a
 *     phantom failure.
 *  3. Decorative overflow. Marquee tickers and backdrop orbs deliberately
 *     extend past the viewport inside an `overflow: hidden` wrapper, and 2D
 *     content may scroll inside its own `overflow-x: auto` region. Neither is a
 *     reflow failure, so the page-level scrollWidth is the verdict and element
 *     hits are diagnostics only.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findFixture } from './reflow-320-fixtures.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..');

export const VIEWPORT = { width: 320, height: 800 };
export const ZOOM_ROOT_FONT_PX = 32; // 200% of the 16px default
const MIN_TRUSTWORTHY_VIEWPORT = 100;

/**
 * Routes behind PublicOnlyAuthRoute: a logged-in visitor is redirected away, so
 * they must be visited in a context with no session. Measuring them with one
 * silently measures /home instead — which is exactly what happened before this
 * split existed.
 */
export const LOGGED_OUT_ROUTES = ['/login', '/signup', '/password/reset'];

/** Routes reachable without a session. */
export const PUBLIC_ROUTES = [
  '/', '/home', ...LOGGED_OUT_ROUTES,
  '/prediction', '/mate', '/cheer', '/stadium', '/leaderboard',
  '/offseason', '/offseason/list', '/notice', '/terms', '/privacy',
];

/**
 * Routes behind ProtectedRoute, plus the public ones that need a URL param.
 * Ids are arbitrary: the API is stubbed, so these render their empty/error
 * state — still the layout we need to measure.
 */
export const AUTHED_ROUTES = [
  '/mypage', '/messages', '/messages/@testuser',
  '/mate/create', '/mate/1', '/mate/1/apply', '/mate/1/chat', '/mate/1/manage', '/mate/1/checkin',
  '/cheer/bookmarks', '/cheer/1', '/cheer/write', '/cheer/edit/1',
  '/profile/@testuser', '/prediction/matches/20260726KTLT0',
  '/predictions/ranking/share/abc/2026', '/admin',
];

export const DEFAULT_ROUTES = [...PUBLIC_ROUTES, ...AUTHED_ROUTES];

/**
 * The synthetic profile the stubbed `/auth/mypage` returns. Mirrors the fixture
 * cypress/support/commands.ts uses, so both harnesses drive the same shape.
 */
const AUDIT_USER = {
  id: 123,
  email: 'test@example.com',
  name: 'TestUser',
  handle: 'testuser',
  favoriteTeam: 'HH',
  role: 'ROLE_ADMIN',
  hasPassword: true,
  profileImageUrl: null,
};

/**
 * Overlays are the one criterion a page-load sweep cannot reach: a drawer that
 * escapes the viewport only does so once opened. Each case opens one, then
 * checks the board's own navigation rules — contained at 320px, background
 * scroll locked while open, dismissible by keyboard.
 */
export const OVERLAY_CASES = [
  { route: '/home', name: 'mobile nav drawer', open: '[aria-label="메뉴 열기"]' },
  { route: '/mypage', name: 'authenticated nav drawer', open: '[aria-label="메뉴 열기"]' },
];

/**
 * Routes with a form whose submit must survive the on-screen keyboard.
 *
 * Playwright cannot raise a real keyboard, so this approximates it: focus the
 * input, scroll the submit into view, and check the submit ends up above where
 * the keyboard would sit. An in-flow submit scrolls up and passes; one pinned to
 * the bottom with position:fixed stays under the keyboard and fails.
 *
 * The approximation's limit, stated plainly: a real keyboard shrinks the visual
 * viewport while the layout viewport may not change, and iOS Safari differs from
 * Android Chrome. This catches the structural failure — a fixed submit — not
 * platform-specific viewport behaviour, which still needs a device.
 */
export const KEYBOARD_CASES = [
  { route: '/login', name: 'login submit vs keyboard' },
  { route: '/signup', name: 'signup submit vs keyboard' },
  { route: '/password/reset', name: 'password reset submit vs keyboard' },
];

/** Fraction of the viewport an on-screen keyboard typically covers. */
export const KEYBOARD_COVERAGE = 0.55;

/** Verdict for one keyboard case. Pure, so it is unit testable. */
export const evaluateKeyboard = ({ route, name, found, submitBottom, keyboardTop, submitFixed }) => {
  const label = `${route} (${name})`;
  if (!found) {
    return { route: label, status: 'untrusted', reason: 'no form input/submit pair found' };
  }
  const problems = [];
  if (submitFixed) problems.push('submit is position:fixed, so the keyboard would cover it');
  if (submitBottom > keyboardTop) {
    problems.push(`submit sits at ${Math.round(submitBottom)}px, below the ~${Math.round(keyboardTop)}px keyboard line even after scrolling`);
  }
  return {
    route: label,
    status: problems.length ? 'fail' : 'pass',
    reason: problems.length ? problems.join('; ') : undefined,
    offenders: [],
  };
};

/** Verdict for one opened overlay. Pure, so it is unit testable. */
export const evaluateOverlay = ({ route, name, opened, overflow, scrollLocked, closedByEscape }) => {
  const label = `${route} (${name})`;
  if (!opened) {
    return { route: label, status: 'untrusted', reason: 'trigger not found or overlay never opened' };
  }
  const problems = [];
  if (overflow > 0) problems.push(`${overflow}px horizontal scroll while open`);
  if (!scrollLocked) problems.push('background scroll not locked');
  if (!closedByEscape) problems.push('Escape does not dismiss it');
  return {
    route: label,
    status: problems.length ? 'fail' : 'pass',
    reason: problems.length ? problems.join('; ') : undefined,
    offenders: [],
  };
};

/**
 * Turn one route's raw measurement into a verdict. Pure so it can be unit
 * tested without a browser.
 */
export const evaluateRoute = (measurement) => {
  const { route, viewportWidth, scrollWidthNormal, scrollWidthZoomed } = measurement;

  if (!Number.isFinite(viewportWidth) || viewportWidth < MIN_TRUSTWORTHY_VIEWPORT) {
    return {
      route,
      status: 'untrusted',
      reason: `viewport collapsed (clientWidth=${viewportWidth}); measurement discarded`,
    };
  }

  const overflowNormal = scrollWidthNormal - viewportWidth;
  const overflowZoomed = scrollWidthZoomed - viewportWidth;
  const failures = [];
  if (overflowNormal > 0) failures.push(`${overflowNormal}px at 100% text`);
  if (overflowZoomed > 0) failures.push(`${overflowZoomed}px at 200% text`);

  // Report the offenders from the state that actually failed — a zoom-only
  // failure has no offenders at normal size, which would leave it undiagnosable.
  const offenders = overflowNormal > 0
    ? (measurement.offenders ?? [])
    : (measurement.offendersZoomed ?? []);

  const measuredState = measurement.skeletonCount > 0 ? 'loading' : 'loaded';

  return {
    route,
    status: failures.length ? 'fail' : 'pass',
    measuredState,
    overflowNormal,
    overflowZoomed,
    reason: failures.length
      ? `horizontal scroll: ${failures.join(', ')}${measuredState === 'loading' ? ' (measured while still loading)' : ''}`
      : undefined,
    offenders,
  };
};

export const summarize = (results) => {
  const counts = { pass: 0, fail: 0, untrusted: 0 };
  for (const r of results) counts[r.status] += 1;
  // An untrusted measurement is not a pass — it means we failed to measure.
  return { counts, ok: counts.fail === 0 && counts.untrusted === 0, total: results.length };
};

/** Runs inside the page. Returns raw numbers; all judgement happens in Node. */
const PAGE_PROBE = async (zoomRootFontPx) => {
  const de = document.documentElement;
  const vw = de.clientWidth;
  const result = {
    viewportWidth: vw,
    scrollWidthNormal: de.scrollWidth,
    offenders: [],
    // Skeletons still on screen mean we measured a loading state, whose fixed
    // placeholder widths differ from the real content. Recorded so a result is
    // never silently attributed to the loaded UI.
    skeletonCount: document.querySelectorAll('.animate-pulse').length,
  };
  if (vw < 100) return result;

  const label = (el) => {
    const cls = typeof el.className === 'string' && el.className
      ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.')
      : '';
    return (el.tagName.toLowerCase() + cls).slice(0, 80);
  };

  // An element is only a diagnostic hit when nothing between it and the root
  // both fits the viewport and clips/scrolls it.
  const isContained = (el) => {
    let p = el.parentElement;
    while (p && p !== de) {
      const { overflowX } = getComputedStyle(p);
      const fits = p.getBoundingClientRect().right <= vw + 1;
      if (fits && (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'hidden' || overflowX === 'clip')) {
        return true;
      }
      p = p.parentElement;
    }
    return false;
  };

  const collect = () => {
    const hits = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      const over = Math.round(r.right - vw);
      if (over <= 1 && r.left >= -1) continue;
      if (isContained(el)) continue;
      hits.push({ selector: label(el), overflowPx: over, text: (el.textContent || '').trim().slice(0, 24) });
    }
    return hits.sort((a, b) => b.overflowPx - a.overflowPx).slice(0, 5);
  };

  result.offenders = collect();

  const baseFont = getComputedStyle(de).fontSize;
  de.style.fontSize = `${zoomRootFontPx}px`;
  // Let the reflow settle before measuring — reading scrollWidth flushes layout,
  // but text-driven reflow can still shift over the next frame or two.
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(undefined))));
  result.scrollWidthZoomed = de.scrollWidth;
  result.offendersZoomed = collect();
  de.style.fontSize = baseFont;

  return result;
};

const loadPlaywright = async () => {
  const candidates = [process.env.PLAYWRIGHT_MODULE_URL, 'playwright'].filter(Boolean);
  const failures = [];
  for (const candidate of candidates) {
    try {
      return await import(candidate);
    } catch (error) {
      failures.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Playwright is not installed. Run: npm run qa:playwright:install (mirrors CI). Or set PLAYWRIGHT_MODULE_URL to an existing install. Attempts: ${failures.join(' | ')}`);
};

/**
 * Give rAF-gated runtimes real frames to mount in, then wait for the page to
 * stop changing before measuring.
 *
 * A fixed timeout is not enough: which state you catch depends on how fast the
 * stubs resolve, and the same route would pass or fail run to run. Skeletons use
 * fixed placeholder widths the real content does not, so measuring a half-loaded
 * page is both flaky and misleading. Polls until the skeletons clear, capped —
 * a page that legitimately never leaves its skeleton is still measured, and
 * reported as such.
 */
const settle = async (page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => new Promise((done) => {
    let frames = 0;
    const tick = () => {
      frames += 1;
      if (frames >= 4) done(undefined);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }));
  await page.waitForTimeout(Number(process.env.REFLOW_SETTLE_MS ?? 600));

  const capMs = Number(process.env.REFLOW_SETTLE_CAP_MS ?? 6000);

  // Wait for the app to render at all first. Skipping this makes the skeleton
  // poll below exit immediately on an empty document — zero skeletons because
  // nothing has mounted yet — and we would measure a blank page.
  const mountedBy = Date.now() + capMs;
  while (Date.now() < mountedBy) {
    const mounted = await page.evaluate(() => document.querySelector('header, main, nav') !== null);
    if (mounted) break;
    await page.waitForTimeout(250);
  }

  const settledBy = Date.now() + capMs;
  while (Date.now() < settledBy) {
    const skeletons = await page.evaluate(() => document.querySelectorAll('.animate-pulse').length);
    if (skeletons === 0) break;
    await page.waitForTimeout(250);
  }
};

/**
 * Stub every API call so a run is reproducible and self-contained.
 *
 * Two reasons this is the default. A production build bakes in the live API
 * origin, so an un-stubbed CI run would fire real requests at production. And
 * letting responses race the measurement is what made results flip between the
 * loading and loaded state depending on backend latency.
 *
 * Every route therefore renders its empty/error state — which is where the
 * reflow bugs this gate was written for actually live (footer, bottom nav,
 * tabs, markdown, skeletons, empty-count CTA labels). Populated-state coverage
 * needs fixtures and is not attempted here.
 *
 * Set REFLOW_ALLOW_API=1 to run against a real backend instead.
 */
const stubApi = async (context) => {
  // Order matters: Playwright gives precedence to the most recently registered
  // matching handler, so the catch-all has to be registered *before* the
  // specific one or it swallows it.
  await context.route('**/api/**', (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ success: false, code: 'REFLOW_AUDIT_STUB' }),
  }));
  // Populated responses for the surfaces most likely to overflow. Registered
  // after the catch-all so it wins, and before the profile stub so that one
  // still wins over this. Anything without a fixture keeps its 503, so empty
  // states stay covered too.
  await context.route('**/api/**', (route) => {
    const fixture = findFixture(route.request().url());
    if (!fixture) return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture.body(route.request().url())),
    });
  });
  // authStore bootstraps the session from this call; a 503 here bounces every
  // protected route to /login. This is a synthetic client-side session — no
  // account and no credentials — the same thing cy.login() does for Cypress.
  await context.route('**/api/auth/mypage*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: AUDIT_USER }),
  }));
};

export const runReflowAudit = async ({
  baseUrl = process.env.REFLOW_BASE_URL ?? 'http://127.0.0.1:5180',
  routes = DEFAULT_ROUTES,
  reportPath = resolve(PROJECT_ROOT, 'reports/reflow-320-report.json'),
  allowApi = process.env.REFLOW_ALLOW_API === '1',
} = {}) => {
  const { chromium } = await loadPlaywright();
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  const results = [];
  try {
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
    if (!allowApi) await stubApi(context);
    // ProtectedRoute only attempts the profile bootstrap when this hint is set;
    // without it the guard redirects to /login before rendering anything.
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem('auth-bootstrap-hint', '1');
      } catch { /* storage unavailable — public routes still measure fine */ }
    });
    const mainPage = await context.newPage();
    const page = mainPage;

    // Visited without the stubbed session, or PublicOnlyAuthRoute bounces them.
    const loggedOutContext = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
    if (!allowApi) {
      await loggedOutContext.route('**/api/**', (route) => route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, code: 'REFLOW_AUDIT_STUB' }),
      }));
    }
    const loggedOutPage = await loggedOutContext.newPage();

    for (const route of routes) {
      const needsLoggedOut = !allowApi && LOGGED_OUT_ROUTES.includes(route);
      const target = needsLoggedOut ? loggedOutPage : page;

      await target.goto(new URL(route, baseUrl).toString(), { waitUntil: 'commit' });
      await settle(target);

      // Whatever the reason — a guard redirect, or an auth spinner that never
      // resolves — if we are not on the route we asked for, we are not
      // measuring it. Score that as untrusted rather than as a pass.
      const landed = await target.evaluate(() => ({
        path: window.location.pathname,
        spinner: /인증 상태를 확인하고 있습니다/.test(document.body.innerText || ''),
      }));
      const routePattern = route.replace(/:[^/]+/g, '');
      const redirected = !route.includes(':') && landed.path !== route && !landed.path.startsWith(routePattern);
      if (redirected || landed.spinner) {
        results.push({
          route,
          status: 'untrusted',
          reason: landed.spinner
            ? 'stuck on the auth spinner; the session did not resolve'
            : `redirected to ${landed.path}, so this measured a different page`,
        });
        continue;
      }

      const measurement = await target.evaluate(PAGE_PROBE, ZOOM_ROOT_FONT_PX);
      results.push(evaluateRoute({ route, ...measurement }));
    }

    for (const { route, name, open } of OVERLAY_CASES) {
      if (!routes.includes(route)) continue;
      await page.goto(new URL(route, baseUrl).toString(), { waitUntil: 'commit' });
      await settle(page);

      // Wait for the trigger rather than sampling once: the mobile menu button
      // is gated on a media query that resolves a beat after <header> mounts,
      // so an immediate check races it and reports a phantom "not present".
      const trigger = page.locator(open).first();
      try {
        await trigger.waitFor({ state: 'visible', timeout: 5000 });
      } catch {
        results.push({
          route: `${route} (${name})`,
          status: 'untrusted',
          reason: `trigger ${open} never became visible`,
        });
        continue;
      }
      const bodyOverflowBefore = await page.evaluate(() => getComputedStyle(document.body).overflow);
      await trigger.click();
      await page.waitForTimeout(500);

      const state = await page.evaluate((before) => {
        const de = document.documentElement;
        const body = getComputedStyle(document.body);
        return {
          opened: document.querySelector('[role="dialog"], [aria-modal="true"]') !== null
            || document.querySelector('[aria-label="메뉴 닫기"]') !== null,
          overflow: de.scrollWidth - de.clientWidth,
          // Locked either by hidden overflow or by the position:fixed technique.
          scrollLocked: body.overflow === 'hidden' || body.position === 'fixed' || before === 'hidden',
        };
      }, bodyOverflowBefore);

      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      const closedByEscape = await page.evaluate(() => document.querySelector('[aria-label="메뉴 닫기"]') === null
        && document.querySelector('[role="dialog"], [aria-modal="true"]') === null);

      results.push(evaluateOverlay({ route, name, ...state, closedByEscape }));
    }

    for (const { route, name } of KEYBOARD_CASES) {
      if (!routes.includes(route)) continue;
      // All the form routes are logged-out-only, so they need that context too.
      const page = LOGGED_OUT_ROUTES.includes(route) && !allowApi ? loggedOutPage : mainPage;
      await page.goto(new URL(route, baseUrl).toString(), { waitUntil: 'commit' });
      await settle(page);
      // These routes are lazy: the shell's <header> exists before the form
      // mounts, so settle() alone returns too early and the form looks absent.
      try {
        await page.locator('form button[type=submit]').first().waitFor({ state: 'visible', timeout: 5000 });
      } catch { /* evaluate below reports it as not found */ }

      const inputLocator = page.locator('form input:not([type=hidden]), form textarea').first();
      const submitLocator = page.locator('form button[type=submit], form [type=submit]').first();
      let measured = { found: false };

      if (await submitLocator.count() > 0 && await inputLocator.count() > 0) {
        // Shrink the viewport to what a keyboard would leave visible, then ask
        // the real question: can the user still bring the submit into view?
        // Measuring at full height only tells us where it happens to sit.
        const visibleHeight = Math.round(VIEWPORT.height * (1 - KEYBOARD_COVERAGE));
        await page.setViewportSize({ width: VIEWPORT.width, height: visibleHeight });
        await page.waitForTimeout(300);

        await inputLocator.focus();
        // Playwright's scroll waits for the scroll to finish; the DOM
        // scrollIntoView does not, and these pages use scroll-behavior: smooth.
        await submitLocator.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);

        const box = await submitLocator.boundingBox();
        measured = await page.evaluate(({ bottom, limit }) => {
          const submit = document.querySelector('form button[type=submit], form [type=submit]');
          return {
            found: true,
            submitBottom: bottom,
            keyboardTop: limit,
            submitFixed: getComputedStyle(submit).position === 'fixed',
          };
        }, { bottom: box ? box.y + box.height : Number.POSITIVE_INFINITY, limit: visibleHeight });

        await page.setViewportSize(VIEWPORT);
        await page.waitForTimeout(200);
      }

      results.push(evaluateKeyboard({ route, name, ...measured }));
    }
    await loggedOutContext.close();
    await context.close();
  } finally {
    await browser.close();
  }

  const summary = summarize(results);
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify({ baseUrl, viewport: VIEWPORT, apiStubbed: !allowApi, summary, results }, null, 2)}\n`, 'utf8');

  for (const r of results) {
    const line = r.status === 'pass'
      ? `  ok   ${r.route}${r.measuredState === 'loading' ? ' (loading state)' : ''}`
      : `  ${r.status === 'fail' ? 'FAIL' : 'SKIP'} ${r.route} — ${r.reason}`;
    console.log(line);
    if (r.status === 'fail') {
      for (const o of r.offenders ?? []) {
        console.log(`         ↳ ${o.selector} +${o.overflowPx}px ${o.text ? `"${o.text}"` : ''}`);
      }
    }
  }
  console.log(`[reflow-320] ${summary.counts.pass}/${summary.total} pass · ${summary.counts.fail} fail · ${summary.counts.untrusted} untrusted`);
  console.log(`[reflow-320] report=${reportPath}`);

  return summary.ok ? 0 : 1;
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runReflowAudit()
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(`[reflow-320] FAILED: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    });
}
