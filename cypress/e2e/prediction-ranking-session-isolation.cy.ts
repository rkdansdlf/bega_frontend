/// <reference types="cypress" />

import {
  installPredictionAuthenticatedSessionIntercept,
  visitPredictionPage,
} from '../support/predictionPage';

describe('Prediction ranking viewer-session isolation', () => {
  it('ignores a delayed viewer A ranking response after switching to viewer B', () => {
    let rankingInitRequestCount = 0;
    const unexpectedExternalRequests: string[] = [];

    cy.visit('about:blank');
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.mockAPI({ skipRankings: true });
    cy.clock(new Date('2026-02-03T12:00:00').getTime(), ['Date', 'setTimeout', 'clearTimeout']);
    installPredictionAuthenticatedSessionIntercept('getRankingIsolationSession');

    cy.intercept(/^https?:\/\/(?!(?:localhost|127\.0\.0\.1)(?::|\/|$))/, (request) => {
      unexpectedExternalRequests.push(request.url);
      request.reply({ statusCode: 599, body: 'Unexpected non-local request blocked by the test' });
    });
    cy.intercept('GET', 'https://cdn.jsdelivr.net/**', {
      statusCode: 200,
      headers: { 'content-type': 'text/css' },
      body: '',
    });
    cy.intercept('GET', '**/prediction*', (request) => {
      request.continue((response) => {
        if (typeof response.body === 'string') {
          response.body = response.body.replace(
            '<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>',
            '',
          );
        }
      });
    });

    cy.intercept('GET', '**/api/predictions/ranking/init*', (request) => {
      rankingInitRequestCount += 1;
      if (rankingInitRequestCount === 1) {
        request.reply({
          statusCode: 200,
          delay: 8000,
          body: {
            seasonYear: 2026,
            saved: {
              id: 20260001,
              shareId: 'stale-viewer-a-fixture',
              seasonYear: 2026,
              teamIdsInOrder: [],
              createdAt: '2026-02-03T12:00:00',
            },
          },
        });
        return;
      }

      request.reply({
        statusCode: 200,
        body: { seasonYear: 2026, saved: null },
      });
    }).as('rankingInitRequests');

    visitPredictionPage({
      path: '/prediction',
      token: 'ranking-session-isolation-fixture',
      resetStorage: true,
      onBeforeLoad: (win) => {
        win.Kakao = {
          isInitialized: () => true,
          init: () => {},
          Share: { sendDefault: () => {} },
        };
      },
    });
    cy.contains('전력분석실', { timeout: 20000 }).should('be.visible');
    cy.contains('button', '순위예측').click({ force: true });
    cy.tick(100);
    cy.wait(200);
    cy.tick(100);
    cy.wrap(null).should(() => {
      expect(rankingInitRequestCount, 'viewer A ranking init request started').to.eq(1);
    });

    cy.window().then(async (win) => {
      const authModule = await win.eval("import('/src/store/authStore.ts')") as {
        useAuthStore: {
          getState: () => {
            login: (
              email: string,
              name: string,
              profileImageUrl?: string | null,
              role?: string,
              favoriteTeam?: string,
              id?: number,
              cheerPoints?: number,
              handle?: string,
              provider?: string,
              hasPassword?: boolean,
            ) => void;
          };
        };
      };
      authModule.useAuthStore.getState().login(
        'viewer-b@example.invalid',
        'Viewer B',
        null,
        'ROLE_USER',
        undefined,
        202,
        0,
        'viewer-b',
        undefined,
        true,
      );
    });

    cy.wrap(null).should(() => {
      expect(rankingInitRequestCount, 'viewer B ranking init request started').to.eq(2);
    });
    cy.get('[data-testid="ranking-reset-btn"]', { timeout: 20000 }).should('be.visible');
    cy.window().then(async (win) => {
      const predictionModule = await win.eval("import('/src/store/predictionStore.ts')") as {
        usePredictionStore: {
          getState: () => {
            viewerId: number | null;
            rankings: Array<unknown | null>;
            isPredictionSaved: boolean;
          };
        };
      };
      const viewerBState = predictionModule.usePredictionStore.getState();
      expect(viewerBState.viewerId).to.eq(202);
      expect(viewerBState.rankings.every((team) => team === null)).to.eq(true);
      expect(viewerBState.isPredictionSaved).to.eq(false);
    });

    cy.wait('@rankingInitRequests');
    cy.window().then(async (win) => {
      const predictionModule = await win.eval("import('/src/store/predictionStore.ts')") as {
        usePredictionStore: {
          getState: () => {
            viewerId: number | null;
            rankings: Array<unknown | null>;
            isPredictionSaved: boolean;
          };
        };
      };
      const viewerBState = predictionModule.usePredictionStore.getState();
      expect(viewerBState.viewerId).to.eq(202);
      expect(viewerBState.rankings.every((team) => team === null)).to.eq(true);
      expect(viewerBState.isPredictionSaved).to.eq(false);
    });
    cy.get('[data-testid="ranking-saved-badge"]').should('not.exist');
    cy.screenshot('bug258-viewer-b-after-stale-response', { capture: 'viewport' });
    cy.wrap(null).should(() => {
      expect(unexpectedExternalRequests, 'unexpected non-local requests').to.deep.eq([]);
    });
  });
});
