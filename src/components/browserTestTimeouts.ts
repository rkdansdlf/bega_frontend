// Test-only helper. Real-browser tests boot their own Vite dev server and Chromium, so the waits
// below are hang guards, not performance budgets. On a loaded CI host the first navigation to a
// freshly started Vite server alone can exceed Playwright's 30 s default (frontend-unit CI,
// SeatMapTemplateShell / SeatMapSectionFinder: the very first page.goto timed out).
// KBO_PLAYWRIGHT_TIMEOUT_SCALE multiplies every wait; unset (local default) keeps Playwright's defaults.
import type { Browser, BrowserContext, Page } from 'playwright';

const PLAYWRIGHT_DEFAULT_TIMEOUT_MS = 30_000;

export const resolveTimeoutScale = (raw: string | undefined): number => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export const timeoutScale = resolveTimeoutScale(process.env.KBO_PLAYWRIGHT_TIMEOUT_SCALE);

export const scaleTimeout = (milliseconds: number, scale: number): number => Math.round(milliseconds * scale);

export const scaledTimeout = (milliseconds: number): number => scaleTimeout(milliseconds, timeoutScale);

// Page and context share the setDefault* API; a context's defaults are inherited by its pages.
export const applyTimeoutScale = <Target extends Page | BrowserContext>(target: Target): Target => {
  target.setDefaultTimeout(scaledTimeout(PLAYWRIGHT_DEFAULT_TIMEOUT_MS));
  target.setDefaultNavigationTimeout(scaledTimeout(PLAYWRIGHT_DEFAULT_TIMEOUT_MS));
  return target;
};

export const newScaledPage = async (browser: Browser, options?: Parameters<Browser['newPage']>[0]): Promise<Page> => (
  applyTimeoutScale(await browser.newPage(options))
);
