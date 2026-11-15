/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

describe('Mate application access and invalid-route design', () => {
  for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
    for (const state of ['forbidden', 'not-found', 'invalid-id'] as const) {
      it(`${state} / ${width}px / ${font}px / ${theme}`, () => {
        const id = `${state}-${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
        expect(new URL(origin).hostname).to.equal('127.0.0.1');
        const partyId = state === 'forbidden' ? '990041' : state === 'not-found' ? '990042' : 'synthetic-invalid';
        const route = `/mate/${partyId}/apply`;
        const viewer = { id: 990040, email: 'access-design@example.invalid', name: '합성 신청자', handle: 'synthetic_apply_viewer',
          role: 'ROLE_USER', favoriteTeam: null, profileImageUrl: null, hasPassword: true };
        const expected = state === 'forbidden' ? '이 파티를 볼 권한이 없습니다.' : state === 'not-found'
          ? '삭제되었거나 존재하지 않는 파티입니다.' : '유효하지 않은 파티 ID입니다.';
        const findings: string[] = [], mutations: string[] = [], unexpected: string[] = [];
        const observations: Array<Record<string, unknown>> = [], tabs: Array<{ trusted: boolean; target: string | null }> = [];
        let reads = 0, foreignBlocked = 0, finished = false;
        let release!: () => void;
        const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
        const persist = () => cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/apply-access-${id}.json`, {
          state, width, font, theme, reads, foreignBlocked, mutations, unexpected, findings, observations, tabs, finished,
        }));
        cy.intercept({ url: '**', middleware: true }, (req) => {
          const url = new URL(req.url);
          if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            mutations.push(`${req.method} ${url.href}`); return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
          }
          if (url.origin !== origin) { foreignBlocked++; return req.reply({ forceNetworkError: true, log: false }); }
          if (url.pathname !== route && url.pathname !== '/offline.html' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
            && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) {
            unexpected.push(`route:${url.pathname}`); return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
          }
        });
        cy.intercept('**/api/**', (req) => { unexpected.push(`${req.method} ${req.url}`); req.reply({ statusCode: 503, body: {} }); });
        cy.intercept('**/auth/**', (req) => { unexpected.push(`${req.method} ${req.url}`); req.reply({ statusCode: 401, body: {} }); });
        cy.intercept('GET', `${origin}/api/auth/mypage`, { body: { success: true, data: toAuthApiUser(viewer) } });
        cy.intercept('GET', `${origin}/api/dm/rooms/my`, { body: { success: true, data: [] } });
        cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { body: { success: true, data: 0 } });
        cy.intercept('GET', `${origin}/api/notifications/my`, { body: [] });
        cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { body: 0 });
        if (state !== 'invalid-id') cy.intercept('GET', `${origin}/api/parties/${partyId}`, (req) => {
          expect(new URL(req.url).search).to.equal(''); reads++; req.alias = 'access-party';
          return gate.then(() => req.reply({ statusCode: state === 'forbidden' ? 403 : 404, body: { message: '합성 조회 차단' } }));
        });
        cy.viewport(width, width === 1280 ? 900 : 844);
        cy.visit(route, { onBeforeLoad(win) {
          win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
          win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
          win.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') tabs.push({ trusted: event.isTrusted,
              target: (event.target as HTMLElement)?.getAttribute('data-testid') ?? (event.target as HTMLElement)?.tagName ?? null });
          });
        } });
        if (state !== 'invalid-id') {
          cy.wrap(null).should(() => expect(reads).to.equal(1));
          cy.get('[data-testid="mate-apply-loading"]').should('be.visible').and('contain.text', '파티 정보를 불러오는 중입니다...');
          cy.get('[data-testid="mate-apply"]').should('not.exist');
          cy.screenshot(`apply-access-${id}-held`, { capture: 'viewport' }); cy.then(() => release());
          cy.wait('@access-party').its('response.statusCode').should('equal', state === 'forbidden' ? 403 : 404);
        }
        cy.get('[data-testid="mate-apply-error"]').should('be.visible').and('contain.text', expected);
        cy.get('[data-testid="mate-apply"]').should('not.exist'); cy.get('textarea#message').should('not.exist');
        cy.get('[data-testid="mate-apply-ticket-panel"]').should('not.exist');
        cy.get('[data-testid="mate-apply-error-return"]').should('be.enabled');
        cy.document().then(async (doc) => { await doc.fonts.ready; });
        cy.get('[data-testid="mate-apply-error"] p').then(($el) => {
          const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, r = el.getBoundingClientRect();
          const documentWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth);
          expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
          expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
          observations.push({ kind: 'error-copy', text: el.textContent, width: r.width, height: r.height,
            documentWidth, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
          if (documentWidth > width + 1 || el.scrollWidth > el.clientWidth + 1) findings.push('error-copy: horizontal overflow');
          if (width < 640) {
            const node = el.firstChild;
            expect(node?.nodeType, 'error copy is measured from its actual text node').to.equal(win.Node.TEXT_NODE);
            const words = Array.from(el.textContent!.matchAll(/\S+/g)).map((match) => {
              const range = doc.createRange();
              range.setStart(node!, match.index!); range.setEnd(node!, match.index! + match[0].length);
              const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
              const lines = new Set(rects.map((rect) => Math.round(rect.top * 10) / 10)).size;
              return { word: match[0], lines };
            });
            observations.push({ kind: 'error-word-wrap', words });
            if (words.some((word) => word.lines !== 1)) findings.push('error-copy: word split across lines');
          }
        });
        persist(); cy.screenshot(`apply-access-${id}-error`, { capture: 'viewport' });
        cy.document().then((doc) => expect(doc.activeElement).to.equal(doc.body));
        const seekReturn = (step: number): void => {
          if (step >= 32) throw new Error('return action not reached within32 native Tab steps');
          cy.press(Cypress.Keyboard.Keys.TAB);
          cy.document().then((doc) => {
            const active = doc.activeElement as HTMLElement;
            observations.push({ kind: 'native-tab', step: step + 1, actual: active.getAttribute('data-testid'),
              tag: active.tagName, text: active.textContent?.slice(0, 80) });
            if (active.getAttribute('data-testid') !== 'mate-apply-error-return') seekReturn(step + 1);
          });
        };
        seekReturn(0);
        cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
        cy.get('[data-testid="mate-apply-error-return"]').then(($el) => {
          const el = $el[0], doc = el.ownerDocument, r = el.getBoundingClientRect();
          const points = [{ x: r.left + r.width / 2, y: r.top + r.height / 2, name: 'center' },
            { x: r.left + 8, y: r.top + 8, name: 'top-left' }, { x: r.right - 8, y: r.bottom - 8, name: 'bottom-right' }].map((p) => {
            const hit = doc.elementFromPoint(p.x, p.y);
            return { ...p, clear: Boolean(hit && (hit === el || el.contains(hit))),
              hit: hit?.closest('[data-testid]')?.getAttribute('data-testid') ?? hit?.tagName ?? null };
          });
          const focused = doc.activeElement === el, focusVisible = el.matches(':focus-visible');
          observations.push({ kind: 'native-return', width: r.width, height: r.height, top: r.top, bottom: r.bottom,
            focused, focusVisible, points });
          if (!focused || !focusVisible || points.some((p) => !p.clear)) findings.push('return: native focus obscured');
          if (r.width < 43.99 || r.height < 43.99) findings.push('return: target below44px');
          if (el.scrollWidth > el.clientWidth + 1) findings.push('return: label clipped');
        });
        persist(); cy.screenshot(`apply-access-${id}-native-return`, { capture: 'viewport' });
        cy.then(() => {
          expect(reads).to.equal(state === 'invalid-id' ? 0 : 1); expect(unexpected).to.deep.equal([]); expect(mutations).to.deep.equal([]);
          expect(tabs.length).to.be.greaterThan(0); expect(tabs.every((key) => key.trusted)).to.equal(true); finished = true;
        }); persist(); cy.then(() => expect(findings, 'access-state design findings').to.deep.equal([]));
      });
    }
  }
});
