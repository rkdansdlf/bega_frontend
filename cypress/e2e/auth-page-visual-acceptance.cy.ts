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

const inspectRenderedText = (element: Element, win: Window) => {
    const lineTops = new Set<number>();
    const walker = win.document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const range = win.document.createRange();
    let left = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let node = walker.nextNode();

    while (node) {
        const text = node.textContent ?? '';
        for (let offset = 0; offset < text.length; offset += 1) {
            if (/\s/u.test(text[offset])) {
                continue;
            }

            range.setStart(node, offset);
            range.setEnd(node, offset + 1);
            const rect = range.getBoundingClientRect();
            if (rect.height > 0) {
                lineTops.add(Math.round(rect.top));
                left = Math.min(left, rect.left);
                right = Math.max(right, rect.right);
            }
        }
        node = walker.nextNode();
    }

    return { lineCount: lineTops.size, left, right };
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

    for (const page of pages) {
        for (const viewport of [
            { width: 320, height: 844 },
            { width: 390, height: 844 },
        ]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`captures ${page.name} at ${viewport.width}x${viewport.height} in ${theme} with 32px root text`, () => {
                    cy.viewport(viewport.width, viewport.height);
                    blockExternalRequests();

                    cy.visit(page.route, {
                        onBeforeLoad(win) {
                            win.localStorage.setItem('kbo-theme', theme);
                            win.document.documentElement.classList.add(theme);
                        },
                    });

                    cy.document().then((doc) => {
                        const win = doc.defaultView!;
                        doc.documentElement.style.fontSize = '32px';
                        expect(win.getComputedStyle(doc.documentElement).fontSize).to.eq('32px');
                    });

                    cy.get(page.selector).should('be.visible');
                    for (const uniqueSelector of page.uniqueSelectors ?? []) {
                        cy.get(uniqueSelector).should('have.length', 1);
                    }
                    cy.get('html').should('have.class', theme);
                    cy.document().then((doc) => {
                        const win = doc.defaultView!;
                        expect(doc.documentElement.scrollWidth).to.be.at.most(win.innerWidth);
                        expect(doc.body.scrollWidth).to.be.at.most(win.innerWidth);

                        if (viewport.width === 320) {
                            const textControls = page.name === 'login'
                                ? [
                                    { selector: '[data-testid="login-social-google-label"]', maximumLines: 2 },
                                    { selector: '[data-testid="login-social-naver-label"]', maximumLines: 2 },
                                    { selector: '[data-testid="login-social-kakao-label"]', maximumLines: 2 },
                                ]
                                : page.name === 'signup'
                                    ? [{ selector: '[data-testid="signup-submit"]', maximumLines: 1 }]
                                    : [];

                            textControls.forEach(({ selector, maximumLines }) => {
                                const element = doc.querySelector(selector);
                                expect(element, `${page.name} text control ${selector}`).not.to.be.null;
                                const textBounds = inspectRenderedText(element!, win);
                                expect(textBounds.lineCount, `${selector} rendered text lines`).to.be.at.most(maximumLines);
                                const button = page.name === 'signup' ? element! : element!.parentElement!;
                                const buttonBounds = button.getBoundingClientRect();
                                expect(textBounds.left, `${selector} text left edge`).to.be.at.least(buttonBounds.left);
                                expect(textBounds.right, `${selector} text right edge`).to.be.at.most(buttonBounds.right);
                            });
                        }

                        const visibleControls = Array.from(
                            doc.querySelectorAll('input, button, select, textarea, a[href], [role="button"]'),
                        ).filter((element) => {
                            const style = win.getComputedStyle(element);
                            const rect = element.getBoundingClientRect();
                            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0;
                        });

                        visibleControls.forEach((element) => {
                            const rect = element.getBoundingClientRect();
                            expect(rect.left, `${element.tagName} left edge`).to.be.at.least(-1);
                            expect(rect.right, `${element.tagName} right edge`).to.be.at.most(win.innerWidth + 1);
                        });
                    });

                    cy.screenshot(`auth-pages/${page.name}-${viewport.width}x${viewport.height}-${theme}-32px-top`, {
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
                    cy.screenshot(`auth-pages/${page.name}-${viewport.width}x${viewport.height}-${theme}-32px-bottom`, {
                        capture: 'viewport',
                    });
                });
            }
        }
    }
});

export {};
