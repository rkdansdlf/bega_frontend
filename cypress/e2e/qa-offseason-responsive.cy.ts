/// <reference types="cypress" />

type Theme = 'light' | 'dark';

const viewports = [
  { id: 'mobile', width: 390, height: 844 },
  { id: 'desktop', width: 1400, height: 900 },
] as const;

const themes: Theme[] = ['light', 'dark'];

describe('offseason home empty-data responsive visual QA', () => {
  viewports.forEach((viewport) => {
    themes.forEach((theme) => {
      it(`renders the route at ${viewport.id} in ${theme} theme without layout overflow`, () => {
        cy.viewport(viewport.width, viewport.height);
        cy.intercept('GET', '**/auth/mypage*', {
          statusCode: 401,
          body: { success: false, code: 'UNAUTHORIZED' },
        });
        cy.intercept('**/auth/reissue*', {
          statusCode: 401,
          body: { success: false, code: 'UNAUTHORIZED' },
        });
        cy.intercept('https://**', { forceNetworkError: true });

        // Empty fixtures keep the check focused on layout, not baseball facts.
        cy.intercept('GET', '**/kbo/offseason/movements*', {
          statusCode: 200,
          body: [],
        }).as('offseasonMovements');
        cy.intercept('GET', '**/kbo/offseason/metadata*', {
          statusCode: 200,
          body: { awards: [] },
        }).as('offseasonMetadata');
        cy.intercept('GET', '**/kbo/rankings/2025*', {
          statusCode: 200,
          body: [],
        }).as('offseasonRankings');

        cy.visit('/offseason', {
          onBeforeLoad(win) {
            win.localStorage.setItem('kbo-theme', theme);
            win.localStorage.removeItem('bega-theme');
            win.localStorage.removeItem('theme');
            win.document.documentElement.classList.toggle('dark', theme === 'dark');
          },
        });

        cy.wait('@offseasonMovements');
        cy.wait('@offseasonMetadata');
        cy.wait('@offseasonRankings');
        cy.get('[data-testid="offseason-home-primary-runtime"]').should('be.visible');
        cy.contains('h2', '스토브리그 하이라이트').should('be.visible');
        cy.document().should((doc) => {
          expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
          expect(Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth))
            .to.be.at.most(viewport.width);
        });
        cy.screenshot(`offseason-home-${viewport.id}-${theme}-top`, { capture: 'viewport' });

        cy.window().then((win) => {
          win.scrollTo(0, win.document.documentElement.scrollHeight);
        });
        cy.window().should((win) => {
          expect(win.scrollY + win.innerHeight)
            .to.be.at.least(win.document.documentElement.scrollHeight - 2);
        });
        cy.screenshot(`offseason-home-${viewport.id}-${theme}-bottom`, { capture: 'viewport' });
      });
    });
  });

  viewports.forEach((viewport) => {
    themes.forEach((theme) => {
      it(`renders the movement list at ${viewport.id} in ${theme} theme without layout overflow`, () => {
        cy.viewport(viewport.width, viewport.height);
        cy.intercept('GET', '**/auth/mypage*', {
          statusCode: 401,
          body: { success: false, code: 'UNAUTHORIZED' },
        });
        cy.intercept('**/auth/reissue*', {
          statusCode: 401,
          body: { success: false, code: 'UNAUTHORIZED' },
        });
        cy.intercept('https://**', { forceNetworkError: true });
        cy.intercept('GET', '**/kbo/offseason/movements*', {
          statusCode: 200,
          body: [],
        }).as('offseasonListMovements');

        cy.visit('/offseason/list', {
          onBeforeLoad(win) {
            win.localStorage.setItem('kbo-theme', theme);
            win.localStorage.removeItem('bega-theme');
            win.localStorage.removeItem('theme');
            win.document.documentElement.classList.toggle('dark', theme === 'dark');
          },
        });

        cy.wait('@offseasonListMovements');
        cy.get('[data-testid="offseason-list-runtime"]').should('be.visible');
        cy.contains('h1', 'KBO 스토브리그').should('be.visible');
        cy.contains('h2', '이적 타임라인').should('be.visible');
        cy.document().should((doc) => {
          expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
          expect(Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth))
            .to.be.at.most(viewport.width);
        });
        cy.screenshot(`offseason-list-${viewport.id}-${theme}-top`, { capture: 'viewport' });

        cy.window().then((win) => {
          win.scrollTo(0, win.document.documentElement.scrollHeight);
        });
        cy.window().should((win) => {
          expect(win.scrollY + win.innerHeight)
            .to.be.at.least(win.document.documentElement.scrollHeight - 2);
        });
        cy.screenshot(`offseason-list-${viewport.id}-${theme}-bottom`, { capture: 'viewport' });
      });
    });
  });
});

export {};
