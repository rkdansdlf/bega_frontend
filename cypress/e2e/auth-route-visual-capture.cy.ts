/// <reference types="cypress" />

const user = {
  id: 8231,
  email: 'visual-route@example.invalid',
  name: 'Visual Route User',
  handle: 'visual-route-user',
  role: 'ROLE_USER',
};

// Synthetic empty personal-data fixture; this is not baseball data.
const emptyDiaryStatistics = {
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

const viewports = [
  { width: 390, height: 844, name: 'mobile' },
  { width: 1440, height: 900, name: 'desktop' },
] as const;

const themes = ['light', 'dark'] as const;

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

const visitWithTheme = (route: string, theme: (typeof themes)[number]) => {
  cy.visit(route, {
    onBeforeLoad(win) {
      win.localStorage.setItem('kbo-theme', theme);
      win.document.documentElement.classList.add(theme);
    },
  });
  cy.get('html').should('have.class', theme);
};

const captureViewport = (name: string) => {
  cy.document().then((doc) => {
    const win = doc.defaultView!;
    expect(doc.documentElement.scrollWidth).to.be.at.most(win.innerWidth);
    expect(doc.body.scrollWidth).to.be.at.most(win.innerWidth);
    doc.documentElement.style.scrollBehavior = 'auto';
    win.scrollTo(0, 0);
  });
  cy.screenshot(`auth-route-visual/${name}-top`, { capture: 'viewport' });
  cy.window().then((win) => {
    const documentHeight = win.document.documentElement.scrollHeight;
    win.scrollTo(0, documentHeight);
    const maxScroll = Math.max(0, documentHeight - win.innerHeight);
    expect(win.scrollY).to.be.closeTo(maxScroll, 2);
  });
  cy.screenshot(`auth-route-visual/${name}-bottom`, { capture: 'viewport' });
};

describe('OAuth callback and legacy profile route visual evidence', () => {
  for (const viewport of viewports) {
    for (const theme of themes) {
      it(`captures OAuth callback result at ${viewport.name} in ${theme}`, () => {
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
        cy.intercept('GET', '**/api/diary/entries', {
          statusCode: 200,
          body: [],
        }).as('getEmptyDiaryEntries');
        cy.intercept('GET', '**/api/diary/statistics', {
          statusCode: 200,
          body: emptyDiaryStatistics,
        }).as('getEmptyDiaryStatistics');
        cy.intercept('GET', '**/api/users/me/follow-counts', {
          statusCode: 200,
          body: {
            followerCount: 0,
            followingCount: 0,
            isFollowedByMe: false,
            notifyNewPosts: false,
          },
        }).as('getEmptyFollowCounts');

        visitWithTheme('/oauth/callback?state=visual-state', theme);
        cy.wait('@consumeOAuthState');
        cy.location('pathname', { timeout: 20000 }).should('eq', '/mypage');
        cy.wait('@getMyPage');
        cy.wait('@getEmptyDiaryEntries');
        cy.wait('@getEmptyDiaryStatistics');
        cy.wait('@getEmptyFollowCounts');
        cy.get('[data-testid="oauth-callback-page"]').should('not.exist');
        cy.get('[data-testid="mypage-season-sidebar"]').should('be.visible');
        cy.get('[aria-label="시즌 로그 로딩"]').should('not.exist');
        cy.get('[data-testid="mypage-season-heatmap"]').should('be.visible');
        if (viewport.name === 'desktop') {
          cy.get('[data-testid="public-navbar-desktop-profile-name"]').should(($name) => {
            const element = $name[0] as HTMLElement;
            const style = getComputedStyle(element);

            expect(element.textContent).to.eq('Visual Route User 님');
            expect(style.display).to.eq('block');
            expect(style.textOverflow).to.eq('ellipsis');
            expect(style.whiteSpace).to.eq('nowrap');
            expect(element.scrollWidth).to.be.greaterThan(element.clientWidth);
          });
        }
        captureViewport(`oauth-callback-result-${viewport.name}-${theme}`);
      });

      it(`captures legacy profile redirect at ${viewport.name} in ${theme}`, () => {
        cy.viewport(viewport.width, viewport.height);
        blockExternalAndUnmockedApiRequests();
        cy.intercept('GET', /\/api\/users\/profile\/(%40|@)?visual-route-user(?:\?.*)?$/, {
          statusCode: 200,
          body: {
            success: true,
            data: {
              name: 'Visual Route User',
              handle: '@visual-route-user',
              profileImageUrl: null,
              bio: '공개 프로필 QA fixture',
              cheerPoints: 0,
            },
          },
        }).as('getPublicProfile');
        cy.intercept('GET', '**/api/cheer/user/visual-route-user/posts*', {
          statusCode: 200,
          body: { content: [], number: 0, size: 20, totalPages: 0, totalElements: 0, last: true },
        }).as('getPublicPosts');

        visitWithTheme('/mypage/visual-route-user', theme);
        cy.location('pathname', { timeout: 20000 }).should('eq', '/profile/@visual-route-user');
        cy.wait('@getPublicProfile');
        cy.wait('@getPublicPosts');
        cy.contains('Visual Route User').should('be.visible');
        captureViewport(`legacy-profile-redirect-${viewport.name}-${theme}`);
      });
    }
  }
});

export {};
