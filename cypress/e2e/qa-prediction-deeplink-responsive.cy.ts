/// <reference types="cypress" />

describe('Prediction game deep-link responsive fallback', () => {
  type ThemeMode = 'light' | 'dark';

  const syntheticGameId = 'SYNTHETIC-NODATA';
  const manualDataRequired = {
    code: 'MANUAL_BASEBALL_DATA_REQUIRED',
    message: '운영자 제공 야구 데이터가 필요합니다.',
  };

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

  const cases: Array<{ label: string; width: number; height: number; theme: ThemeMode }> = [
    { label: 'mobile-light', width: 390, height: 844, theme: 'light' },
    { label: 'mobile-dark', width: 390, height: 844, theme: 'dark' },
    { label: 'desktop-light', width: 1440, height: 900, theme: 'light' },
    { label: 'desktop-dark', width: 1440, height: 900, theme: 'dark' },
  ];

  cases.forEach(({ label, width, height, theme }) => {
    it(`renders the manual-data fallback at ${label}`, () => {
      cy.viewport(width, height);
      cy.intercept('**/api/**', {
        statusCode: 404,
        body: { code: 'NOT_FOUND', message: 'Synthetic API sink' },
      });
      cy.intercept('GET', '**/api/predictions/bootstrap*', {
        statusCode: 503,
        body: manualDataRequired,
      }).as('manualBaseballData');
      cy.intercept('GET', '**/api/auth/mypage*', {
        statusCode: 401,
        body: { message: 'Unauthenticated synthetic fixture' },
      });
      cy.intercept('POST', '**/api/auth/reissue*', {
        statusCode: 401,
        body: { message: 'Unauthenticated synthetic fixture' },
      });

      cy.visit(`/prediction/matches/${syntheticGameId}`, {
        onBeforeLoad(win) {
          seedTheme(win, theme);
        },
      });

      cy.wait('@manualBaseballData').then(({ request }) => {
        const requestUrl = new URL(request.url);
        expect(requestUrl.searchParams.get('gameId')).to.equal(syntheticGameId);
      });
      cy.contains('야구 데이터 준비가 필요합니다').should('be.visible');
      cy.contains('운영자가 데이터를 제공하면 다시 확인할 수 있습니다.').should('be.visible');
      cy.get('[data-testid="prediction-empty-state"]').should('be.visible');
      cy.get('html').should(theme === 'dark' ? 'have.class' : 'not.have.class', 'dark');
      cy.document().then((document) => {
        expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth);
      });
      cy.screenshot(`prediction-deeplink-manual-data-${label}`, { capture: 'viewport' });
    });
  });
});

describe('Prediction index manual-data-required responsive acceptance', () => {
  type ThemeMode = 'light' | 'dark';

  const manualDataRequired = {
    code: 'MANUAL_BASEBALL_DATA_REQUIRED',
    message: '운영자 제공 야구 데이터가 필요합니다.',
  };

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

  const cases: Array<{ label: string; width: number; height: number; theme: ThemeMode }> = [
    { label: 'mobile-light', width: 390, height: 844, theme: 'light' },
    { label: 'mobile-dark', width: 390, height: 844, theme: 'dark' },
    { label: 'desktop-light', width: 1400, height: 900, theme: 'light' },
    { label: 'desktop-dark', width: 1400, height: 900, theme: 'dark' },
  ];

  cases.forEach(({ label, width, height, theme }) => {
    it(`shows only the manual-data-required state at ${label}`, () => {
      cy.viewport(width, height);
      cy.intercept('**/api/**', {
        statusCode: 404,
        body: { code: 'NOT_FOUND', message: 'Synthetic API sink' },
      });
      cy.intercept('GET', '**/api/matches/day*', {
        statusCode: 503,
        body: manualDataRequired,
      }).as('manualBaseballData');
      cy.intercept('GET', '**/api/auth/mypage*', {
        statusCode: 401,
        body: { message: 'Unauthenticated synthetic fixture' },
      });
      cy.intercept('POST', '**/api/auth/reissue*', {
        statusCode: 401,
        body: { message: 'Unauthenticated synthetic fixture' },
      });

      cy.visit('/prediction', {
        onBeforeLoad(win) {
          seedTheme(win, theme);
        },
      });

      cy.wait('@manualBaseballData').then(({ request }) => {
        expect(new URL(request.url).pathname).to.contain('/api/matches/day');
      });
      cy.contains('h2', '전력분석실').should('be.visible');
      cy.get('[data-testid="prediction-tab-match"]').should('be.visible');
      cy.get('[data-testid="prediction-tab-ranking"]').should('be.visible');
      cy.contains('야구 데이터 준비가 필요합니다').should('be.visible');
      cy.contains('운영자가 데이터를 제공하면 다시 확인할 수 있습니다.').should('be.visible');
      cy.get('[data-testid="prediction-empty-state"]').should('be.visible');
      cy.get('html').should(theme === 'dark' ? 'have.class' : 'not.have.class', 'dark');
      cy.document().then((document) => {
        expect(document.documentElement.scrollWidth).to.be.at.most(document.documentElement.clientWidth);
      });
      cy.screenshot(`prediction-index-manual-data-${label}`, { capture: 'viewport' });
    });
  });
});
