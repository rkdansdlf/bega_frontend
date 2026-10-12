/// <reference types="cypress" />

const viewports = [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
];

const pages = [
    { route: '/login', name: 'login', selector: '[data-testid="login-form"]', uniqueSelectors: [] },
    {
        route: '/signup',
        name: 'signup',
        selector: '[data-testid="signup-header"]',
        uniqueSelectors: ['[data-testid="signup-name"]', '[data-testid="signup-handle"]'],
    },
    {
        route: '/password/reset',
        name: 'password-reset',
        selector: '[data-testid="password-reset-form"]',
        uniqueSelectors: [],
    },
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
        body: { code: 'LOCAL_VISUAL_QA_UNMOCKED_REQUEST' },
        log: false,
    });
};

describe('authentication page visual evidence', () => {
    for (const page of pages) {
        for (const viewport of viewports) {
            for (const theme of ['light', 'dark'] as const) {
                it(`captures ${page.name} at ${viewport.width}x${viewport.height} in ${theme}`, () => {
                    cy.viewport(viewport.width, viewport.height);
                    blockExternalRequests();

                    cy.visit(page.route, {
                        onBeforeLoad(win) {
                            win.localStorage.setItem('kbo-theme', theme);
                            win.document.documentElement.classList.add(theme);
                        },
                    });

                    cy.get(page.selector).should('be.visible');
                    for (const uniqueSelector of page.uniqueSelectors ?? []) {
                        cy.get(uniqueSelector).should('have.length', 1);
                    }
                    cy.get('html').should('have.class', theme);
                    cy.document().then((doc) => {
                        const win = doc.defaultView!;
                        expect(doc.documentElement.scrollWidth).to.be.at.most(win.innerWidth);
                    });

                    cy.screenshot(`auth-pages/${page.name}-${viewport.width}x${viewport.height}-${theme}-top`, {
                        capture: 'viewport',
                    });
                    cy.window().then((win) => {
                        win.document.documentElement.style.scrollBehavior = 'auto';
                        win.scrollTo(0, win.document.documentElement.scrollHeight);
                        const maxScroll = Math.max(
                            0,
                            win.document.documentElement.scrollHeight - win.innerHeight,
                        );
                        if (maxScroll > 0) {
                            expect(win.scrollY).to.be.closeTo(maxScroll, 2);
                        }
                    });
                    cy.screenshot(`auth-pages/${page.name}-${viewport.width}x${viewport.height}-${theme}-bottom`, {
                        capture: 'viewport',
                    });
                });
            }
        }
    }
});

export {};
