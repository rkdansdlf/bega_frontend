/// <reference types="cypress" />

import type { DiaryStatistics } from '../../src/types/diary';

const user = {
  id: 8231,
  email: 'visual-route@example.invalid',
  name: 'Visual Route User',
  handle: 'visual-route-user',
  role: 'ROLE_USER',
};

const viewports = [
  { width: 390, height: 844, name: 'mobile' },
  { width: 1440, height: 900, name: 'desktop' },
] as const;

const themes = ['light', 'dark'] as const;
const emptyScopedStatistics = {
  totalCount: 0,
  totalWins: 0,
  totalLosses: 0,
  totalDraws: 0,
  winRate: 0,
  mostVisitedStadium: null,
  mostVisitedCount: 0,
  monthlyVisitCounts: {},
  homeVisitCount: 0,
  awayVisitCount: 0,
  scheduledCount: 0,
  emojiCounts: {},
  opponentWinRates: {},
};

const emptyDiaryStatistics: DiaryStatistics = {
  totalCount: 0,
  totalWins: 0,
  totalLosses: 0,
  totalDraws: 0,
  winRate: 0,
  monthlyCount: 0,
  yearlyCount: 0,
  yearlyWins: 0,
  yearlyWinRate: 0,
  mostVisitedStadium: null,
  mostVisitedCount: 0,
  monthlyVisitCounts: {},
  stadiumVisitCounts: {},
  homeVisitCount: 0,
  awayVisitCount: 0,
  scheduledCount: 0,
  happiestMonth: null,
  happiestCount: 0,
  firstDiaryDate: null,
  cheerPostCount: 0,
  mateParticipationCount: 0,
  emojiCounts: {},
  scopedStatistics: {
    all: emptyScopedStatistics,
    home: emptyScopedStatistics,
    away: emptyScopedStatistics,
  },
  currentWinStreak: 0,
  longestWinStreak: 0,
  currentLossStreak: 0,
  opponentWinRates: {},
  bestOpponent: '',
  worstOpponent: '',
  dayOfWeekStats: {},
  luckyDay: '',
  earnedBadges: [],
};

const blockExternalAndUnmockedApiRequests = () => {
  const appOrigin = new URL(String(Cypress.config('baseUrl'))).origin;
  expect(new URL(appOrigin).hostname).to.eq('127.0.0.1');

  cy.intercept('**/*', (request) => {
    const requestUrl = new URL(request.url);
    if (requestUrl.origin !== appOrigin) {
      request.reply({ statusCode: 204, body: '' });
      return;
    }

    if (requestUrl.pathname.startsWith('/api/')) {
      request.reply({
        statusCode: 503,
        body: { code: 'LOCAL_VISUAL_QA_UNMOCKED_REQUEST' },
      });
    }
  });
};

const captureViewport = (name: string) => {
  cy.document().then((doc) => {
    const win = doc.defaultView!;
    expect(doc.documentElement.scrollWidth).to.be.at.most(win.innerWidth);
    expect(doc.body.scrollWidth).to.be.at.most(win.innerWidth);
    doc.documentElement.style.scrollBehavior = 'auto';
    win.scrollTo(0, 0);
  });
  cy.screenshot(`oauth-mypage-loaded/${name}-top`, { capture: 'viewport' });
  cy.window().then((win) => {
    const documentHeight = win.document.documentElement.scrollHeight;
    win.scrollTo(0, documentHeight);
    const maxScroll = Math.max(0, documentHeight - win.innerHeight);
    expect(win.scrollY).to.be.closeTo(maxScroll, 2);
  });
  cy.screenshot(`oauth-mypage-loaded/${name}-bottom`, { capture: 'viewport' });
};

describe('OAuth success destination with resolved MyPage data', () => {
  for (const viewport of viewports) {
    for (const theme of themes) {
      it(`renders the loaded MyPage at ${viewport.name} in ${theme}`, () => {
        cy.viewport(viewport.width, viewport.height);
        blockExternalAndUnmockedApiRequests();

        cy.intercept('GET', '**/api/auth/oauth2/state/visual-state', {
          statusCode: 200,
          body: user,
        }).as('consumeOAuthState');
        cy.intercept('GET', '**/api/auth/mypage*', {
          statusCode: 200,
          body: { success: true, data: user },
        }).as('getMyPage');
        cy.intercept('GET', '**/api/diary/entries*', {
          statusCode: 200,
          body: [],
        }).as('getDiaryEntries');
        cy.intercept('GET', '**/api/diary/statistics*', {
          statusCode: 200,
          body: emptyDiaryStatistics,
        }).as('getDiaryStatistics');

        cy.visit('/oauth/callback?state=visual-state', {
          onBeforeLoad(win) {
            win.localStorage.setItem('kbo-theme', theme);
            win.document.documentElement.classList.add(theme);
          },
        });

        cy.wait('@consumeOAuthState');
        cy.location('pathname', { timeout: 20000 }).should('eq', '/mypage');
        cy.wait('@getMyPage');
        cy.wait('@getDiaryEntries');
        cy.wait('@getDiaryStatistics');
        cy.get('[data-testid="navbar-capsule"]', { timeout: 20000 }).should('be.visible');
        if (viewport.name === 'mobile') {
          cy.get('[data-testid="navbar-menu-toggle"]').should('be.visible');
        } else {
          cy.get('[data-testid="navbar-auth-controls"]').should('be.visible');
        }
        cy.get('[data-testid="mypage-season-heatmap"]').should('be.visible');
        cy.contains('시즌 로그를 불러오는 중...').should('not.exist');
        cy.get('[data-testid="mypage-season-sidebar"][aria-busy="true"]').should('not.exist');
        cy.get('html').should('have.class', theme);
        if (viewport.name === 'desktop') {
          cy.get('[data-testid="public-navbar-desktop-profile-name"]').should('be.visible');
        }

        captureViewport(`${viewport.name}-${theme}`);
      });
    }
  }
});

export {};
