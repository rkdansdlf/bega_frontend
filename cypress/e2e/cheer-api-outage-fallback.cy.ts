/// <reference types="cypress" />

export {};

type CheerWindow = Window & {
  __cheerRuntimeErrors?: string[];
  __cheerUnhandledRejections?: string[];
};

const viewports = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 390, height: 844 },
];

describe('Cheer API outage fallback', () => {
  viewports.forEach(({ name, width, height }) => {
    it(`keeps section-level retry states without a global render error at ${name}`, () => {
      cy.viewport(width, height);
      cy.intercept('GET', '**/api/auth/mypage*', {
        statusCode: 401,
        body: { success: false, code: 'UNAUTHORIZED', message: '인증이 필요합니다.' },
      });
      cy.intercept('**/api/auth/reissue*', {
        statusCode: 401,
        body: { success: false, code: 'UNAUTHORIZED', message: '인증이 필요합니다.' },
      });
      cy.intercept('GET', '**/api/cheer/posts*', { forceNetworkError: true })
        .as('cheerPostsUnavailable');
      cy.intercept('GET', '**/api/leaderboard*', { forceNetworkError: true });
      cy.intercept('GET', '**/api/kbo/schedule*', { forceNetworkError: true });

      cy.visit('/cheer', {
        onBeforeLoad: (window) => {
          const observedWindow = window as CheerWindow;
          observedWindow.__cheerRuntimeErrors = [];
          observedWindow.__cheerUnhandledRejections = [];
          window.addEventListener('error', (event) => {
            observedWindow.__cheerRuntimeErrors?.push(event.message);
          });
          window.addEventListener('unhandledrejection', (event) => {
            observedWindow.__cheerUnhandledRejections?.push(String(event.reason));
          });
        },
      });

      cy.wait('@cheerPostsUnavailable');
      cy.get('[data-testid="cheer-feed-error-state"]')
        .should('be.visible')
        .within(() => {
          cy.contains('데이터를 불러오지 못했습니다').should('be.visible');
          cy.contains('button', '다시 시도').should('be.visible');
        });
      cy.contains('h1', '문제가 발생했습니다').should('not.exist');
      cy.window().then((window) => {
        const observedWindow = window as CheerWindow;
        expect(observedWindow.__cheerRuntimeErrors).to.deep.equal([]);
        expect(observedWindow.__cheerUnhandledRejections).to.deep.equal([]);
      });
      cy.screenshot(`cheer-api-outage-fallback-${name}`, { capture: 'viewport' });
    });
  });
});
