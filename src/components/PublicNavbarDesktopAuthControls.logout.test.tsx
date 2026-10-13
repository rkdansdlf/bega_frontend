import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type Plugin, type ViteDevServer } from 'vite';

const frontendRoot = fileURLToPath(new URL('../../', import.meta.url));
const pagePath = '/__desktop-logout-navigation-test.html';
const entryPath = '/__desktop-logout-navigation-test.tsx';
const moduleId = '\0virtual:desktop-logout-navigation-test';

type Calls = { fetch: number; xhr: number; beacon: number };

// Mounts the real component with the real auth store. No user is signed in, so the store's own
// logout() finishes without any request; whatever it returns (void today, Promise<boolean> if the
// store becomes async) is exactly the contract the click handler has to cope with.
const createLogoutNavigationPlugin = (): Plugin => ({
  name: 'desktop-logout-navigation-actual-mount-test',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (request.url?.split('?')[0] !== pagePath) {
        next();
        return;
      }
      try {
        const html = await server.transformIndexHtml(
          pagePath,
          `<!doctype html><html><body><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`,
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
      import { StrictMode, createElement } from 'react';
      import { createRoot } from 'react-dom/client';
      import { MemoryRouter, useLocation } from 'react-router-dom';
      import '/src/index.css';
      import PublicNavbarDesktopAuthControls from '/src/components/PublicNavbarDesktopAuthControls.tsx';

      const calls = { fetch: 0, xhr: 0, beacon: 0 };
      window.fetch = (...args) => {
        calls.fetch += 1;
        return Promise.reject(new Error('blocked fetch: ' + String(args[0])));
      };
      XMLHttpRequest.prototype.open = function (...args) {
        calls.xhr += 1;
        throw new Error('blocked xhr: ' + String(args[1]));
      };
      navigator.sendBeacon = () => {
        calls.beacon += 1;
        return false;
      };

      function LocationProbe() {
        const location = useLocation();
        return createElement('output', { 'data-testid': 'probe-location' }, location.pathname);
      }

      const App = () => createElement(
        MemoryRouter,
        { initialEntries: ['/mypage'] },
        createElement(PublicNavbarDesktopAuthControls, {
          visualQaStateOverride: { isLoggedIn: true, userName: '테스터' },
        }),
        createElement(LocationProbe),
      );

      window.__DESKTOP_LOGOUT_NAV_TEST__ = { calls };
      createRoot(document.getElementById('root')).render(createElement(StrictMode, null, createElement(App)));
    `;
  },
});

const readCalls = (page: Page) => page.evaluate(() => (
  window as unknown as { __DESKTOP_LOGOUT_NAV_TEST__: { calls: Calls } }
).__DESKTOP_LOGOUT_NAV_TEST__.calls);

const withActualBrowser = async (
  run: (context: { page: Page; port: number; diagnostics: string[] }) => Promise<void>,
) => {
  let server: ViteDevServer | undefined;
  let browser: Browser | undefined;
  try {
    server = await createServer({
      configFile: fileURLToPath(new URL('../../vite.visual-qa.config.ts', import.meta.url)),
      logLevel: 'silent',
      plugins: [createLogoutNavigationPlugin()],
      root: frontendRoot,
      server: { host: '127.0.0.1', port: 0, strictPort: false },
    });
    await server.listen();
    const address = server.httpServer?.address();
    assert.ok(address && typeof address !== 'string');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const diagnostics: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') diagnostics.push(message.text());
    });
    page.on('pageerror', (error) => diagnostics.push(error.message));
    await run({ page, port: address.port, diagnostics });
  } finally {
    await browser?.close();
    await server?.close();
  }
};

test('actual desktop logout button navigates to /home with the real auth store contract', {
  timeout: 120_000,
}, async () => {
  await withActualBrowser(async ({ page, port, diagnostics }) => {
    const response = await page.goto(`http://127.0.0.1:${port}${pagePath}`);
    assert.equal(response?.status(), 200);

    const probe = page.getByTestId('probe-location');
    await probe.waitFor();
    assert.equal(await probe.textContent(), '/mypage');

    await page.getByTestId('public-navbar-desktop-logout').click();

    // navigate() runs after logout() settles, so wait for the new location instead of reading once.
    await page.waitForFunction(
      () => document.querySelector('[data-testid="probe-location"]')?.textContent === '/home',
      undefined,
      { timeout: 5_000 },
    ).catch(() => {});
    assert.equal(await probe.textContent(), '/home', 'logout did not navigate to /home');

    const calls = await readCalls(page);
    assert.deepEqual(calls, { fetch: 0, xhr: 0, beacon: 0 }, 'signed-out logout must not touch the network');
    assert.deepEqual(diagnostics, [], `browser diagnostics: ${JSON.stringify(diagnostics)}`);
  });
});
