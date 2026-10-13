/// <reference types="cypress" />

const user = {
    id: 8231,
    email: 'visual-route@example.invalid',
    name: 'Visual Route User',
    handle: 'visual-route-user',
    role: 'ROLE_USER',
};

const viewports = [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
];

const blockExternalRequests = () => {
    const base = new URL(String(Cypress.config('baseUrl')));
    expect(base.hostname).to.eq('127.0.0.1');
    cy.intercept({ url: '**', middleware: true }, (request) => {
        if (new URL(request.url).origin !== base.origin) {
            request.reply({ statusCode: 204, log: false });
        }
    });
    cy.intercept({ pathname: /^\/api(?:\/|$)/ }, {
        statusCode: 503,
        body: { code: 'LOCAL_ROUTE_QA_UNMOCKED_REQUEST' },
        log: false,
    });
};

const captureViewportSlices = (name: string) => {
    cy.document().then((doc) => {
        const win = doc.defaultView!;
        doc.documentElement.style.scrollBehavior = 'auto';
        win.scrollTo(0, 0);
    });
    cy.screenshot(`${name}-top`, { capture: 'viewport' });
    cy.window().then((win) => {
        const documentHeight = win.document.documentElement.scrollHeight;
        win.scrollTo(0, documentHeight);
        const maxScroll = Math.max(0, documentHeight - win.innerHeight);
        expect(win.scrollY).to.be.closeTo(maxScroll, 2);
    });
    cy.screenshot(`${name}-bottom`, { capture: 'viewport' });
};

const assertProfileEmptyStateClearsMobileNav = () => {
    cy.get('[data-testid="public-mobile-bottom-nav"]').should('be.visible');
    cy.contains('p', '아직 작성한 게시글이 없습니다.').then(($emptyText) => {
        const doc = $emptyText[0].ownerDocument;
        const emptyCard = $emptyText[0].parentElement;
        const nav = doc.querySelector<HTMLElement>('[data-testid="public-mobile-bottom-nav"]');
        expect(emptyCard).not.to.be.null;
        expect(nav).not.to.be.null;
        doc.documentElement.style.scrollBehavior = 'auto';
        emptyCard!.scrollIntoView({ behavior: 'auto', block: 'center' });
        const cardBounds = emptyCard!.getBoundingClientRect();
        const navBounds = nav!.getBoundingClientRect();
        expect(cardBounds.top).to.be.at.least(0);
        expect(cardBounds.bottom).to.be.at.most(navBounds.top);
    });
};

describe('OAuth callback and legacy profile route acceptance', () => {
    for (const viewport of viewports) {
        for (const theme of ['light', 'dark'] as const) {
            it(`OAuth callback success reaches MyPage at ${viewport.width}px in ${theme}`, () => {
                cy.viewport(viewport.width, viewport.height);
                blockExternalRequests();
                cy.intercept('GET', '**/api/auth/oauth2/state/visual-state', {
                    statusCode: 200,
                    body: user,
                }).as('consumeOAuthState');
                cy.intercept('GET', '**/api/auth/mypage*', {
                    statusCode: 200,
                    body: { success: true, data: user },
                }).as('getMyPage');

                cy.visit('/oauth/callback?state=visual-state', {
                    onBeforeLoad(win) {
                        win.localStorage.setItem('kbo-theme', theme);
                        win.document.documentElement.classList.add(theme);
                    },
                });

                cy.wait('@consumeOAuthState');
                cy.location('pathname', { timeout: 20000 }).should('eq', '/mypage');
                cy.wait('@getMyPage');
                cy.get('[data-testid="mypage-prototype-shell"]', { timeout: 20000 }).should('be.visible');
                cy.contains('Visual Route User').should('be.visible');
                cy.get('[data-testid="oauth-callback-page"]').should('not.exist');
                cy.get('html').should('have.class', theme);
                cy.document().then((doc) => {
                    const win = doc.defaultView!;
                    expect(doc.documentElement.scrollWidth).to.be.at.most(win.innerWidth);
                });
                captureViewportSlices(`oauth-callback-mypage-${viewport.width}-${theme}`);
            });

            it(`legacy handle route reaches public profile at ${viewport.width}px in ${theme}`, () => {
                cy.viewport(viewport.width, viewport.height);
                blockExternalRequests();
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

                cy.visit('/mypage/visual-route-user', {
                    onBeforeLoad(win) {
                        win.localStorage.setItem('kbo-theme', theme);
                        win.document.documentElement.classList.add(theme);
                    },
                });

                cy.location('pathname', { timeout: 20000 }).should('eq', '/profile/@visual-route-user');
                cy.wait('@getPublicProfile');
                cy.wait('@getPublicPosts');
                cy.get('html').should('have.class', theme);
                cy.contains('Visual Route User').should('be.visible');
                cy.get('[data-testid="mypage-season-sidebar"]').should('not.exist');
                cy.document().then((doc) => {
                    const win = doc.defaultView!;
                    expect(doc.documentElement.scrollWidth).to.be.at.most(win.innerWidth);
                });
                if (viewport.width < 768) {
                    assertProfileEmptyStateClearsMobileNav();
                    cy.screenshot(`legacy-profile-${viewport.width}-${theme}-empty-state-clear-of-nav`, {
                        capture: 'viewport',
                    });
                }
                captureViewportSlices(`legacy-profile-${viewport.width}-${theme}`);
            });
        }
    }

    it('missing OAuth state returns a friendly login error on mobile', () => {
        cy.viewport(390, 844);
        blockExternalRequests();
        cy.visit('/oauth/callback');

        cy.location('pathname').should('eq', '/login');
        cy.location('search').should('include', 'error=invalid_oauth2_request');
        cy.contains('OAuth2 인증 요청이 유효하지 않습니다. 다시 시도해주세요.').should('be.visible');
        cy.document().then((doc) => {
            const win = doc.defaultView!;
            expect(doc.documentElement.scrollWidth).to.be.at.most(win.innerWidth);
        });
        captureViewportSlices('oauth-callback-missing-state-mobile');
    });
});

export {};
