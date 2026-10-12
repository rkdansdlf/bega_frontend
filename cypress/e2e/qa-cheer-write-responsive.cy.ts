/// <reference types="cypress" />

import { DEFAULT_CYPRESS_AUTH_TOKEN, seedCypressAuthState } from '../support/auth';

type Theme = 'light' | 'dark';

const viewports = [
    { id: 'mobile', width: 390, height: 844 },
    { id: 'desktop', width: 1400, height: 900 },
] as const;

const themes: Theme[] = ['light', 'dark'];

const syntheticProfile = {
    id: 920001,
    email: 'cheer-design-qa@example.test',
    name: 'Design QA',
    handle: 'cheer-design-qa',
    favoriteTeam: null,
    role: 'ROLE_USER',
    hasPassword: true,
    profileImageUrl: null,
};

const emptyPage = {
    content: [],
    last: true,
    totalPages: 0,
    totalElements: 0,
    size: 20,
    number: 0,
};

const stubApiBoundary = (authenticated: boolean) => {
    cy.intercept('**/api/**', {
        statusCode: 503,
        body: { success: false, code: 'SYNTHETIC_UNSTUBBED_API' },
    });
    cy.intercept('**/auth/**', {
        statusCode: 401,
        body: { success: false, code: 'UNAUTHORIZED' },
    });
    cy.intercept('https://**', { forceNetworkError: true });

    cy.intercept('GET', '**/auth/mypage*', authenticated
        ? { statusCode: 200, body: { success: true, data: syntheticProfile } }
        : { statusCode: 401, body: { success: false, code: 'UNAUTHORIZED' } }).as('authProfile');
    cy.intercept('GET', '**/api/cheer/posts*', {
        statusCode: 200,
        body: emptyPage,
    }).as('cheerPosts');
    cy.intercept('GET', '**/api/cheer/posts/hot*', {
        statusCode: 200,
        body: emptyPage,
    }).as('cheerHotPosts');
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

describe('Cheer write route responsive visual QA', () => {
    for (const viewport of viewports) {
        for (const theme of themes) {
            it(`shows the authenticated composer at ${viewport.id} in ${theme} theme`, () => {
                cy.viewport(viewport.width, viewport.height);
                stubApiBoundary(true);

                cy.visit('/cheer/write', {
                    onBeforeLoad(win) {
                        win.localStorage.clear();
                        win.sessionStorage.clear();
                        seedCypressAuthState(
                            win,
                            syntheticProfile,
                            DEFAULT_CYPRESS_AUTH_TOKEN,
                            { theme },
                        );
                        seedTheme(win, theme);
                    },
                });

                cy.get('[data-testid="cheer-write-modal"]', { timeout: 20000 })
                    .should('be.visible');
                cy.window().should((win) => {
                    expect(win.innerWidth).to.equal(viewport.width);
                    expect(win.innerHeight).to.equal(viewport.height);
                });
                cy.get('html').should(($html) => {
                    expect($html.hasClass('dark')).to.equal(theme === 'dark');
                });
                cy.get('[data-testid="cheer-write-modal"]')
                    .should('contain.text', '새 응원글 작성')
                    .then(($dialog) => {
                        const rect = $dialog[0].getBoundingClientRect();
                        expect(rect.left).to.be.at.least(0);
                        expect(rect.right).to.be.at.most(viewport.width + 1);
                        expect(rect.top).to.be.at.least(0);
                        expect(rect.bottom).to.be.at.most(viewport.height + 1);
                    });
                cy.get('[data-testid="cheer-write-share-mode"]').should('be.visible');
                cy.get('[data-testid="cheer-write-content"]').should('be.visible');
                cy.get('[data-testid="cheer-write-attach"]').should('be.visible');
                cy.get('[data-testid="cheer-write-emoji"]').should('be.visible');
                cy.get('[data-testid="cheer-write-submit"]')
                    .scrollIntoView()
                    .should('be.visible')
                    .and('be.disabled');
                cy.get('[data-testid="cheer-write-modal"] button[aria-label="닫기"]')
                    .should('be.visible')
                    .then(($button) => {
                        const rect = $button[0].getBoundingClientRect();
                        expect(rect.width).to.be.at.least(44);
                        expect(rect.height).to.be.at.least(44);
                    });
                assertNoHorizontalOverflow(viewport.width);
                cy.screenshot(`cheer-write-${viewport.id}-${theme}`, { capture: 'viewport' });
            });
        }

        it(`redirects a guest from the write route to login at ${viewport.id}`, () => {
            cy.viewport(viewport.width, viewport.height);
            stubApiBoundary(false);

            cy.visit('/cheer/write', {
                onBeforeLoad(win) {
                    win.localStorage.clear();
                    win.sessionStorage.clear();
                    seedTheme(win, 'light');
                },
            });

            cy.location('pathname').should('eq', '/login');
            cy.location('search').should('eq', '?redirect=%2Fcheer%2Fwrite');
            assertNoHorizontalOverflow(viewport.width);
        });
    }
});
