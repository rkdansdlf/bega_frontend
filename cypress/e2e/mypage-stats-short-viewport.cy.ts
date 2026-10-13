/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

const user = {
  id: 123,
  email: 'short-viewport@example.invalid',
  name: 'Layout Test',
  handle: 'layout-test',
  favoriteTeam: null,
};

describe('MyPage statistics error on short mobile viewports', () => {
  beforeEach(() => {
    const base = new URL(String(Cypress.config('baseUrl')));
    expect(base.hostname).to.eq('127.0.0.1');
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.intercept({ url: '**', middleware: true }, (request) => {
      if (new URL(request.url).origin !== base.origin) {
        request.reply({ statusCode: 204, log: false });
      }
    });
    cy.intercept({ pathname: /^\/api(?:\/|$)/ }, {
      statusCode: 503,
      body: { code: 'TEST_ONLY_UNMOCKED_REQUEST' },
      log: false,
    });
    cy.mockAPI();
  });

  for (const height of [633, 900]) {
    for (const theme of ['light', 'dark'] as const) {
      it(`keeps error guidance above the mobile navigation at 390x${height} (${theme})`, () => {
        cy.viewport(390, height);
        cy.intercept('GET', '**/api/auth/mypage*', {
          statusCode: 200,
          body: {
            success: true,
            data: { ...user, role: 'ROLE_USER', hasPassword: true },
          },
        });
        cy.intercept('GET', '**/api/diary*', { statusCode: 200, body: [] });
        cy.intercept('GET', '**/api/diary/statistics*', {
          statusCode: 503,
          body: { code: 'LOCAL_QA_FAILURE' },
        }).as('statistics');

        cy.visit('/mypage?view=stats', {
          onBeforeLoad(win) {
            seedCypressAuthState(win, user, undefined, { theme });
            const NativeWebSocket = win.WebSocket;
            win.WebSocket = new Proxy(NativeWebSocket, {
              construct(target, args) {
                const url = new URL(String(args[0]), win.location.href);
                if (args[1] === 'vite-hmr' && url.host === win.location.host) {
                  return Reflect.construct(target, args);
                }
                return Object.assign(new win.EventTarget(), {
                  readyState: NativeWebSocket.CLOSED,
                  close() {},
                  send() {},
                  onopen: null,
                  onclose: null,
                  onerror: null,
                  onmessage: null,
                });
              },
            });
          },
        });

        cy.wait('@statistics');
        cy.get('html').should('have.class', theme);
        cy.get('section[data-screen-label="나의 기록"] [role="alert"]', { timeout: 20000 })
          .should('be.visible')
          .and('contain.text', '통계를 불러오지 못했어요');
        cy.document().then((doc) => {
          const message = doc.querySelector<HTMLElement>(
            'section[data-screen-label="나의 기록"] .mypage-season-empty-copy',
          );
          const nav = doc.querySelector<HTMLElement>('[data-testid="auth-mobile-bottom-nav"]');
          expect(message, 'error guidance').to.exist;
          expect(nav, 'authenticated mobile navigation').to.exist;
          const win = doc.defaultView!;
          expect(win.innerWidth).to.eq(390);
          expect(win.innerHeight).to.eq(height);
          const messageRect = message!.getBoundingClientRect();
          const navTop = nav!.getBoundingClientRect().top;
          const section = message!.closest<HTMLElement>('section[data-screen-label="나의 기록"]')!;
          cy.writeFile(`../output/mypage-stats-short-viewport-20260927/${height}-${theme}.json`, {
            viewport: { width: win.innerWidth, height: win.innerHeight },
            theme,
            sectionClass: section.className,
            sectionPaddingBottom: win.getComputedStyle(section).paddingBottom,
            messageTop: messageRect.top,
            messageBottom: messageRect.bottom,
            navTop,
            scrollY: win.scrollY,
          }).then(() => {
            expect(messageRect.top, 'error guidance is in the viewport').to.be.at.least(0);
            expect(messageRect.bottom, 'error guidance clears navigation').to.be.at.most(navTop - 8);
            cy.screenshot(`mypage-stats-${height}-${theme}-initial`, { capture: 'viewport' });
          });
        });
      });
    }
  }
});
