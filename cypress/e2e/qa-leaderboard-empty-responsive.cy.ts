/// <reference types="cypress" />

describe('Leaderboard responsive empty-state visual acceptance', () => {
  type ThemeMode = 'light' | 'dark';

  const cases: Array<{ label: string; width: number; height: number; theme: ThemeMode }> = [
    { label: 'mobile-light', width: 390, height: 844, theme: 'light' },
    { label: 'mobile-dark', width: 390, height: 844, theme: 'dark' },
    { label: 'desktop-light', width: 1400, height: 900, theme: 'light' },
    { label: 'desktop-dark', width: 1400, height: 900, theme: 'dark' },
  ];

  const seedTheme = (win: Window, theme: ThemeMode) => {
    win.localStorage.setItem('kbo-theme', theme);
    win.localStorage.removeItem('bega-theme');
    win.localStorage.removeItem('theme');

    Object.defineProperty(win, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' && theme === 'dark',
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  };

  cases.forEach(({ label, width, height, theme }) => {
    it(`keeps the empty leaderboard state in bounds at ${label}`, () => {
      cy.viewport(width, height);
      cy.clearCookies();
      cy.clearLocalStorage();

      cy.intercept('https://**', { forceNetworkError: true });
      cy.intercept('GET', '**/api/auth/mypage*', {
        statusCode: 401,
        body: { code: 'SYNTHETIC_UNAUTHENTICATED', message: 'Guest visual fixture.' },
      });
      cy.intercept('POST', '**/api/auth/reissue*', {
        statusCode: 401,
        body: { code: 'SYNTHETIC_UNAUTHENTICATED', message: 'Guest visual fixture.' },
      });
      cy.intercept('GET', '**/api/dm/rooms/my', {
        statusCode: 200,
        body: { success: true, data: [] },
      });
      cy.intercept('GET', '**/api/notifications/my/unread-count', { statusCode: 200, body: 0 });
      cy.intercept('GET', '**/api/notifications/my', { statusCode: 200, body: [] });
      cy.intercept({ method: 'GET', pathname: '/api/leaderboard' }, {
        statusCode: 200,
        body: { content: [], totalPages: 0, totalElements: 0 },
      }).as('emptyLeaderboard');
      cy.intercept('GET', '**/api/leaderboard/hot-streaks*', { statusCode: 200, body: [] })
        .as('emptyHotStreaks');
      cy.intercept('GET', '**/api/leaderboard/recent-scores*', { statusCode: 200, body: [] })
        .as('emptyRecentScores');

      cy.visit('/leaderboard', {
        onBeforeLoad(win) {
          seedTheme(win, theme);
        },
      });

      cy.wait('@emptyLeaderboard');
      cy.wait('@emptyHotStreaks');
      cy.wait('@emptyRecentScores');
      cy.get('[data-testid="leaderboard-page-runtime"]').should('be.visible');
      cy.contains('야구경기 예측 결과').should('be.visible');
      cy.contains('아직 집계된 예측 결과가 없어요').should('be.visible');
      cy.get('html').should(theme === 'dark' ? 'have.class' : 'not.have.class', 'dark');

      if (width <= 768) {
        cy.get('.retro-leaderboard-title').should(($title) => {
          const textShadow = getComputedStyle($title[0]).textShadow;
          expect(textShadow).to.contain('2px 2px');
          expect(textShadow).not.to.contain('4px 4px');
        });
      }

      cy.window().then((win) => {
        expect(win.innerWidth).to.equal(width);
        expect(win.document.documentElement.scrollWidth)
          .to.be.at.most(win.document.documentElement.clientWidth);

        const emptyState = win.document.querySelector('.retro-leaderboard-empty');
        expect(emptyState, 'empty-state card exists').not.to.equal(null);
        const bounds = emptyState!.getBoundingClientRect();
        expect(bounds.left, 'empty-state left edge').to.be.at.least(0);
        expect(bounds.right, 'empty-state right edge').to.be.at.most(width);
      });

      cy.screenshot(`leaderboard-empty-top-${label}`, { capture: 'viewport' });
      cy.window().then((win) => {
        const scroller = win.document.scrollingElement;
        expect(scroller, 'document scrolling element exists').not.to.equal(null);
        win.document.documentElement.style.scrollBehavior = 'auto';
        scroller!.scrollTop = scroller!.scrollHeight;
      });
      cy.window().its('scrollY').should('be.greaterThan', 0);
      cy.window().then((win) => {
        expect(win.document.documentElement.scrollWidth)
          .to.be.at.most(win.document.documentElement.clientWidth);
      });
      cy.screenshot(`leaderboard-empty-bottom-${label}`, { capture: 'viewport' });
    });
  });
});

export {};
