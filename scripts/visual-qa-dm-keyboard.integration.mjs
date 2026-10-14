#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AUDIT_USER, installOfflineBoundary, loadPlaywright, resolveReflowBrowser, settle, stubApi } from './reflow-320-audit.mjs';

const baseUrl = process.env.DM_KEYBOARD_BASE_URL ?? 'http://127.0.0.1:5186';
const prototype = process.env.DM_KEYBOARD_PROTOTYPE === '1';
const output = resolve(process.env.DM_KEYBOARD_OUTPUT ?? `/private/tmp/bega-dm-keyboard-${prototype ? 'prototype' : 'product'}`);
const engine = resolveReflowBrowser(process.env.DM_KEYBOARD_BROWSER ?? 'chromium');
const keyboardKey = process.env.DM_KEYBOARD_KEY ?? 'Tab';
assert.ok(['Tab', 'Alt+Tab'].includes(keyboardKey), 'supported native navigation key');
const results = [];
const noScrollResults = [];
await mkdir(output, { recursive: true });
const browser = await (await loadPlaywright())[engine].launch({ headless: true });

try {
  for (const width of [320, 390]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' });
      try {
        await installOfflineBoundary(context, baseUrl);
        await stubApi(context, { pageOrigin: baseUrl });
        await context.routeWebSocket('**', (socket) => socket.close());
        await context.addInitScript(({ user, theme }) => {
          window.__BEGA_TEST_AUTH_PROFILE__ = { data: user };
          localStorage.setItem('auth-bootstrap-hint', '1');
          localStorage.setItem('theme', theme);
        }, { user: AUDIT_USER, theme });
        const page = await context.newPage();
        const response = await page.goto(new URL('/messages/@testuser', baseUrl).href);
        assert.equal(response?.status(), 200);
        await settle(page);
        await page.getByTestId('dm-message-viewport').waitFor({ state: 'visible' });
        assert.equal(new URL(page.url()).pathname, '/messages/@testuser');
        assert.equal(await page.evaluate(() => innerWidth), width);

        if (prototype) {
          await page.evaluate(() => {
            document.addEventListener('focusin', (event) => {
              const input = event.target;
              if (!(input instanceof HTMLTextAreaElement)) return;
              const rect = input.getBoundingClientRect();
              for (const nav of document.querySelectorAll('nav[aria-label="하단 탭바"]')) {
                const bar = nav.getBoundingClientRect();
                if (bar.height > 0 && bar.width > 0
                  && rect.bottom > bar.top && rect.top < bar.bottom
                  && rect.right > bar.left && rect.left < bar.right) {
                  input.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                  break;
                }
              }
            });
          });
        }

        for (const target of ['delete', 'composer']) {
          let found = false;
          for (let index = 0; index < 100 && !found; index += 1) {
            await page.keyboard.press(keyboardKey);
            found = await page.evaluate((target) => target === 'composer'
              ? document.activeElement?.tagName === 'TEXTAREA'
              : document.activeElement?.getAttribute('aria-label') === '메시지 삭제', target);
          }
          assert.ok(found, `${width}/${theme}: real Tab reaches ${target}`);
          const check = await page.evaluate(() => {
            const element = document.activeElement;
            const rect = element.getBoundingClientRect();
            const dx = Math.min(rect.width / 4, 12);
            const dy = Math.min(rect.height / 4, 12);
            const points = [
              [rect.left + rect.width / 2, rect.top + rect.height / 2],
              [rect.left + dx, rect.top + dy], [rect.right - dx, rect.top + dy],
              [rect.left + dx, rect.bottom - dy], [rect.right - dx, rect.bottom - dy],
            ];
            return {
              visible: rect.width > 0 && rect.height > 0 && rect.left >= 0
                && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight,
              unobscured: points.every(([x, y]) => {
                const hit = document.elementFromPoint(x, y);
                return hit === element || element.contains(hit);
              }),
              focusVisible: element.matches(':focus-visible'),
              top: rect.top,
              bottom: rect.bottom,
            };
          });
          results.push({ width, theme, target, ...check, pass: check.visible && check.unobscured && check.focusVisible });
          await page.screenshot({ path: resolve(output, `${width}-${theme}-${target}.png`) });
        }
        for (const visibleWidth of [width, 1440]) {
          await page.setViewportSize({ width: visibleWidth, height: 844 });
          await settle(page);
          const check = await page.evaluate(() => {
            const input = document.querySelector('textarea');
            if (!(input instanceof HTMLTextAreaElement)) throw new Error('DM composer missing');
            input.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
            input.blur();
            const before = scrollY;
            input.focus({ preventScroll: true });
            const bar = document.querySelector('nav[aria-label="하단 탭바"]')?.getBoundingClientRect();
            return { before, after: scrollY, actualWidth: innerWidth, navVisible: Boolean(bar?.height && bar?.width) };
          });
          noScrollResults.push({ width: visibleWidth, theme, ...check, pass: check.before === check.after });
          assert.equal(check.actualWidth, visibleWidth);
          if (visibleWidth === 1440) assert.equal(check.navVisible, false, 'desktop bottom bar is hidden');
        }
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  const pass = results.filter((result) => result.pass).length;
  await writeFile(resolve(output, 'report.json'), `${JSON.stringify({
    baseUrl, browser: engine, keyboardKey, prototype, nativeKeyboard: false, offlineFixtures: true,
    checks: `native ${keyboardKey}, viewport bounds, focus-visible and five interior hit points`,
    status: results.length !== 8 || noScrollResults.length !== 8 ? 'INCOMPLETE'
      : results.every((result) => result.pass) && noScrollResults.every((result) => result.pass) ? 'PASS' : 'FAIL',
    expectedControls: 8, expectedNoScrollChecks: 8,
    summary: { pass, fail: results.length - pass, total: results.length }, results, noScrollResults,
  }, null, 2)}\n`);
}

assert.equal(results.length, 8, 'all width/theme/control combinations must execute');
assert.ok(results.every((result) => result.pass), `DM keyboard controls obscured; see ${output}/report.json`);
assert.equal(noScrollResults.length, 8, 'visible mobile and hidden desktop bar cases must execute');
assert.ok(noScrollResults.every((result) => result.pass), 'visible composer must retain scroll position');
console.log(`[dm-keyboard] 8/8 pass; no-scroll=8/8; prototype=${prototype}; ${output}/report.json`);
