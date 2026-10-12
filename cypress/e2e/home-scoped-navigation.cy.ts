/// <reference types="cypress" />

import type { Interception } from 'cypress/types/net-stubbing';

import { visitHomePage } from '../support/homePage';

describe('Home scoped navigation', () => {
  beforeEach(() => {
    cy.clock(new Date('2026-10-07T12:00:00').getTime(), ['Date']);
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.intercept('GET', '**/api/home/bootstrap*', (req) => {
      const date = String(req.query.date || '2026-10-07');
      req.reply({
        statusCode: 200,
        body: {
          selectedDate: date,
          leagueStartDates: {
            regularSeasonStart: '2026-03-22',
            postseasonStart: '2026-10-06',
            koreanSeriesStart: '2026-10-26',
          },
          navigation: {
            hasPrev: true,
            hasNext: true,
            prevGameDate: '2026-10-05',
            nextGameDate: '2026-10-08',
          },
          games: [],
          scheduledGamesWindow: [],
          loadState: {
            isFallback: false,
            timedOut: false,
            timedOutSections: [],
            failedSections: [],
          },
        },
      });
    }).as('homeBootstrap');

    cy.intercept('GET', '**/api/home/widgets*', {
      statusCode: 200,
      body: {
        hotCheerPosts: [],
        featuredMates: [],
        rankingSnapshot: {
          rankingSeasonYear: 2026,
          rankingSourceMessage: '테스트 fixture',
          isOffSeason: false,
          rankings: [],
        },
      },
    }).as('homeWidgets');

    cy.intercept('GET', '**/api/home/navigation?*', (req) => {
      const date = String(req.query.date || '');
      const scopedDates: Record<string, { resolvedDate: string; prevGameDate: string; nextGameDate: string }> = {
        '2026-10-07': {
          resolvedDate: '2026-10-07',
          prevGameDate: '2026-10-06',
          nextGameDate: '2026-10-09',
        },
        '2026-10-09': {
          resolvedDate: '2026-10-09',
          prevGameDate: '2026-10-07',
          nextGameDate: '2026-10-11',
        },
      };
      const navigation = scopedDates[date] ?? {
        resolvedDate: date,
        prevGameDate: '2026-10-06',
        nextGameDate: '2026-10-09',
      };

      req.reply({
        statusCode: 200,
        body: { ...navigation, hasPrev: true, hasNext: true },
      });
    }).as('homeScopedNavigation');
  });

  it('uses the active league scope dates for the previous/next controls', () => {
    visitHomePage({
      path: '/home?date=2026-10-07&tab=regular',
      authenticated: false,
      resetStorage: true,
    });

    cy.get('[data-testid="home-date-next"]', { timeout: 15000 }).should('be.enabled');
    cy.contains('button', '포스트시즌').click();
    cy.wait('@homeScopedNavigation');
    cy.get('[data-testid="home-date-next"]').should('be.enabled').click();

    cy.location('search').should('include', 'date=2026-10-09');
    cy.location('search').should('include', 'tab=postseason');
    cy.get('@homeScopedNavigation.all').should((requests: Interception[]) => {
      expect(requests.some(({ request }) => request.query.date === '2026-10-09')).to.eq(true);
    });
    cy.get('[data-testid="home-date-next"]').should('be.enabled');
    cy.get('[data-testid="home-date-next"]').click();

    cy.location('search').should('include', 'date=2026-10-11');
    cy.location('search').should('include', 'tab=postseason');
  });
});
