/// <reference types="cypress" />

type Theme = 'light' | 'dark';

const shareId = '00000000-0000-4000-8000-000000000001';
const seasonYear = '2026';
const sharePath = `/predictions/ranking/share/${shareId}/${seasonYear}`;

const viewports = [
    { id: 'mobile', width: 390, height: 844 },
    { id: 'desktop', width: 1400, height: 900 },
] as const;

const themes: Theme[] = ['light', 'dark'];

const failureCases = [
    {
        id: 'not-found',
        response: {
            statusCode: 404,
            body: {
                success: false,
                code: 'RANKING_PREDICTION_SHARE_NOT_FOUND',
                message: '공유된 시즌 순위 예측을 찾을 수 없습니다.',
            },
        },
        toast: '공유된 시즌 순위 예측을 찾을 수 없습니다.',
    },
    {
        id: 'service-unavailable',
        response: {
            statusCode: 503,
            body: {
                success: false,
                code: 'SYNTHETIC_TEMPORARY_FAILURE',
                message: 'Synthetic upstream unavailable',
            },
        },
        toast: '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.',
    },
] as const;

const stubApiBoundary = () => {
    cy.intercept('**/api/**', {
        statusCode: 503,
        body: { success: false, code: 'SYNTHETIC_UNSTUBBED_API' },
    });
    cy.intercept('**/auth/**', {
        statusCode: 401,
        body: { success: false, code: 'UNAUTHORIZED' },
    });
    cy.intercept('https://**', { forceNetworkError: true });
    cy.intercept('GET', '**/api/chat/my/unread-counts', {
        statusCode: 200,
        body: { success: true, data: 0 },
    });
    cy.intercept('GET', '**/api/dm/rooms/my', {
        statusCode: 200,
        body: { success: true, data: [] },
    });
    cy.intercept('GET', '**/api/notifications/my/unread-count', {
        statusCode: 200,
        body: 0,
    });
    cy.intercept('GET', '**/api/notifications/my', {
        statusCode: 200,
        body: [],
    });
};

const seedTheme = (win: Window, theme: Theme) => {
    win.localStorage.setItem('kbo-theme', theme);
    win.localStorage.removeItem('bega-theme');
    win.localStorage.removeItem('theme');
    win.document.documentElement.classList.toggle('dark', theme === 'dark');
};

const assertNoHorizontalOverflow = (width: number) => {
    cy.document().should((document) => {
        expect(Math.max(document.documentElement.scrollWidth, document.body.scrollWidth))
            .to.be.at.most(width);
    });
};

describe('Shared ranking prediction responsive error-state QA', () => {
    for (const failure of failureCases) {
        for (const viewport of viewports) {
            for (const theme of themes) {
                it(`shows ${failure.id} at ${viewport.id} in ${theme} theme`, () => {
                    cy.viewport(viewport.width, viewport.height);
                    stubApiBoundary();
                    cy.intercept({
                        method: 'GET',
                        pathname: `/api/predictions/ranking/share/${shareId}/${seasonYear}`,
                    }, failure.response).as('sharedPrediction');

                    cy.visit(sharePath, {
                        onBeforeLoad(win) {
                            win.localStorage.clear();
                            win.sessionStorage.clear();
                            seedTheme(win, theme);
                        },
                    });

                    cy.wait('@sharedPrediction');
                    cy.window().should((win) => {
                        expect(win.innerWidth).to.equal(viewport.width);
                        expect(win.innerHeight).to.equal(viewport.height);
                    });
                    cy.get('html').should(($html) => {
                        expect($html.hasClass('dark')).to.equal(theme === 'dark');
                    });
                    cy.get('h1').should('contain.text', `${seasonYear} KBO 시즌 순위 예측`);
                    cy.get('[data-testid="ranking-share-error"][role="alert"]')
                        .should('be.visible')
                        .and('contain.text', failure.toast);
                    cy.get('[data-testid^="ranking-row-"]').should('not.exist');
                    cy.contains('a', '나도 예측하기')
                        .should('be.visible')
                        .and('have.attr', 'href', '/prediction');
                    assertNoHorizontalOverflow(viewport.width);
                    cy.screenshot(
                        `ranking-share-${failure.id}-${viewport.id}-${theme}`,
                        { capture: 'viewport' },
                    );
                });
            }
        }
  }
});

export {};
