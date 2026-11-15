/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';
import type { ChatFavoriteItem, ChatSessionSummary } from '../../src/types/chatbot';

describe('Saved chatbot lists from My Page without conversation mutations', () => {
  for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
    it(`${width}px / ${font}px / ${theme}`, () => {
      const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
      expect(new URL(origin).hostname).to.equal('127.0.0.1');
      const viewer = { id: 990060, email: 'saved-chat-design@example.invalid', name: '합성 목록 사용자', handle: 'synthetic_saved_chat',
        role: 'ROLE_USER', favoriteTeam: null, profileImageUrl: null, hasPassword: true };
      const panel = '[data-testid="chatbot-panel"]', history = '[data-testid="chatbot-history-tab"]', favorites = '[data-testid="chatbot-favorites-tab"]';
      const mutations: string[] = [], unexpected: string[] = [], findings: string[] = [], rejections: string[] = [];
      const observations: Array<Record<string, unknown>> = [];
      const tabEvents: Array<{ trusted: boolean }> = [];
      let mode: 'error' | 'empty' | 'data' = 'error', sessionReads = 0, favoriteReads = 0, foreignBlocked = 0, finished = false;
      let releaseSessions!: () => void, releaseFavorites!: () => void;
      const sessionGate = new Cypress.Promise<void>((resolve) => { releaseSessions = resolve; });
      const favoriteGate = new Cypress.Promise<void>((resolve) => { releaseFavorites = resolve; });
      const sessions: ChatSessionSummary[] = [{ sessionId: 990061, title: '합성 대화', messageCount: 1,
        latestMessagePreview: '실제 대화가 아닌 합성 기록입니다.', createdAt: '2020-01-01T00:00:00Z', updatedAt: '2020-01-02T00:00:00Z', lastMessageAt: '2020-01-02T00:00:00Z' }];
      const saved: ChatFavoriteItem[] = [{ messageId: 990062, sessionId: 990061, sessionTitle: '합성 대화',
        prompt: '실제 경기와 무관한 합성 질문입니다.', content: '실제 답변이 아닌 화면 검증용 합성 문장입니다.',
        favoritedAt: '2020-01-03T00:00:00Z', messageCreatedAt: '2020-01-02T00:00:00Z' }];
      const persist = () => cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/saved-chat-${id}.json`, {
        width, font, theme, sessionReads, favoriteReads, foreignBlocked, mutations, unexpected, rejections, tabEvents, findings, observations, finished,
      }));
      // Preserve/report only the two deliberately injected API rejections; unrelated exceptions still fail Cypress.
      cy.on('uncaught:exception', (error) => {
        if (/SYNTHETIC_CHAT_(HISTORY|FAVORITES)_503/.test(error.message)) {
          rejections.push(error.message); findings.push('synthetic saved-list503 caused uncaught rejection'); return false;
        }
      });
      cy.intercept({ url: '**', middleware: true }, (req) => {
        const url = new URL(req.url);
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
          mutations.push(`${req.method} ${url.href}`); return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
        }
        if (url.origin !== origin) { foreignBlocked++; return req.reply({ forceNetworkError: true, log: false }); }
        if (!['/mypage', '/offline.html'].includes(url.pathname) && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
          && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) {
          unexpected.push(`route:${url.pathname}`); return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
        }
      });
      cy.intercept('**/api/**', (req) => { unexpected.push(`${req.method} ${req.url}`); req.reply({ statusCode: 503, body: {} }); });
      cy.intercept('**/auth/**', (req) => { unexpected.push(`${req.method} ${req.url}`); req.reply({ statusCode: 401, body: {} }); });
      cy.intercept('GET', `${origin}/api/auth/mypage`, { body: { success: true, data: toAuthApiUser(viewer) } });
      cy.intercept('GET', `${origin}/api/users/me/follow-counts`, { body: { followerCount: 0, followingCount: 0 } });
      cy.intercept('GET', `${origin}/api/dm/rooms/my`, { body: { success: true, data: [] } });
      cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { body: { success: true, data: 0 } });
      cy.intercept('GET', `${origin}/api/notifications/my`, { body: [] });
      cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { body: 0 });
      cy.intercept('GET', `${origin}/api/ai/chat/sessions`, (req) => {
        expect(new URL(req.url).search).to.equal(''); sessionReads++; req.alias = 'saved-sessions';
        if (mode === 'error') return sessionGate.then(() => req.reply({ statusCode: 503, body: { message: 'SYNTHETIC_CHAT_HISTORY_503' } }));
        req.reply({ body: { success: true, data: mode === 'data' ? sessions : [] } });
      });
      cy.intercept('GET', `${origin}/api/ai/chat/favorites`, (req) => {
        expect(new URL(req.url).search).to.equal(''); favoriteReads++; req.alias = 'saved-favorites';
        if (mode === 'error') return favoriteGate.then(() => req.reply({ statusCode: 503, body: { message: 'SYNTHETIC_CHAT_FAVORITES_503' } }));
        req.reply({ body: { success: true, data: mode === 'data' ? saved : [] } });
      });
      const settle = () => cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
      const visit = () => {
        cy.visit('/mypage?view=alerts', { onBeforeLoad(win) {
          win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
          win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
          win.addEventListener('keydown', (event) => { if (event.key === 'Tab') tabEvents.push({ trusted: event.isTrusted }); });
        } });
        cy.get('[data-testid="mypage-alerts-section"]').should('exist');
        const launcher = width < 768 ? '[data-testid="auth-mobile-chatbot-tab"]' : '[data-testid="chatbot-request-launcher"]';
        cy.get(launcher).click(); cy.get(panel).should('be.visible');
      };
      const sample = (selector: string, state: string) => {
        cy.get(selector).then(async ($el) => { await $el[0].ownerDocument.fonts.ready; }); settle();
        cy.get(selector).then(($el) => {
          const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, r = el.getBoundingClientRect();
          const pr = doc.querySelector(panel)!.getBoundingClientRect(), visible = Cypress.dom.isVisible(el);
          const clipped = Array.from(el.querySelectorAll<HTMLElement>('p,button')).filter((child) => Cypress.dom.isVisible(child)
            && child.scrollWidth > child.clientWidth + 1).map((child) => ({ text: child.textContent, client: child.clientWidth, scroll: child.scrollWidth }));
          expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
          expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
          observations.push({ state, text: el.textContent, visible, width: r.width, height: r.height, panelWidth: pr.width, panelHeight: pr.height, clipped });
          if (!visible || r.height <= 0 || clipped.length || pr.left < -1 || pr.right > width + 1) findings.push(`${state}: panel content collapsed/clipped`);
        }); persist(); cy.screenshot(`saved-chat-${id}-${state}`, { capture: 'viewport' });
      };
      const open = (tab: 'history' | 'favorites') => cy.get(`[data-testid="chatbot-tab-${tab}"]`).click({ scrollBehavior: false });
      const checkError = (tab: 'history' | 'favorites', selector: string, emptyCopy: string) => cy.get(selector).then(($el) => {
        const el = $el[0];
        const errorIndicator = Array.from(el.querySelectorAll<HTMLElement>(`[role="alert"],[role="status"],[data-testid="chatbot-${tab}-error"]`))
          .some((node) => Cypress.dom.isVisible(node) && /불러오지|실패|오류|다시 시도/.test(node.textContent ?? ''));
        const falseEmpty = el.textContent?.includes(emptyCopy) === true;
        observations.push({ state: `${tab}-error-distinction`, errorIndicator, falseEmpty });
        if (!errorIndicator) findings.push(`${tab}503: no explicit failure indicator`);
        if (falseEmpty) findings.push(`${tab}503: failure presented as healthy empty`);
      });
      cy.viewport(width, width === 1280 ? 900 : 844); visit(); open('history');
      cy.wrap(null).should(() => expect(sessionReads).to.equal(1));
      cy.contains(history, '히스토리를 불러오는 중입니다.').should('exist'); sample(history, 'history-held');
      cy.then(() => releaseSessions()); cy.wait('@saved-sessions').its('response.statusCode').should('equal', 503); settle();
      cy.get(history).should('not.contain.text', '히스토리를 불러오는 중입니다.'); sample(history, 'history503');
      checkError('history', history, '아직 저장된 대화가 없습니다.');
      open('favorites'); cy.wrap(null).should(() => expect(favoriteReads).to.equal(1));
      cy.contains(favorites, '즐겨찾기를 불러오는 중입니다.').should('exist'); sample(favorites, 'favorites-held');
      cy.then(() => releaseFavorites()); cy.wait('@saved-favorites').its('response.statusCode').should('equal', 503); settle();
      cy.get(favorites).should('not.contain.text', '즐겨찾기를 불러오는 중입니다.'); sample(favorites, 'favorites503');
      checkError('favorites', favorites, '즐겨찾기한 답변이 없습니다.');
      cy.then(() => { mode = 'empty'; }); visit(); open('history'); cy.wait('@saved-sessions');
      cy.contains(history, '아직 저장된 대화가 없습니다.').should('exist'); sample(history, 'history-empty');
      open('favorites'); cy.wait('@saved-favorites'); cy.contains(favorites, '즐겨찾기한 답변이 없습니다.').should('exist'); sample(favorites, 'favorites-empty');
      cy.then(() => { mode = 'data'; }); visit(); open('history'); cy.wait('@saved-sessions');
      cy.get('[data-testid="chatbot-history-session"]').should('have.length', 1); sample(history, 'history-data');
      const keyboard = (tab: 'history' | 'favorites', expected: string[]) => {
        cy.get(`[data-testid="chatbot-tab-${tab}"]`).focus();
        for (const target of expected) {
          cy.press(Cypress.Keyboard.Keys.TAB); settle();
          cy.document().then((doc) => {
            const el = doc.activeElement as HTMLElement, r = el.getBoundingClientRect();
            const actual = el.getAttribute('data-testid'), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            const clear = Boolean(hit && (hit === el || el.contains(hit))), focusVisible = el.matches(':focus-visible');
            const win = doc.defaultView!, x = r.left + r.width / 2, y = r.top + r.height / 2;
            observations.push({ state: `${tab}-native-tab`, expected: target, actual, width: r.width, height: r.height, clear, focusVisible,
              left: r.left, right: r.right, top: r.top, bottom: r.bottom, x, y,
              centerInViewport: x >= 0 && x < win.innerWidth && y >= 0 && y < win.innerHeight,
              hit: hit?.closest('[data-testid]')?.getAttribute('data-testid') ?? hit?.tagName ?? null });
            if (actual !== target || !clear || !focusVisible) findings.push(`${tab}-${target}: native focus/order/center`);
            if (r.width < 43.99 || r.height < 43.99) findings.push(`${tab}-${target}: target below44px`);
            if (actual === 'chatbot-history-new-session') {
              const textNodes = Array.from(el.childNodes).filter((node) => node.nodeType === 3 && node.textContent?.trim());
              expect(textNodes, 'new-session label text').to.have.length(1);
              const node = textNodes[0];
              const words = Array.from(node.textContent!.matchAll(/\S+/g)).map((match) => {
                const range = doc.createRange(); range.setStart(node, match.index!); range.setEnd(node, match.index! + match[0].length);
                const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
                return { word: match[0], lines: new Set(rects.map((rect) => Math.round(rect.top * 10) / 10)).size };
              });
              observations.push({ state: 'history-new-word-wrap', words });
              if (words.some((word) => word.lines !== 1)) findings.push('history-new-session: word split');
            }
          });
        }
        persist(); cy.screenshot(`saved-chat-${id}-${tab}-native`, { capture: 'viewport' });
      };
      keyboard('history', ['chatbot-history-new-session', 'chatbot-history-session-open', 'chatbot-history-session-delete']);
      open('favorites'); cy.wait('@saved-favorites'); cy.get('[data-testid="chatbot-favorite-card"]').should('have.length', 1); sample(favorites, 'favorites-data');
      keyboard('favorites', ['chatbot-favorite-copy', 'chatbot-favorite-reask', 'chatbot-favorite-open-session']);
      cy.then(() => {
        expect(sessionReads).to.equal(3); expect(favoriteReads).to.equal(3);
        // Existing unhandled-rejection telemetry is also blocked; permit only this exact recorded destination.
        expect(mutations.every((request) => request === `POST ${origin}/api/client-errors`)).to.equal(true);
        expect(tabEvents).to.have.length(6); expect(tabEvents.every((key) => key.trusted)).to.equal(true);
        expect(unexpected).to.deep.equal([]); finished = true;
      });
      persist(); cy.then(() => expect(findings, 'saved lists design findings').to.deep.equal([]));
    });
  }
});
