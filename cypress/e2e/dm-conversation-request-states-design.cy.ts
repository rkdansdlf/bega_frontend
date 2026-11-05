/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

// Bootstrap POST is intercepted locally; never send, delete or mark real messages read.
describe('DM conversation request-state design', () => {
  for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
    it(`${width}px / ${font}px / ${theme}`, () => {
      const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
      expect(new URL(origin).hostname).to.equal('127.0.0.1');
      const viewer = { id: 950096, email: 'dm-design@example.invalid', name: '합성 사용자', handle: 'synthetic_dm_viewer',
        role: 'ROLE_USER', favoriteTeam: null, profileImageUrl: null, hasPassword: true };
      const route = '/messages/synthetic_dm_peer';
      const mutations: string[] = [], unexpected: string[] = [], findings: string[] = [];
      const observations: Array<Record<string, unknown>> = [];
      let bootstrapCount = 0, historyCount = 0, socketFactories = 0, foreignBlocked = 0, finished = false;
      let recovery: 'retry' | 'fresh-document' | null = null;
      let releaseBootstrap!: () => void, releaseHistory!: () => void;
      const bootstrapGate = new Cypress.Promise<void>((resolve) => { releaseBootstrap = resolve; });
      const historyGate = new Cypress.Promise<void>((resolve) => { releaseHistory = resolve; });
      const persist = () => cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/dm-request-${id}.json`, {
        width, font, theme, recovery, bootstrapCount, historyCount, socketFactories, foreignBlocked, mutations, unexpected, findings, observations, finished,
      }));
      cy.intercept({ url: '**', middleware: true }, (req) => {
        const url = new URL(req.url);
        const bootstrap = req.method === 'POST' && url.origin === origin && url.pathname === '/api/dm/rooms' && url.search === '';
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !bootstrap) {
          mutations.push(`${req.method} ${url.pathname}`); return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
        }
        if (url.origin !== origin) { foreignBlocked++; return req.reply({ forceNetworkError: true, log: false }); }
        if (url.pathname !== route && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
          && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
      });
      cy.intercept('**/api/**', (req) => { unexpected.push(`${req.method} ${new URL(req.url).pathname}`); req.reply({ statusCode: 503, body: {} }); });
      cy.intercept('**/auth/**', (req) => { unexpected.push(new URL(req.url).pathname); req.reply({ statusCode: 401, body: {} }); });
      cy.intercept('GET', `${origin}/api/auth/mypage`, { body: { success: true, data: toAuthApiUser(viewer) } });
      cy.intercept('GET', `${origin}/api/dm/rooms/my`, { body: { success: true, data: [] } });
      cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { body: { success: true, data: 0 } });
      cy.intercept('GET', `${origin}/api/notifications/my`, { body: [] });
      cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { body: 0 });
      cy.intercept('POST', `${origin}/api/dm/rooms`, (req) => {
        expect(req.body).to.deep.equal({ targetHandle: '@synthetic_dm_peer' });
        bootstrapCount++; req.alias = 'dm-bootstrap';
        if (bootstrapCount === 1) return bootstrapGate.then(() => req.reply({ statusCode: 503,
          body: { success: false, message: '합성 대화방 준비 실패입니다.' } }));
        req.reply({ statusCode: 200, body: { success: true, data: { roomId: 950097, membershipState: 'ACTIVE',
          targetUser: { id: 950098, name: '합성 대화 상대', handle: '@synthetic_dm_peer', favoriteTeam: null, profileImageUrl: null } } } });
      });
      cy.intercept('GET', `${origin}/api/dm/rooms/950097/messages`, (req) => {
        expect(new URL(req.url).search).to.equal(''); historyCount++; req.alias = 'dm-history';
        if (historyCount === 1) return historyGate.then(() => req.reply({ statusCode: 503,
          body: { success: false, message: '합성 메시지 기록 조회 실패입니다.' } }));
        req.reply({ statusCode: 200, body: { success: true, data: [] } });
      });
      const sample = (state: string) => {
        cy.get('main').then(async ($main) => { await $main[0].ownerDocument.fonts.ready; });
        cy.get('main').then(($main) => {
          const main = $main[0], doc = main.ownerDocument, win = doc.defaultView!;
          const documentWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth);
          expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
          expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
          const clipped = Array.from(main.querySelectorAll<HTMLElement>('h1,p,button')).filter((el) => Cypress.dom.isVisible(el)
            && el.scrollWidth > el.clientWidth + 1).map((el) => ({ tag: el.tagName, text: el.textContent, client: el.clientWidth, scroll: el.scrollWidth }));
          observations.push({ state, documentWidth, clipped, text: main.textContent });
          const title = main.querySelector('h1');
          if (title) observations.push({ state, titleWidth: title.getBoundingClientRect().width,
            titleHeight: title.getBoundingClientRect().height, titleText: title.textContent });
          if (documentWidth > width + 1) findings.push(`${state}: document overflow ${documentWidth}/${width}`);
          if (clipped.length) findings.push(`${state}: horizontal content clipping`);
        });
        persist(); cy.screenshot(`dm-request-${id}-${state}`, { capture: 'viewport' });
      };
      const errorState = (state: string, message: string) => {
        cy.contains('main h1', '메시지 화면을 불러오지 못했습니다.').should('be.visible');
        cy.contains('main p', message).should('be.visible');
        cy.contains('첫 메시지를 보내보세요.').should('not.exist');
        cy.get('textarea[placeholder="메시지를 입력하세요"]').should('not.exist');
        sample(state);
        for (const text of ['다시 시도', '프로필로 돌아가기']) {
          cy.contains('main button', text).then(($button) => {
            const el = $button[0], doc = el.ownerDocument, win = doc.defaultView!;
            el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
            const r = el.getBoundingClientRect(), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            const clear = Boolean(hit && (hit === el || el.contains(hit)));
            observations.push({ state, target: text, width: r.width, height: r.height, clear,
              viewport: { width: win.innerWidth, height: win.innerHeight } });
            if (r.height < 43.99 || r.width < 43.99) findings.push(`${state}-${text}: target below44px`);
            if (!clear) findings.push(`${state}-${text}: target center obscured after scrolling`);
          });
        }
      };
      cy.viewport(width, width === 1280 ? 900 : 844);
      const visit = () => cy.visit(route, { onBeforeLoad(win) {
        win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
        win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
        (win as Window & { __begaDmSocketFactory?: unknown }).__begaDmSocketFactory = () => { socketFactories++; return () => undefined; };
      } });
      visit();
      cy.wrap(null).should(() => expect(bootstrapCount, 'actual bootstrap request is held').to.equal(1));
      cy.get('main .animate-pulse').should('have.length.at.least', 4);
      cy.contains('첫 메시지를 보내보세요.').should('not.exist'); sample('bootstrap-held');
      cy.then(() => { expect(bootstrapCount).to.equal(1); expect(historyCount).to.equal(0); releaseBootstrap(); });
      cy.wait('@dm-bootstrap').its('response.statusCode').should('equal', 503);
      errorState('bootstrap-error', '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.');
      cy.contains('main button', '다시 시도').click(); cy.wait('@dm-bootstrap').its('response.statusCode').should('equal', 200);
      cy.wrap(null).should(() => expect(historyCount, 'actual history request is held').to.equal(1));
      cy.get('main .animate-pulse').should('have.length.at.least', 4);
      cy.contains('첫 메시지를 보내보세요.').should('not.exist'); sample('history-held');
      cy.then(() => { expect(historyCount).to.equal(1); releaseHistory(); });
      cy.wait('@dm-history').its('response.statusCode').should('equal', 503);
      cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
      cy.get('main').should(($main) => {
        expect($main.text().includes('메시지 화면을 불러오지 못했습니다.') || $main.text().includes('첫 메시지를 보내보세요.')).to.equal(true);
      });
      sample('history-after503');
      cy.get('main').then(($main) => {
        const errorVisible = $main.text().includes('메시지 화면을 불러오지 못했습니다.');
        const falseEmpty = $main.text().includes('첫 메시지를 보내보세요.');
        observations.push({ state: 'history-503-distinction', errorVisible, falseEmpty });
        if (!errorVisible || falseEmpty) findings.push('history503: query failure presented as healthy empty');
        recovery = errorVisible ? 'retry' : 'fresh-document';
        if (errorVisible) {
          errorState('history-error', '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.');
          cy.contains('main button', '다시 시도').click();
        }
        else visit(); // Fresh-document recovery is explicitly distinct from an unavailable retry action.
      });
      cy.wait('@dm-bootstrap').its('response.statusCode').should('equal', 200);
      cy.wait('@dm-history').its('response.statusCode').should('equal', 200);
      cy.contains('첫 메시지를 보내보세요.').should('be.visible');
      cy.get('main h1').should('not.exist');
      cy.get('textarea[placeholder="메시지를 입력하세요"]').should('exist');
      cy.contains('main button', '메시지 보내기').should('be.disabled'); sample('recovered-empty');
      cy.then(() => {
        expect(bootstrapCount).to.equal(3); expect(historyCount).to.equal(2);
        expect(socketFactories).to.equal(recovery === 'fresh-document' ? 2 : 1);
        expect(mutations).to.deep.equal([]); expect(unexpected).to.deep.equal([]); finished = true;
      }); persist(); cy.then(() => expect(findings, 'design findings').to.deep.equal([]));
    });
  }
});
