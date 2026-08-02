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

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..');

export const VIEWPORT = { width: 320, height: 800 };
export const ZOOM_ROOT_FONT_PX = 32; // 200% of the 16px default
const MIN_TRUSTWORTHY_VIEWPORT = 100;

/** Routes reachable without a session. Protected routes need auth wiring first. */
export const DEFAULT_ROUTES = [
  '/', '/home', '/login', '/signup', '/password/reset',
  '/prediction', '/mate', '/cheer', '/stadium', '/leaderboard',
  '/offseason', '/offseason/list', '/notice', '/terms', '/privacy',
];

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

/** Give rAF-gated runtimes real frames to mount in before measuring. */
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
  await page.waitForTimeout(Number(process.env.REFLOW_SETTLE_MS ?? 1200));
};

export const runReflowAudit = async ({
  baseUrl = process.env.REFLOW_BASE_URL ?? 'http://127.0.0.1:5180',
  routes = DEFAULT_ROUTES,
  reportPath = resolve(PROJECT_ROOT, 'reports/reflow-320-report.json'),
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
    const page = await context.newPage();

    for (const route of routes) {
      await page.goto(new URL(route, baseUrl).toString(), { waitUntil: 'commit' });
      await settle(page);
      const measurement = await page.evaluate(PAGE_PROBE, ZOOM_ROOT_FONT_PX);
      results.push(evaluateRoute({ route, ...measurement }));
    }
    await context.close();
  } finally {
    await browser.close();
  }

  const summary = summarize(results);
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify({ baseUrl, viewport: VIEWPORT, summary, results }, null, 2)}\n`, 'utf8');

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
