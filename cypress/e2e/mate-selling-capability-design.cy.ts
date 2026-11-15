/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';
import type { MatePaymentCapability } from '../../src/types/mate';

// Fictional UI-only party; no real game, account, venue, price, ticket or payment.
const party = { id: 990051, hostId: 990052, hostHandle: 'synthetic_seller', hostName: '합성 판매자', hostBadge: 'NEW',
  status: 'SELLING', gameDate: '2099-01-01', gameTime: '12:00:00', stadium: '합성 화면 검증 구장',
  homeTeam: 'TESTH', awayTeam: 'TESTA', teamId: 'TESTH', section: '합성 좌석', price: 10000, ticketPrice: 10000,
  maxParticipants: 2, currentParticipants: 1, reservationDepositAmount: 0, ticketVerified: false,
  description: '실제 판매가 아닌 합성 화면 검증입니다.', createdAt: '2098-12-01T00:00:00' };

describe('Mate selling capability presentation without submission', () => {
  for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
    it(`${width}px / ${font}px / ${theme}`, () => {
      const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
      expect(new URL(origin).hostname).to.equal('127.0.0.1');
      const route = `/mate/${party.id}/apply`, button = `[data-testid="mate-apply-submit-${width === 1280 ? 'desktop' : 'mobile'}"]`;
      const viewer = { id: 990053, email: 'selling-design@example.invalid', name: '합성 구매자', handle: 'synthetic_buyer',
        role: 'ROLE_USER', favoriteTeam: null, profileImageUrl: null, hasPassword: true };
      const mutations: string[] = [], unexpected: string[] = [], findings: string[] = [];
      const observations: Array<Record<string, unknown>> = [];
      let mode: 'error' | 'required' | 'available' = 'error', reads = 0, capabilityReads = 0, foreignBlocked = 0, finished = false;
      let release!: () => void;
      const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
      const persist = () => cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/selling-capability-${id}.json`, {
        width, font, theme, reads, capabilityReads, foreignBlocked, mutations, unexpected, findings, observations, finished,
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
      cy.intercept('GET', `${origin}/api/parties/${party.id}`, (req) => {
        expect(new URL(req.url).search).to.equal(''); reads++; req.alias = 'selling-party'; req.reply({ body: party });
      });
      cy.intercept('GET', `${origin}/api/payments/capability`, (req) => {
        expect(new URL(req.url).search).to.equal(''); capabilityReads++; req.alias = 'selling-capability';
        if (mode === 'error') return gate.then(() => req.reply({ statusCode: 503, body: { message: '합성 결제 모드 조회 실패' } }));
        const required = mode === 'required';
        const body: MatePaymentCapability = { businessMode: required ? 'IN_APP_PAYMENT' : 'DIRECT_TRADE', environment: required ? 'TEST' : 'NONE',
          paymentMode: required ? 'IN_APP_PAYMENT' : 'DIRECT_TRADE', payoutEnabled: false, payoutProvider: 'UNSUPPORTED',
          provider: required ? 'TOSS' : 'UNSUPPORTED', sellingPaymentRequired: required, tossPaymentEnabled: required };
        req.reply({ body });
      });
      const visit = () => {
        cy.visit(route, { onBeforeLoad(win) {
          win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
          win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
        } });
        cy.wait('@selling-party'); cy.get('[data-testid="mate-apply"]').should('be.visible');
        cy.get('textarea#message').should('not.exist'); cy.get('[data-testid="mate-apply-ticket-panel"]').should('not.exist');
      };
      const sample = (state: 'pending' | 'error' | 'required' | 'available', copy: string) => {
        const blocked = state !== 'available';
        cy.contains('[data-testid="mate-apply"]', copy).should('exist');
        cy.get(button).should(blocked ? 'be.disabled' : 'be.enabled').and('contain.text', blocked ? '앱 결제 준비 중' : '직거래 신청하기');
        cy.document().then(async (doc) => { await doc.fonts.ready; });
        cy.get('[data-testid="mate-apply"]').then(($main) => {
          const main = $main[0], doc = main.ownerDocument, win = doc.defaultView!;
          expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
          expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
          const documentWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth);
          const clipped = Array.from(main.querySelectorAll<HTMLElement>('h1,h3,p,li')).filter((el) => Cypress.dom.isVisible(el)
            && el.scrollWidth > el.clientWidth + 1).map((el) => ({ text: el.textContent, client: el.clientWidth, scroll: el.scrollWidth }));
          const statusLabel = Array.from(main.querySelectorAll('p')).find((p) => p.textContent === '현재 상태');
          expect(statusLabel, 'current-status label exists').not.to.equal(undefined);
          expect(statusLabel!.nextElementSibling, 'current-status value exists').not.to.equal(null);
          const status = statusLabel!.nextElementSibling!.textContent;
          expect(status?.trim(), 'current-status value is nonempty').not.to.equal('');
          observations.push({ state, documentWidth, clipped, status, copy });
          if (documentWidth > width + 1 || clipped.length) findings.push(`${state}: horizontal overflow/clipping`);
          if (blocked && status?.includes('신청 가능')) findings.push(`${state}: blocked application labeled available`);
          const notice = Array.from(main.querySelectorAll<HTMLElement>('p,[role="alert"]')).find((el) => el.textContent === copy);
          notice?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        });
        persist(); cy.screenshot(`selling-capability-${id}-${state}-notice`, { capture: 'viewport' });
        cy.get(button).then(($el) => {
          const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
          el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
          const r = el.getBoundingClientRect();
          const dock = doc.querySelector('[data-testid="auth-mobile-bottom-nav"]')?.getBoundingClientRect();
          const header = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
          const clearBounds = r.top >= Math.max(header?.bottom ?? 0, 0) && r.bottom <= Math.min(dock && dock.width > 0 ? dock.top : win.innerHeight, win.innerHeight);
          const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          const centerClear = Boolean(hit && (hit === el || el.contains(hit)));
          observations.push({ state, target: 'submit', disabled: (el as HTMLButtonElement).disabled, width: r.width, height: r.height,
            top: r.top, bottom: r.bottom, clearBounds, centerClear, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth });
          if (width < 640) {
            const node = el.firstChild;
            expect(node?.nodeType, 'submit label text node').to.equal(win.Node.TEXT_NODE);
            const words = Array.from(el.textContent!.matchAll(/\S+/g)).map((match) => {
              const range = doc.createRange();
              range.setStart(node!, match.index!); range.setEnd(node!, match.index! + match[0].length);
              const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
              return { word: match[0], lines: new Set(rects.map((rect) => Math.round(rect.top * 10) / 10)).size };
            });
            observations.push({ state, target: 'submit-word-wrap', words });
            if (words.some((word) => word.lines !== 1)) findings.push(`${state}: submit label word split`);
          }
          if (!clearBounds || r.width < 43.99 || r.height < 43.99 || el.scrollWidth > el.clientWidth + 1) findings.push(`${state}: submit geometry`);
          // Disabled controls use pointer-events:none; hit ownership only applies to the enabled presentation.
          if (!blocked && !centerClear) findings.push(`${state}: enabled submit center obscured`);
        });
        persist(); cy.screenshot(`selling-capability-${id}-${state}-submit`, { capture: 'viewport' });
      };
      cy.viewport(width, width === 1280 ? 900 : 844); visit();
      cy.wrap(null).should(() => expect(capabilityReads).to.equal(1));
      sample('pending', '결제 모드를 확인하는 중입니다.');
      cy.then(() => release()); cy.wait('@selling-capability').its('response.statusCode').should('equal', 503);
      sample('error', '결제 모드 정보를 확인할 수 없어 판매 신청을 잠시 막았습니다.');
      cy.then(() => { mode = 'required'; }); visit(); cy.wait('@selling-capability').its('response.statusCode').should('equal', 200);
      sample('required', '현재 서버가 앱 결제를 요구하지만 결제 화면이 아직 연결되지 않았습니다.');
      cy.then(() => { mode = 'available'; }); visit(); cy.wait('@selling-capability').its('response.statusCode').should('equal', 200);
      sample('available', '구매 신청 후 호스트 승인 시 채팅으로 직거래 시간과 장소를 조율합니다.');
      cy.then(() => {
        expect(reads).to.equal(3); expect(capabilityReads).to.equal(3); expect(unexpected).to.deep.equal([]); expect(mutations).to.deep.equal([]); finished = true;
      }); persist(); cy.then(() => expect(findings, 'selling presentation findings').to.deep.equal([]));
    });
  }
});
