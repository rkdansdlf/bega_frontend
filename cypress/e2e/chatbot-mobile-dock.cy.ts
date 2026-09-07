/// <reference types="cypress" />

export {};

const today = '2026-06-14';

const mockGuestAuth = () => {
  cy.intercept('GET', '**/api/auth/mypage*', {
    statusCode: 401,
    body: {
      success: false,
      code: 'UNAUTHORIZED',
      message: '인증이 필요합니다.',
    },
  });
  cy.intercept('GET', '**/api/auth/reissue*', { statusCode: 401 });
};

const mockHome = () => {
  cy.intercept('GET', '**/api/home/bootstrap*', {
    statusCode: 200,
    body: {
      selectedDate: today,
      leagueStartDates: {
        regularSeasonStart: '2026-03-22',
        postseasonStart: '2026-10-06',
        koreanSeriesStart: '2026-10-26',
      },
      navigation: {
        hasPrev: true,
        hasNext: true,
        prevGameDate: '2026-06-13',
        nextGameDate: '2026-06-15',
      },
      games: [],
      scheduledGamesWindow: [],
    },
  }).as('getHomeBootstrap');
  cy.intercept('GET', '**/api/home/widgets*', {
    statusCode: 200,
    body: {
      hotCheerPosts: [],
      featuredMates: [],
      rankingSnapshot: {
        rankingSeasonYear: 2026,
        rankingSourceMessage: '2026 시즌 순위 데이터',
        isOffSeason: false,
        rankings: [],
      },
    },
  });
};

const visitHomeAsGuest = () => {
  cy.visit('/home', {
    onBeforeLoad(win) {
      win.localStorage.clear();
      win.sessionStorage.clear();
      win.localStorage.setItem('bega_has_visited', 'true');
      win.localStorage.setItem('bega_dont_show_guide', 'true');
    },
  });
};

describe('chatbot mobile dock', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    mockGuestAuth();
    mockHome();
  });

  [320, 390].forEach((width) => {
    it(`uses a dock tab instead of a floating overlay at ${width}px`, () => {
      cy.viewport(width, 844);
      visitHomeAsGuest();

      cy.get('[data-testid="public-mobile-chatbot-tab"]', { timeout: 10000 })
        .should('be.visible')
        .then(($button) => {
          const rect = $button[0].getBoundingClientRect();
          expect(rect.width, `${width}px chatbot tab width`).to.be.at.least(44);
          expect(rect.height, `${width}px chatbot tab height`).to.be.at.least(44);
          expect(rect.right, `${width}px chatbot tab right edge`).to.be.at.most(width);
      });
      cy.get('[data-testid="chatbot-request-launcher"]').should('not.be.visible');
      cy.get('[data-testid="public-mobile-chatbot-tab"]').click();
      cy.get('[data-testid="chatbot-panel"]', { timeout: 10000 }).should('be.visible');

      cy.wait('@getHomeBootstrap');
      cy.get('[data-testid="home-mobile-bottom-spacer"]')
        .should('be.visible')
        .then(($spacer) => {
          expect($spacer[0].getBoundingClientRect().height, `${width}px safe spacer height`)
            .to.be.at.least(96);
        });
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth, `${width}px document width`)
          .to.be.at.most(doc.documentElement.clientWidth);
      });
    });
  });

  it('keeps the chatbot dock entry on the trailing-slash home route', () => {
    cy.viewport(390, 844);
    cy.visit('/home/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.sessionStorage.clear();
        win.localStorage.setItem('bega_has_visited', 'true');
        win.localStorage.setItem('bega_dont_show_guide', 'true');
      },
    });

    cy.get('[data-testid="public-mobile-chatbot-tab"]', { timeout: 10000 }).should('be.visible');
  });
});
