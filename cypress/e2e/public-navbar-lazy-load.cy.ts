/// <reference types="cypress" />

import { visitHomePage } from '../support/homePage';

const getPublicNavbarChunkCounts = (win: Window) => {
  const resourceEntries = win.performance.getEntriesByType('resource');
  const countChunkLoads = (chunkName: string) => (
    resourceEntries.filter((entry) => entry.name.includes(chunkName)).length
  );

  return {
    menuPanel: countChunkLoads('/PublicNavbarMenuPanel.tsx') + countChunkLoads('PublicNavbarMenuPanel-'),
    desktopAuth: countChunkLoads('/PublicNavbarDesktopAuthControls.tsx') + countChunkLoads('PublicNavbarDesktopAuthControls-'),
  };
};

describe('Public navbar deferred loading', () => {
  beforeEach(() => {
    cy.viewport(390, 844);
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.mockAPI();
  });

  it('keeps mobile menu panel out of the initial public shell until the menu opens', () => {
    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
    });

    cy.wait('@getHomeBootstrap');
    cy.contains('KBO LEAGUE', { timeout: 10000 }).should('be.visible');

    cy.window().then((win) => {
      const chunkCounts = getPublicNavbarChunkCounts(win);
      expect(chunkCounts.menuPanel).to.eq(0);
      expect(chunkCounts.desktopAuth).to.eq(0);
    });

    cy.get('button[aria-label="메뉴 열기"]').click();
    cy.contains('메뉴').should('be.visible');

    cy.window().then((win) => {
      const chunkCounts = getPublicNavbarChunkCounts(win);
      expect(chunkCounts.menuPanel).to.be.greaterThan(0);
      expect(chunkCounts.desktopAuth).to.eq(0);
    });
  });

  it('keeps public mobile navigation labels readable at 320px with enlarged root text', () => {
    cy.viewport(320, 844);
    visitHomePage({
      path: '/home',
      authenticated: false,
      resetStorage: true,
    });
    cy.wait('@getHomeBootstrap');
    cy.document().then((document) => {
      document.documentElement.style.fontSize = '32px';
      expect(
        document.defaultView?.getComputedStyle(document.documentElement).fontSize,
        'root text stress setting is active',
      ).to.eq('32px');
    });

    cy.get('[data-testid="public-mobile-bottom-nav"]').should('be.visible').within(() => {
      cy.get('[data-mobile-chrome-label]').each(($label) => {
        const label = $label[0] as HTMLElement;
        const style = label.ownerDocument.defaultView?.getComputedStyle(label);
        expect(style?.whiteSpace, 'public bottom-navigation label wraps').not.to.eq('nowrap');
        expect(style?.textOverflow, 'public bottom-navigation label is not ellipsized').not.to.eq('ellipsis');
        expect(Number.parseFloat(style?.fontSize ?? '0'), 'public bottom-navigation label follows enlarged root text')
          .to.be.at.least(20);
        expect(label.scrollWidth, 'public bottom-navigation label has no horizontal clipping')
          .to.be.at.most(label.clientWidth + 1);
        expect(label.scrollHeight, 'public bottom-navigation label has no vertical clipping')
          .to.be.at.most(label.clientHeight + 1);
      });
      cy.get('[data-testid="public-mobile-chatbot-tab"]')
        .should('have.attr', 'aria-label', 'BEGA 챗봇 열기')
        .find('[data-mobile-chrome-label]')
        .should('have.text', '챗봇');
    });

    cy.screenshot('public-navbar-labels-320-32px', { capture: 'viewport' });
    cy.document().then((document) => {
      document.documentElement.style.fontSize = '16px';
    });
    cy.get('[data-testid="public-mobile-bottom-nav"] [data-mobile-chrome-label]').each(($label) => {
      const label = $label[0] as HTMLElement;
      expect(
        Number.parseFloat(label.ownerDocument.defaultView?.getComputedStyle(label).fontSize ?? '0'),
        'public bottom-navigation labels retain their baseline size',
      ).to.eq(10.5);
    });
  });
});
