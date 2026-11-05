/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

type MateListState = 'loading' | 'empty' | 'error';
type Theme = 'light' | 'dark';
const mobileDockSelector = '[data-testid="auth-mobile-bottom-nav"], [data-testid="public-mobile-bottom-nav"]';

const testUser = {
  id: 123,
  email: 'mate-list-visual@example.com',
  name: 'Mate Visual User',
  handle: 'matevisual',
  role: 'ROLE_USER',
  favoriteTeam: 'HH',
  profileImageUrl: null,
  hasPassword: true,
};

const viewports = [
  { name: 'mobile-320', width: 320, height: 844 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'desktop-1280', width: 1280, height: 900 },
] as const;

const themes: Theme[] = ['light', 'dark'];
const rootTextSizes = [16, 32] as const;
const emptyPartiesResponse = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 9,
};

describe('Mate list loading, empty, and error visual states', () => {
  const visitState = (state: MateListState, theme: Theme, rootTextSize: number) => {
    cy.intercept({ method: 'GET', pathname: '/api/parties' }, (request) => {
      if (state === 'loading') {
        request.reply({ statusCode: 200, delay: 10000, body: emptyPartiesResponse });
        return;
      }

      if (state === 'error') {
        request.reply({ statusCode: 503, body: { message: 'synthetic mate-list failure' } });
        return;
      }

      request.reply({ statusCode: 200, body: emptyPartiesResponse });
    }).as('mateListStateResponse');

    cy.visit('/mate', {
      onBeforeLoad(win) {
        seedCypressAuthState(win, testUser, 'mate-list-visual-token', { theme });
        win.document.documentElement.style.fontSize = `${rootTextSize}px`;
      },
    });

    cy.window().then((win) => {
      seedCypressAuthState(win, testUser, 'mate-list-visual-token', { theme });
      win.document.documentElement.classList.toggle('dark', theme === 'dark');
      expect(win.document.documentElement.classList.contains('dark'), 'requested theme is active')
        .to.eq(theme === 'dark');
      expect(win.getComputedStyle(win.document.documentElement).fontSize, 'root text stress is active')
        .to.eq(`${rootTextSize}px`);
    });
  };

  const assertNoHorizontalOverflow = () => {
    cy.document().should((document) => {
      expect(
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        'document has no horizontal overflow',
      ).to.be.at.most(document.documentElement.clientWidth + 1);
    });
  };

  const assertActionReachableAboveDock = (selector: string, hasMobileDock: boolean) => {
    cy.get(selector).scrollIntoView().should(($action) => {
      const action = $action[0] as HTMLElement;
      const document = action.ownerDocument;
      const window = document.defaultView;
      expect(window, 'browser window exists').not.to.equal(null);
      const rect = action.getBoundingClientRect();
      const scrollMetrics = {
        top: rect.top,
        bottom: rect.bottom,
        scrollY: window!.scrollY,
        rootScrollTop: document.scrollingElement?.scrollTop,
        rootScrollHeight: document.scrollingElement?.scrollHeight,
        rootClientHeight: document.scrollingElement?.clientHeight,
      };
      expect(rect.top, 'action remains inside the viewport').to.be.at.least(-1);
      expect(rect.bottom, `action remains inside the viewport ${JSON.stringify(scrollMetrics)}`)
        .to.be.at.most(window!.innerHeight + 1);

      if (hasMobileDock) {
        const dock = document.querySelector<HTMLElement>(mobileDockSelector);
        expect(dock, 'mobile dock exists').not.to.equal(null);
        expect(rect.bottom, 'action clears the mobile dock').to.be.at.most(dock!.getBoundingClientRect().top - 8);
      }
    }).then(($action) => {
      const action = $action[0] as HTMLElement;
      const rect = action.getBoundingClientRect();
      const hitTarget = action.ownerDocument.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );

      expect(hitTarget === action || action.contains(hitTarget), 'action center hit-tests to its control').to.eq(true);
    });
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.mockAPI();
    cy.failOnUnexpectedApi401();
    cy.intercept('https://**', { forceNetworkError: true });
  });

  viewports.forEach((viewport) => {
    themes.forEach((theme) => {
      rootTextSizes.forEach((rootTextSize) => {
        (['loading', 'empty', 'error'] as MateListState[]).forEach((state) => {
          it(`renders ${state} at ${viewport.name}, ${theme}, ${rootTextSize}px root text`, () => {
            cy.viewport(viewport.width, viewport.height);
            visitState(state, theme, rootTextSize);
            if (viewport.width < 1024) {
              cy.get(mobileDockSelector).should('be.visible');
            }

            if (state === 'loading') {
              cy.get('[data-testid="mate-results-runtime"][role="status"]', { timeout: 10000 })
                .should('be.visible')
                .and('have.attr', 'aria-label', '메이트 파티 목록 불러오는 중')
                .find('[aria-hidden="true"]')
                .should('have.length', 6);
              assertNoHorizontalOverflow();
              cy.screenshot(`mate-list-${state}-${viewport.name}-${theme}-${rootTextSize}px`, {
                capture: 'viewport',
              });
              cy.get('[data-testid="mate-results-runtime"][role="status"]')
                .scrollIntoView()
                .should(($status) => {
                  const rect = $status[0].getBoundingClientRect();
                  expect(rect.bottom, 'loading state intersects the viewport').to.be.greaterThan(0);
                  expect(rect.top, 'loading state intersects the viewport').to.be.lessThan(viewport.height);
                });
              cy.screenshot(`mate-list-${state}-state-${viewport.name}-${theme}-${rootTextSize}px`, {
                capture: 'viewport',
              });
              return;
            }

            if (state === 'empty') {
              cy.get('[data-testid="mate-empty-state"]', { timeout: 15000 }).should('be.visible');
              cy.contains('아직 개설된 파티가 없습니다').should('be.visible');
              cy.screenshot(`mate-list-${state}-${viewport.name}-${theme}-${rootTextSize}px`, {
                capture: 'viewport',
              });
              assertActionReachableAboveDock(
                '[data-testid="mate-empty-create-cta"]',
                viewport.width < 1024,
              );
            } else {
              cy.get('[data-testid="mate-results-runtime"][role="alert"]', { timeout: 20000 })
                .should('be.visible')
                .and('contain.text', '파티 목록을 불러오지 못했습니다');
              cy.screenshot(`mate-list-${state}-${viewport.name}-${theme}-${rootTextSize}px`, {
                capture: 'viewport',
              });
              assertActionReachableAboveDock('[data-testid="mate-results-retry"]', viewport.width < 1024);
            }

            assertNoHorizontalOverflow();
            cy.screenshot(`mate-list-${state}-action-${viewport.name}-${theme}-${rootTextSize}px`, {
              capture: 'viewport',
            });
          });
        });
      });
    });
  });
});
