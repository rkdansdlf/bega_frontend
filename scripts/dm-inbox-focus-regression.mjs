import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AUDIT_USER, installOfflineBoundary, loadPlaywright, stubApi } from './reflow-320-audit.mjs';

const origin = process.env.DM_FOCUS_BASE_URL ?? 'http://127.0.0.1:5217';
const engine = process.env.DM_FOCUS_BROWSER ?? 'webkit';
const key = engine === 'webkit' ? 'Alt+Tab' : 'Tab';
const reverse = engine === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab';
const widths = process.env.DM_FOCUS_TARGETED === '1' ? [1280] : [320, 390, 1280];
const fonts = process.env.DM_FOCUS_TARGETED === '1' ? [32] : [16, 32];
const output = resolve(process.env.DM_FOCUS_OUTPUT ?? '/private/tmp/dm-inbox-focus-regression');
await mkdir(output, { recursive: true });
const browser = await (await loadPlaywright())[engine].launch({ headless: true });
const results = [];
try {
  for (const width of widths) for (const font of fonts) for (const theme of ['light', 'dark']) {
    const id = `${engine}-${width}-${font}-${theme}`;
    const context = await browser.newContext({ viewport: { width, height: width === 1280 ? 900 : 844 }, colorScheme: theme, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const writes = [], pageErrors = [], forward = [], backward = [];
    const result = { width, font, theme, engine, writes, pageErrors, forward, backward, status: 'INCOMPLETE' };
    try {
      await installOfflineBoundary(context, origin);
      await stubApi(context, { pageOrigin: origin });
      await context.route('**/*', (route) => {
        const req = route.request();
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method())) { writes.push(`${req.method()} ${new URL(req.url()).pathname}`); return route.abort(); }
        return route.fallback();
      });
      await context.addInitScript(({ user, theme }) => {
        window.__BEGA_TEST_AUTH_PROFILE__ = { data: user };
        localStorage.setItem('auth-bootstrap-hint', '1');
        localStorage.setItem('kbo-theme', theme);
      }, { user: AUDIT_USER, theme });
      const page = await context.newPage();
      page.on('pageerror', (e) => pageErrors.push(e.message));
      const response = await page.goto(`${origin}/messages`, { waitUntil: 'domcontentloaded' });
      if (response?.status() !== 200) throw Error(`navigation status ${response?.status()}`);
      await page.evaluate((px) => { document.documentElement.style.fontSize = `${px}px`; }, font);
      await page.getByTestId('dm-inbox-room-row').first().waitFor({ state: 'visible', timeout: 15000 });
      if (await page.getByTestId('dm-inbox-room-row').count() !== 6) throw Error('expected six fixture rooms');
      const measure = () => page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('[data-testid="dm-inbox-room-row"]'));
        const active = document.activeElement, rect = active.getBoundingClientRect();
        const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
        const hit = x >= 0 && x < innerWidth && y >= 0 && y < innerHeight ? document.elementFromPoint(x, y) : null;
        const header = document.querySelector('[data-testid="navbar-capsule"]')?.closest('header');
        const headerRect = header?.getBoundingClientRect();
        return { index: rows.indexOf(active), focusVisible: active.matches(':focus-visible'),
          centerClear: hit === active || Boolean(hit && active.contains(hit)),
          headerClear: Boolean(headerRect && rect.top >= headerRect.bottom + 3),
          top: rect.top, bottom: rect.bottom, headerBottom: headerRect?.bottom };
      });
      await page.evaluate(() => document.activeElement?.blur());
      for (let step = 1; step <= 30; step++) {
        await page.keyboard.press(key);
        await page.waitForTimeout(350);
        const sample = await measure();
        if (sample.index >= 0) { forward.push(sample); if (sample.index === 5) break; }
      }
      if (forward.at(-1)?.index === 5) {
        for (let step = 1; step <= 5; step++) {
          await page.keyboard.press(reverse);
          await page.waitForTimeout(350);
          const sample = await measure(); backward.push(sample);
          if (!sample.centerClear) await page.screenshot({ path: resolve(output, `${id}-reverse-${step}.png`) });
        }
      }
      if (backward.at(-1)?.index === 0) {
        result.partialBefore = await page.evaluate(() => {
          const row = document.querySelectorAll('[data-testid="dm-inbox-room-row"]')[1];
          const header = document.querySelector('[data-testid="navbar-capsule"]')?.closest('header');
          if (!row || !header) return null;
          window.scrollBy({ top: row.getBoundingClientRect().top - header.getBoundingClientRect().bottom + 5, behavior: 'instant' });
          return { rowTop: row.getBoundingClientRect().top, headerBottom: header.getBoundingClientRect().bottom };
        });
        await page.keyboard.press(key);
        await page.waitForTimeout(350);
        result.partialAfter = await measure();
        result.visibleBefore = await page.evaluate(() => {
          const row = document.querySelectorAll('[data-testid="dm-inbox-room-row"]')[1];
          const y = window.scrollY;
          const header = document.querySelector('[data-testid="navbar-capsule"]')?.closest('header');
          const headerClear = Boolean(header && row.getBoundingClientRect().top >= header.getBoundingClientRect().bottom + 3);
          const originalScrollIntoView = row.scrollIntoView;
          window.__dmVisibleFocusScrolls = 0;
          row.scrollIntoView = function (...args) {
            window.__dmVisibleFocusScrolls += 1;
            return originalScrollIntoView.apply(this, args);
          };
          row.blur();
          row.focus({ preventScroll: true });
          return { y, headerClear, focused: document.activeElement === row, focusVisible: row.matches(':focus-visible') };
        });
        await page.waitForTimeout(100);
        result.visibleAfter = await page.evaluate(() => ({ y: window.scrollY, handlerScrolls: window.__dmVisibleFocusScrolls }));
        result.raceBefore = await page.evaluate(() => {
          const row = document.querySelectorAll('[data-testid="dm-inbox-room-row"]')[1];
          const header = document.querySelector('[data-testid="navbar-capsule"]')?.closest('header');
          if (!row || !header) return null;
          window.scrollBy({ top: row.getBoundingClientRect().top - header.getBoundingClientRect().bottom + 5, behavior: 'instant' });
          const y = window.scrollY;
          const originalScrollIntoView = row.scrollIntoView;
          window.__dmFocusRaceScrolls = 0;
          row.scrollIntoView = function (...args) {
            window.__dmFocusRaceScrolls += 1;
            return originalScrollIntoView.apply(this, args);
          };
          row.blur();
          row.focus({ preventScroll: true });
          const wasKeyboardVisible = row.matches(':focus-visible');
          const oldTabIndex = document.body.getAttribute('tabindex');
          document.body.setAttribute('tabindex', '-1');
          document.body.focus({ preventScroll: true });
          if (oldTabIndex === null) document.body.removeAttribute('tabindex');
          else document.body.setAttribute('tabindex', oldTabIndex);
          return { y, wasKeyboardVisible, activeChanged: document.activeElement !== row };
        });
        await page.waitForTimeout(100);
        result.raceAfter = await page.evaluate(() => ({ y: window.scrollY, handlerScrolls: window.__dmFocusRaceScrolls }));
      }
      result.actualFont = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
      result.actualTheme = await page.evaluate(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      result.path = new URL(page.url()).pathname;
      result.status = 'MEASURED';
      result.pass = result.actualFont === `${font}px` && result.actualTheme === theme && result.path === '/messages'
        && writes.length === 0 && pageErrors.length === 0
        && forward.map(x => x.index).join(',') === '0,1,2,3,4,5'
        && backward.map(x => x.index).join(',') === '4,3,2,1,0'
        && result.partialBefore && result.partialBefore.rowTop < result.partialBefore.headerBottom
        && result.partialAfter?.index === 1 && result.partialAfter.headerClear && result.partialAfter.centerClear
        && result.visibleBefore?.focused && result.visibleBefore.focusVisible && result.visibleBefore.headerClear
        && result.visibleAfter?.handlerScrolls === 0
        && result.raceBefore?.wasKeyboardVisible && result.raceBefore.activeChanged
        && result.raceAfter?.handlerScrolls === 0
        && [...forward, ...backward].every(x => x.centerClear && x.focusVisible && x.headerClear);
      await page.screenshot({ path: resolve(output, `${id}-final.png`) });
    } catch (error) { result.error = String(error); }
    finally { results.push(result); await context.close(); }
  }
} finally {
  await browser.close();
  await writeFile(resolve(output, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
}
const failures = results.filter(x => !x.pass);
console.log(JSON.stringify({ engine, total: results.length, passed: results.length - failures.length, failed: failures.length, failures }));
if (failures.length || results.length !== widths.length * fonts.length * 2) process.exitCode = 1;
