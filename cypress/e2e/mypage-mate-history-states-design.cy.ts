/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';
import type { MateParty } from '../../src/types/mate';

// These are fictional UI records, not real baseball games, venues or applications.
const makeParty = (index: number): MateParty => ({ id: 990100 + index, hostId: 990099, hostHandle: 'synthetic_history_host',
  teamId: 'TESTH', homeTeam: 'TESTH', awayTeam: 'TESTA', cheeringSide: 'HOME', stadium: `합성 검증 구장 ${index + 1}`,
  gameDate: '2099-01-01', gameTime: '12:00:00', section: '합성 좌석', currentParticipants: 2, maxParticipants: 3,
  status: 'MATCHED', description: '실제 이용 내역이 아닌 합성 화면 자료입니다.' });

describe('My Page mate history supported read states', () => {
  for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
    it(`${width}px / ${font}px / ${theme}`, () => {
      const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
      expect(new URL(origin).hostname).to.equal('127.0.0.1');
      const viewer = { id: 990098, email: 'mate-history@example.invalid', name: '합성 내역 사용자', handle: 'synthetic_history_viewer',
        role: 'ROLE_USER', favoriteTeam: null, profileImageUrl: null, hasPassword: true };
      const section = '[data-testid="mypage-mate-history-section"]', cards = `${section} [data-testid="mypage-mate-card"]`;
      const more = '[data-testid="mypage-mate-history-load-more"]';
      const assertCards = (count: number) => cy.get(cards).should(($cards) => {
        expect(Array.from($cards, (card) => card.querySelector('h3')?.textContent?.trim()))
          .to.deep.equal(Array.from({ length: count }, (_, index) => makeParty(index).stadium));
      });
      const findings: string[] = [], unexpected: string[] = [], mutations: string[] = [], reads: string[] = [];
      const observations: Array<Record<string, unknown>> = [], keys: Array<{ trusted: boolean }> = [];
      let allReads = 0, moreReads = 0, foreignBlocked = 0, finished = false;
      let allowAllRecovery = false, allowMoreRecovery = false;
      let releaseAll!: () => void, releaseMore!: () => void;
      const allGate = new Cypress.Promise<void>((resolve) => { releaseAll = resolve; });
      const moreGate = new Cypress.Promise<void>((resolve) => { releaseMore = resolve; });
      const persist = () => cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/mate-history-${id}.json`, {
        width, font, theme, allReads, moreReads, foreignBlocked, reads, unexpected, mutations, keys, findings, observations, finished,
      }));
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
      const page = (content: MateParty[], number = 0, total = content.length, totalPages = content.length ? 1 : 0) => ({
        content, number, size: 20, totalElements: total, totalPages, last: number + 1 >= totalPages,
      });
      cy.intercept('GET', `${origin}/api/parties/my/history?*`, (req) => {
        const url = new URL(req.url), group = url.searchParams.get('group'), number = url.searchParams.get('page');
        expect(Array.from(url.searchParams.keys()).sort()).to.deep.equal(['group', 'page', 'size']);
        expect(url.searchParams.get('size')).to.equal('20'); expect(['all', 'completed', 'ongoing']).to.include(group);
        expect(['0', '1']).to.include(number); reads.push(`${group}:${number}`); req.alias = `history-${group}-${number}`;
        if (group === 'all') {
          expect(number).to.equal('0'); allReads++;
          if (!allowAllRecovery) return allGate.then(() => req.reply({ statusCode: 503, body: { message: '합성 내역 조회 실패' } }));
          return req.reply({ body: page([]) });
        }
        if (group === 'completed') { expect(number).to.equal('0'); return req.reply({ body: page([]) }); }
        if (number === '0') return req.reply({ body: page(Array.from({ length: 20 }, (_, index) => makeParty(index)), 0, 21, 2) });
        moreReads++;
        if (!allowMoreRecovery) return moreGate.then(() => req.reply({ statusCode: 503, body: { message: '합성 추가 조회 실패' } }));
        return req.reply({ body: page([makeParty(20)], 1, 21, 2) });
      });
      const settle = () => cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
      const sample = (state: string) => {
        cy.get(section).then(async ($el) => { await $el[0].ownerDocument.fonts.ready; }); settle();
        cy.get(section).then(($el) => {
          const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
          expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
          expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
          const documentWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth);
          const clipped = Array.from(el.querySelectorAll<HTMLElement>('h1,h3,p,span,button')).filter((node) => Cypress.dom.isVisible(node)
            && node.scrollWidth > node.clientWidth + 1).map((node) => ({ text: node.textContent?.slice(0, 100), client: node.clientWidth, scroll: node.scrollWidth }));
          observations.push({ state, documentWidth, clipped, text: el.textContent?.slice(0, 700), count: el.querySelectorAll('[data-testid="mypage-mate-card"]').length });
          if (documentWidth > width + 1 || clipped.length) findings.push(`${state}: horizontal clipping/overflow`);
          const escaped = Array.from(el.querySelectorAll<HTMLElement>('[data-testid="mypage-mate-card"]')).flatMap((card, index) => {
            const cr = card.getBoundingClientRect(), sr = el.getBoundingClientRect();
            const outer = cr.left < sr.left - 1 || cr.right > sr.right + 1
              ? [{ index, kind: 'outside-section', cardLeft: cr.left, cardRight: cr.right, sectionLeft: sr.left, sectionRight: sr.right }] : [];
            const children = Array.from(card.querySelectorAll<HTMLElement>('.mypage-season-mate-top > *, .mypage-season-mate-meta > span')).flatMap((child) => {
              const r = child.getBoundingClientRect();
              return r.left < cr.left - 1 || r.right > cr.right + 1
                ? [{ index, text: child.textContent, cardLeft: cr.left, cardRight: cr.right, left: r.left, right: r.right }] : [];
            });
            return [...outer, ...children];
          });
          observations.push({ state, kind: 'card-boundaries', escaped });
          if (escaped.length) findings.push(`${state}: card content exceeds card boundary`);
          if (state === 'all-held') {
            const targets = Array.from(el.querySelectorAll<HTMLElement>('[data-testid="mypage-mate-history-tabs"] button')).map((target) => {
              const r = target.getBoundingClientRect(); return { target: target.getAttribute('data-testid'), width: r.width, height: r.height };
            });
            expect(targets).to.have.length(3); observations.push({ state, kind: 'tab-targets', targets });
            if (targets.some((target) => target.width < 43.99 || target.height < 43.99)) findings.push('history-tabs: target below44px');
          }
        }); persist(); cy.screenshot(`mate-history-${id}-${state}`, { capture: 'viewport' });
      };
      const align = (selector: string) => cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
      const tab = (name: string) => { const selector = `[data-testid="mypage-mate-history-tab-${name}"]`; align(selector); cy.get(selector).click({ scrollBehavior: false }); };
      cy.viewport(width, width === 1280 ? 900 : 844);
      cy.visit('/mypage?view=mateHistory', { onBeforeLoad(win) {
        win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
        win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
        win.addEventListener('keydown', (event) => { if (event.key === 'Tab') keys.push({ trusted: event.isTrusted }); });
      } });
      cy.wrap(null).should(() => expect(allReads).to.equal(1));
      cy.contains(section, '메이트 내역을 불러오는 중...').should('exist'); align(section); sample('all-held');
      cy.then(() => releaseAll()); cy.wait('@history-all-0').its('response.statusCode').should('equal', 503);
      cy.wait('@history-all-0').its('response.statusCode').should('equal', 503);
      cy.contains(section, '메이트 내역을 불러오는 중...').should('not.exist'); sample('all503');
      cy.get(section).then(($el) => {
        const falseEmpty = $el.text().includes('참여한 메이트 내역이 없습니다');
        const localErrorIndicator = /불러오.*(실패|못)|오류|다시 시도/.test($el.text());
        observations.push({ state: 'initial-error-distinction', falseEmpty, localErrorIndicator,
          toastPresent: $el[0].ownerDocument.body.textContent?.includes('메이트 내역을 불러오는데 실패했습니다.') });
        if (falseEmpty) findings.push('all503: failed initial query presented as healthy empty');
        if (!localErrorIndicator) findings.push('all503: no local error indicator');
      });
      tab('completed'); cy.wait('@history-completed-0'); cy.contains(section, '완료된 메이트 내역이 없습니다').should('exist'); sample('completed-empty');
      tab('ongoing'); cy.wait('@history-ongoing-0'); assertCards(20); sample('ongoing-page0');
      const measureNative = (expected: string, label: string) => {
        cy.press(Cypress.Keyboard.Keys.TAB); settle();
        cy.document().then((doc) => {
          const el = doc.activeElement as HTMLElement, r = el.getBoundingClientRect(), actual = el.getAttribute('data-testid');
          const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), clear = Boolean(hit && (hit === el || el.contains(hit)));
          observations.push({ state: label, expected, actual, width: r.width, height: r.height, top: r.top, bottom: r.bottom, clear, focusVisible: el.matches(':focus-visible') });
          if (actual !== expected || !clear || !el.matches(':focus-visible')) findings.push(`${label}: native focus/order/center`);
          if (label === 'first-card-native') expect(el, 'first returned record receives focus').to.equal(doc.querySelector(cards));
          if (r.width < 43.99 || r.height < 43.99) findings.push(`${label}: target below44px`);
        });
      };
      cy.get('[data-testid="mypage-mate-history-tab-ongoing"]').focus(); measureNative('mypage-mate-card', 'first-card-native');
      cy.get(cards).last().then(($el) => { $el[0].focus(); $el[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); });
      measureNative('mypage-mate-history-load-more', 'load-more-native'); persist(); cy.screenshot(`mate-history-${id}-more-native`, { capture: 'viewport' });
      cy.get(more).click(); cy.wrap(null).should(() => expect(moreReads).to.equal(1));
      cy.get(more).should('be.disabled').and('contain.text', '불러오는 중...'); assertCards(20); sample('more-held');
      cy.then(() => releaseMore()); cy.wait('@history-ongoing-1').its('response.statusCode').should('equal', 503);
      cy.wait('@history-ongoing-1').its('response.statusCode').should('equal', 503);
      cy.get(more).should('be.enabled').and('contain.text', '더보기'); assertCards(20); sample('more503-retained');
      cy.then(() => { allowMoreRecovery = true; });
      cy.get(more).click(); cy.wait('@history-ongoing-1').its('response.statusCode').should('equal', 200);
      assertCards(21); cy.get(more).should('not.exist'); sample('more-recovered');
      cy.then(() => { allowAllRecovery = true; }); tab('all'); cy.wait('@history-all-0').its('response.statusCode').should('equal', 200);
      cy.contains(section, '참여한 메이트 내역이 없습니다').should('exist'); cy.get(cards).should('not.exist'); sample('all-recovered-empty');
      tab('completed'); cy.contains(section, '완료된 메이트 내역이 없습니다').should('exist');
      cy.then(() => {
        expect(reads).to.deep.equal(['all:0', 'all:0', 'completed:0', 'ongoing:0', 'ongoing:1', 'ongoing:1', 'ongoing:1', 'all:0']);
        expect(keys).to.have.length(2); expect(keys.every((key) => key.trusted)).to.equal(true);
        expect(mutations).to.deep.equal([]); expect(unexpected).to.deep.equal([]); finished = true;
      }); persist(); cy.then(() => expect(findings, 'mate-history design findings').to.deep.equal([]));
    });
  }
});
