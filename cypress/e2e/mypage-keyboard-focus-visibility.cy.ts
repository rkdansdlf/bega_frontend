/// <reference types="cypress" />

import {
  DEFAULT_CYPRESS_AUTH_TOKEN,
  seedCypressAuthState,
  toAuthApiUser,
  type CypressAuthUser,
} from '../support/auth';

const authUser: CypressAuthUser = {
  id: 321,
  email: 'focus-viewer@example.invalid',
  name: 'Focus Viewer',
  handle: '@focus-viewer',
  favoriteTeam: 'HH',
  role: 'ROLE_USER',
  hasPassword: true,
  profileImageUrl: null,
};

const seedAuth = (win: Window) => {
  seedCypressAuthState(win, authUser, DEFAULT_CYPRESS_AUTH_TOKEN, {
    skipPublicBootstrap: true,
    theme: 'dark',
  });
};

const viewportCases = [
  { width: 320, rootFontSize: 16 },
  { width: 320, rootFontSize: 32 },
  { width: 390, rootFontSize: 16 },
  { width: 390, rootFontSize: 32 },
];

describe('My Page mobile keyboard focus visibility', () => {
  viewportCases.forEach(({ width, rootFontSize }) => {
    it(`keeps each navigation control visible at ${width}px / ${rootFontSize / 16}x text`, () => {
      cy.viewport(width, 844);
      cy.mockAPI();
      cy.intercept('GET', '**/api/auth/mypage*', {
        statusCode: 200,
        body: { success: true, data: toAuthApiUser(authUser) },
      });
      cy.intercept({ url: /^https?:\/\/(?!127\.0\.0\.1|localhost)/ }, { forceNetworkError: true });

      cy.visit('/mypage', { onBeforeLoad: seedAuth });
      cy.contains('Focus Viewer', { timeout: 20000 }).should('be.visible');
      cy.document().then((document) => {
        document.documentElement.style.fontSize = `${rootFontSize}px`;
      });

      cy.get('nav[aria-label="마이페이지 메뉴"]', { timeout: 20000 })
        .find('button, a')
        .should('have.length', 3);
      cy.get('nav[aria-label="마이페이지 더보기"]', { timeout: 20000 })
        .find('button, a')
        .should('have.length', 7);

      cy.get('nav[aria-label="마이페이지 메뉴"], nav[aria-label="마이페이지 더보기"]')
        .find('button, a')
        .each(($item) => {
          return cy.wrap($item)
            .then(($focused) => {
              const control = $focused[0] as HTMLElement | undefined;
              if (!control || typeof control.focus !== 'function') {
                throw new Error('Focused navigation control is not an HTML element.');
              }
              control.focus({ preventScroll: true });
              return $focused;
            })
            .should(($focused) => {
              const control = $focused[0];
              const scrollport = control.closest('nav');
              if (!scrollport) {
                throw new Error('Focused navigation control has no navigation scrollport.');
              }

              const controlRect = control.getBoundingClientRect();
              const scrollportRect = scrollport.getBoundingClientRect();
              const visibleLeft = Math.max(controlRect.left, scrollportRect.left);
              const visibleRight = Math.min(controlRect.right, scrollportRect.right);
              const visibleRatio = Math.max(0, visibleRight - visibleLeft) / controlRect.width;

              expect(visibleRatio, `${control.getAttribute('data-testid')} visible width`).to.be.at.least(0.98);
            });
        });

      cy.screenshot(`mypage-focus-${width}-${rootFontSize}-focused-nav`, { capture: 'viewport' });
    });

    it(`reveals each control during native Tab traversal at ${width}px / ${rootFontSize / 16}x text`, () => {
      cy.viewport(width, 844);
      cy.mockAPI();
      cy.intercept('GET', '**/api/auth/mypage*', {
        statusCode: 200,
        body: { success: true, data: toAuthApiUser(authUser) },
      });
      cy.intercept({ url: /^https?:\/\/(?!127\.0\.0\.1|localhost)/ }, { forceNetworkError: true });

      cy.visit('/mypage', { onBeforeLoad: seedAuth });
      cy.contains('Focus Viewer', { timeout: 20000 }).should('be.visible');
      cy.document().then((document) => {
        document.documentElement.style.fontSize = `${rootFontSize}px`;
      });

      const navigationSelector = 'nav[aria-label="마이페이지 메뉴"], nav[aria-label="마이페이지 더보기"]';
      const expectedIds = new Set<string>();
      const visitedIds = new Set<string>();

      cy.get(navigationSelector, { timeout: 20000 })
        .find('button, a')
        .should('have.length', 10)
        .then(($controls) => {
          const controls = Array.from($controls, (control) => control as HTMLElement);
          controls.forEach((control) => {
            const testId = control.getAttribute('data-testid');
            if (!testId) {
              throw new Error('Every keyboard navigation control must have a test id.');
            }
            expectedIds.add(testId);
          });
          controls[0].focus({ preventScroll: true });
        });

      const recordFocusedNavigationItem = () => cy.focused().then(($focused) => {
        const control = $focused[0] as HTMLElement | undefined;
        const scrollport = control?.closest(navigationSelector);
        if (!control || !scrollport) {
          return;
        }

        const testId = control.getAttribute('data-testid');
        if (!testId || !expectedIds.has(testId)) {
          throw new Error('Native Tab focused an unexpected navigation control.');
        }
        visitedIds.add(testId);

        const controlRect = control.getBoundingClientRect();
        const scrollportRect = scrollport.getBoundingClientRect();
        const visibleLeft = Math.max(controlRect.left, scrollportRect.left);
        const visibleRight = Math.min(controlRect.right, scrollportRect.right);
        const visibleRatio = Math.max(0, visibleRight - visibleLeft) / controlRect.width;

        expect(visibleRatio, `${testId} native-Tab visible width`).to.be.at.least(0.98);
      });

      const tabUntilAllControlsAreVisited = (remainingPresses: number): Cypress.Chainable<unknown> => cy.then<unknown>(() => {
        if (visitedIds.size === expectedIds.size) {
          return;
        }
        if (remainingPresses <= 0) {
          throw new Error(`Native Tab reached ${visitedIds.size} of ${expectedIds.size} navigation controls.`);
        }

        return cy.press(Cypress.Keyboard.Keys.TAB)
          .then(() => recordFocusedNavigationItem())
          .then(() => tabUntilAllControlsAreVisited(remainingPresses - 1));
      });

      recordFocusedNavigationItem();
      tabUntilAllControlsAreVisited(40);
      cy.then(() => {
        expect([...visitedIds]).to.have.members([...expectedIds]);
      });
      cy.screenshot(`mypage-focus-native-tab-${width}-${rootFontSize}`, { capture: 'viewport' });
    });
  });
});
