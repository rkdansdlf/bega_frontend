import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { installOfflineBoundary, loadPlaywright } from './reflow-320-audit.mjs';

const baseUrl = process.env.LANDING_KEYBOARD_BASE_URL ?? 'http://127.0.0.1:5213';
const origin = new URL(baseUrl);
if (origin.hostname !== '127.0.0.1') throw new Error('Loopback-only diagnostic');
const reportPath = resolve(process.env.LANDING_KEYBOARD_REPORT_PATH ?? 'reports/landing-keyboard-driver.json');
const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ headless: true });
const results = [];
try {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark']) {
                const context = await browser.newContext({ viewport: { width, height: width === 1280 ? 900 : 844 }, reducedMotion: 'no-preference' });
                const result = { width, font, theme, actions: [], pageErrors: [], apiRequests: 0, status: 'pending' };
                try {
                    await installOfflineBoundary(context, baseUrl);
                    await context.route((url) => url.origin === origin.origin && url.pathname.startsWith('/api/'), (route) => {
                        result.apiRequests++;
                        return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
                    });
                    await context.addInitScript(({ theme }) => {
                        localStorage.clear(); sessionStorage.clear(); localStorage.setItem('kbo-theme', theme);
                    }, { theme });
                    const page = await context.newPage();
                    page.on('pageerror', (error) => result.pageErrors.push(error.message));
                    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
                    await page.evaluate(({ font, theme }) => {
                        document.documentElement.classList.toggle('dark', theme === 'dark');
                        document.documentElement.style.fontSize = `${font}px`;
                    }, { font, theme });
                    await page.locator('[data-testid="landing-page"]').waitFor({ state: 'visible' });
                    await page.waitForFunction(({ font, theme }) => getComputedStyle(document.documentElement).fontSize === `${font}px`
                        && document.documentElement.classList.contains('dark') === (theme === 'dark'), { font, theme }, { timeout: 3000 });
                    const selector = '[data-testid="landing-ticker-toggle"]';
                    for (const [key, expected] of [['Enter', 'true'], ['Enter', 'false'], ['Space', 'true'], ['Space', 'false']]) {
                        await page.locator(selector).focus();
                        await page.keyboard.press(key);
                        await page.waitForFunction(({ selector, expected }) => document.querySelector(selector)?.getAttribute('aria-pressed') === expected,
                            { selector, expected }, { timeout: 3000 });
                        result.actions.push({ key, pressed: await page.locator(selector).getAttribute('aria-pressed') });
                    }
                    result.path = new URL(page.url()).pathname;
                    result.status = result.path === '/' && result.pageErrors.length === 0 && result.apiRequests === 0 ? 'pass' : 'fail';
                } catch (error) {
                    result.status = 'fail'; result.error = error instanceof Error ? error.message : String(error);
                } finally {
                    results.push(result); await context.close();
                }
            }
        }
    }
} finally {
    await browser.close();
}
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify({ browser: 'chromium', version: browser.version(), baseUrl, offline: true, results }, null, 2)}\n`);
const passed = results.filter((result) => result.status === 'pass').length;
console.log(`Landing keyboard Chromium: ${passed}/${results.length} pass; report=${reportPath}`);
process.exitCode = passed === results.length ? 0 : 1;
