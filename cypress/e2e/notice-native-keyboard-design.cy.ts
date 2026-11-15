/// <reference types="cypress" />

export {};

describe('Notice native list and pagination keyboard design', () => {
  for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
    it(`${width}px / ${font}px / ${theme}`, () => {
      const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
      expect(new URL(origin).hostname).to.equal('127.0.0.1');
      const findings: string[] = [], unexpected: string[] = [], mutations: string[] = [];
      const observations: Array<Record<string, unknown>> = [], keys: Array<{ trusted: boolean; key: string }> = [];
      let reads = 0, foreignBlocked = 0, finished = false;
      const persist = () => cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/notice-keys-${id}.json`, {
        width, font, theme, reads, foreignBlocked, unexpected, mutations, keys, findings, observations, finished,
      }));
      cy.intercept({ url: '**', middleware: true }, (req) => {
        const url = new URL(req.url);
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
          mutations.push(`${req.method} ${url.href}`);
          const expectedReissue = url.origin === origin && url.pathname === '/api/auth/reissue' && url.search === '';
          if (!expectedReissue) unexpected.push(`${req.method} ${url.href}`);
          return req.reply({ statusCode: expectedReissue ? 401 : 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
        }
        if (url.origin !== origin) { foreignBlocked++; return req.reply({ forceNetworkError: true, log: false }); }
        if (url.pathname !== '/notice' && url.pathname !== '/offline.html' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
          && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) {
          unexpected.push(`route:${url.pathname}`); return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
        }
      });
      cy.intercept('**/api/**', (req) => { unexpected.push(`${req.method} ${new URL(req.url).pathname}`); req.reply({ statusCode: 503, body: {} }); });
      cy.intercept('**/auth/**', (req) => { unexpected.push(new URL(req.url).pathname); req.reply({ statusCode: 401, body: {} }); });
      cy.intercept('GET', `${origin}/api/auth/mypage`, { statusCode: 401, body: { success: false } });
      cy.intercept('GET', `${origin}/api/cheer/posts?*`, (req) => {
        const url = new URL(req.url);
        expect(Array.from(url.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b)))
          .to.deep.equal([['page', '0'], ['postType', 'NOTICE'], ['size', '100']]);
        reads++; req.alias = 'notice-list'; req.reply({ statusCode: 200, body: {
          content: Array.from({ length: 16 }, (_, i) => ({ id: 980000 + i, postType: 'NOTICE',
            content: `합성 공지 ${String(i + 1).padStart(2, '0')}\n실제 공지가 아닌 키보드 검증 자료입니다.`,
            author: '합성 운영자', createdAt: '2020-01-01T00:00:00.000Z', teamId: '', likes: 0, comments: 0 })),
          totalElements: 16, totalPages: 1, size: 100, number: 0, last: true,
        } });
      });
      cy.viewport(width, width === 1280 ? 900 : 844);
      cy.visit('/notice', { onBeforeLoad(win) {
        win.localStorage.clear(); win.sessionStorage.clear(); win.localStorage.setItem('kbo-theme', theme);
        win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
        win.addEventListener('keydown', (event) => {
          if (event.key === 'Tab' || event.key === 'Enter') keys.push({ trusted: event.isTrusted, key: event.key });
        });
      } });
      cy.wait('@notice-list'); cy.get('[data-testid^="notice-post-"]').should('have.length', 15);
      cy.get('[data-testid="notice-page-write"]').should('not.exist');
      cy.document().then((doc) => doc.fonts.ready);
      cy.get('[data-testid="notice-page-refresh"]').then(($el) => {
        $el[0].focus(); $el[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      });
      const settle = () => cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
      const sample = (state: string, expected: string) => {
        settle();
        cy.document().then((doc) => {
          const win = doc.defaultView!, active = doc.activeElement as HTMLElement, r = active.getBoundingClientRect();
          const actual = active.getAttribute('data-testid'), visible = Cypress.dom.isVisible(active), focusVisible = active.matches(':focus-visible');
          const xInset = Math.min(8, r.width / 4), yInset = Math.min(8, r.height / 4);
          const points = [{ x: r.left + r.width / 2, y: r.top + r.height / 2, name: 'center' },
            { x: r.left + xInset, y: r.top + yInset, name: 'top-left' },
            { x: r.right - xInset, y: r.bottom - yInset, name: 'bottom-right' }].map((p) => {
              const hit = doc.elementFromPoint(p.x, p.y);
              return { ...p, clear: Boolean(hit && (hit === active || active.contains(hit))),
                hit: hit?.closest('[data-testid]')?.getAttribute('data-testid') ?? hit?.tagName ?? null };
            });
          expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
          expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
          observations.push({ state, expected, actual, visible, focusVisible, width: r.width, height: r.height,
            top: r.top, bottom: r.bottom, scrollY: win.scrollY, points });
          if (actual !== expected || !visible || !focusVisible) findings.push(`${state}: native focus/order mismatch`);
          if (points.some((p) => !p.clear)) findings.push(`${state}: focused target sampled point obscured`);
          if (r.width < 43.99 || r.height < 43.99) findings.push(`${state}: target below44px`);
        });
      };
      // Programmatic starting focus only; every subsequent arrival is native, with no corrective scrolling.
      for (let i = 0; i < 15; i++) {
        cy.press(Cypress.Keyboard.Keys.TAB); sample(`card-${i + 1}`, `notice-post-${980000 + i}`);
        if (i === 0 || i === 14) { persist(); cy.screenshot(`notice-keys-${id}-card-${i + 1}`, { capture: 'viewport' }); }
      }
      for (const page of [1, 2]) {
        cy.press(Cypress.Keyboard.Keys.TAB); sample(`pagination-${page}`, `notice-page-${page}`);
      }
      persist(); cy.screenshot(`notice-keys-${id}-page2-focused`, { capture: 'viewport' });
      cy.then(async () => {
        const params = { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 };
        await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type: 'keyDown', text: '\r' } });
        await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type: 'keyUp' } });
      });
      cy.get('[data-testid="notice-page-2"]').should('have.attr', 'aria-current', 'page');
      cy.get('[data-testid^="notice-post-"]').should('have.length', 1).and('have.attr', 'data-testid', 'notice-post-980015');
      cy.get('[data-testid="notice-page-next"]').should('be.disabled');
      cy.window().should((win) => expect(win.scrollY, 'pagination scroll-to-top settled').to.equal(0));
      // Inspect focus retained after native pagination activation; no synthetic refocus or scroll repair.
      sample('after-page2-enter', 'notice-page-2'); persist();
      cy.screenshot(`notice-keys-${id}-page2-activated`, { capture: 'viewport' });
      cy.then(() => {
        expect(keys.filter((k) => k.key === 'Tab')).to.have.length(17);
        expect(keys.filter((k) => k.key === 'Enter')).to.have.length(1);
        expect(keys.every((k) => k.trusted)).to.equal(true);
        expect(reads).to.equal(1); expect(unexpected).to.deep.equal([]);
        expect(mutations).to.deep.equal([`POST ${origin}/api/auth/reissue`]); finished = true;
      }); persist(); cy.then(() => expect(findings, 'native focus design findings').to.deep.equal([]));
    });
  }
});
