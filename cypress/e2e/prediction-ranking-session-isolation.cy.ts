/// <reference types="cypress" />

import {
  installPredictionAuthenticatedSessionIntercept,
  visitPredictionPage,
} from '../support/predictionPage';

describe('Prediction ranking viewer-session isolation', () => {
  it('ignores a delayed viewer A ranking response after switching to viewer B', () => {
    let rankingInitRequestCount = 0;

    cy.visit('about:blank');
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.mockAPI({ skipRankings: true });
    cy.clock(new Date('2026-02-03T12:00:00').getTime(), ['Date', 'setTimeout', 'clearTimeout']);
    installPredictionAuthenticatedSessionIntercept('getRankingIsolationSession');

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

    visitPredictionPage({ path: '/prediction', token: 'ranking-session-isolation-fixture', resetStorage: true });
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
  });
});
