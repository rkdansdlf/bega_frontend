/// <reference types="cypress" />

export {};

const viewports = [320, 390, 1280] as const;
const themes = ['light', 'dark'] as const;
const states = ['populated', 'empty', 'loading', 'error'] as const;
const title = '합성 알림 제목';
const message = '디자인 검증용 합성 알림입니다. 좁은 화면에서도 본문을 읽을 수 있어야 합니다.';
const notifications = [
    { id: 930001, type: 'POST_LIKE', title, message, relatedId: null, isRead: false, createdAt: '2026-10-21T00:00:00Z' },
    { id: 930002, type: 'APPLICATION_APPROVED', title: '합성 메이트 알림', message, relatedId: null, isRead: true, createdAt: '2026-10-21T00:00:00Z' },
];

const expectReachable = (selector: string) => {
    cy.get(selector).then(($target) => {
        $target[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    }).should(($target) => {
        const target = $target[0];
        const doc = target.ownerDocument;
        const rect = target.getBoundingClientRect();
        const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        expect(rect.width, 'control touch width').to.be.at.least(44);
        expect(rect.height, 'control touch height').to.be.at.least(44);
        expect(rect.left, 'control left').to.be.at.least(0);
        expect(rect.right, 'control right').to.be.at.most(doc.documentElement.clientWidth);
        expect(hit === target || Boolean(hit && target.contains(hit)), 'control pointer hit').to.equal(true);
    });
};

describe('Notification popover synthetic responsive states', () => {
    beforeEach(() => {
        const origin = new URL(String(Cypress.config('baseUrl'))).origin;
        cy.intercept({ url: '**', middleware: true }, (request) => {
            if (new URL(request.url).origin !== origin) request.reply({ statusCode: 204, log: false });
        });
        cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
        cy.login('user');
        cy.mockAPI();
    });

    for (const width of viewports) {
        for (const fontSize of [16, 32] as const) {
            for (const theme of themes) {
                for (const state of states) {
                    it(`${state} at ${width}px / ${fontSize}px in ${theme}`, () => {
                        let releaseResponse!: () => void;
                        const gate = new Cypress.Promise<void>((resolve) => { releaseResponse = resolve; });
                        let recover = false;
                        cy.intercept('GET', '**/api/notifications/my', (request) => {
                            if (state === 'loading') {
                                return gate.then(() => request.reply({ statusCode: 200, body: [] }));
                            }
                            request.reply(state === 'error' && !recover
                                ? { statusCode: 503, body: { code: 'SYNTHETIC_UNAVAILABLE' } }
                                : { statusCode: 200, body: state === 'populated' ? notifications : [] });
                        }).as('notifications');
                        cy.viewport(width, width === 1280 ? 900 : 844);
                        cy.visit('/mypage', {
                            onBeforeLoad(win) {
                                win.localStorage.setItem('kbo-theme', theme);
                                win.document.documentElement.classList.toggle('dark', theme === 'dark');
                                win.document.documentElement.style.fontSize = `${fontSize}px`;
                                win.document.documentElement.style.scrollBehavior = 'auto';
                            },
                        });
                        cy.get('[data-testid="navbar-notification-trigger"]').click();
                        cy.get('[data-testid="notification-panel"]').should('exist');
                        if (state === 'loading') {
                            cy.get('[data-testid="notification-loading"]').should('exist');
                            cy.get('[data-testid="notification-empty"]').should('not.exist');
                        } else {
                            cy.wait('@notifications');
                            const stateTestId = state === 'populated' ? 'notification-item-930001' : `notification-${state}`;
                            // Collect geometry even when the rendered state is outside the visible scrollport.
                            cy.get(`[data-testid="${stateTestId}"]`).should('exist');
                        }
                        cy.document().then((doc) => doc.fonts.ready);

                        const id = `${state}-${width}-${fontSize}-${theme}`;
                        cy.get('[data-testid="navbar-notification-popover"]').then(($panel) => {
                            const panel = $panel[0];
                            const doc = panel.ownerDocument;
                            const win = doc.defaultView!;
                            const bounds = (element: Element) => {
                                const rect = element.getBoundingClientRect();
                                return { left: rect.left, right: rect.right, width: rect.width,
                                    top: rect.top, bottom: rect.bottom,
                                    clientWidth: element.clientWidth, scrollWidth: element.scrollWidth };
                            };
                            cy.writeFile(`${Cypress.config('screenshotsFolder')}/notification-${id}.json`, {
                                viewport: { width: win.innerWidth, height: win.innerHeight },
                                rootFontSize: win.getComputedStyle(doc.documentElement).fontSize,
                                documentWidth: doc.documentElement.scrollWidth,
                                panel: bounds(panel),
                                tabs: Array.from(panel.querySelectorAll('[role="tab"]')).map(bounds),
                                title: Array.from(panel.querySelectorAll('span')).filter((el) => el.textContent === title).map(bounds),
                                message: Array.from(panel.querySelectorAll('span')).filter((el) => el.textContent === message).map(bounds),
                            });
                        });
                        cy.screenshot(`notification-${id}`, { capture: 'viewport' });
                        cy.document().then((doc) => {
                            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                            expect(doc.defaultView!.getComputedStyle(doc.documentElement).fontSize).to.equal(`${fontSize}px`);
                            expect(doc.defaultView!.matchMedia('(min-width: 1024px)').matches).to.equal(width >= 1024);
                            expect(doc.documentElement.scrollWidth, 'document width').to.be.at.most(width);
                            expect(doc.body.scrollWidth, 'body width').to.be.at.most(width);
                        });
                        cy.get('[data-testid="navbar-notification-popover"]').then(($panel) => {
                            const panel = $panel[0];
                            const rect = panel.getBoundingClientRect();
                            expect(rect.left, 'popover left').to.be.at.least(0);
                            expect(rect.right, 'popover right').to.be.at.most(panel.ownerDocument.documentElement.clientWidth);
                            expect(rect.top, 'popover top').to.be.at.least(0);
                            expect(rect.bottom, 'popover bottom').to.be.at.most(panel.ownerDocument.defaultView!.innerHeight);
                            expect(panel.scrollWidth, 'popover internal width').to.be.at.most(panel.clientWidth + 1);
                            const scrollArea = panel.lastElementChild!;
                            expect(scrollArea.clientHeight, 'usable scroll region').to.be.greaterThan(0);
                            if (scrollArea.scrollHeight > scrollArea.clientHeight) {
                                expect(panel.ownerDocument.defaultView!.getComputedStyle(scrollArea).overflowY).to.equal('auto');
                                scrollArea.scrollTop = scrollArea.scrollHeight;
                                expect(scrollArea.scrollTop, 'internal content can scroll').to.be.greaterThan(0);
                                scrollArea.scrollTop = 0;
                            }
                        });
                        cy.get('[data-testid="notification-tabs"] [role="tab"]').each(($tab) => {
                            expect($tab[0].scrollWidth, 'tab copy fits').to.be.at.most($tab[0].clientWidth + 1);
                        });
                        if (state === 'populated') {
                            cy.contains('[data-testid="notification-item-930001"] span', title).should(($title) => {
                                expect($title[0].getBoundingClientRect().width, 'title layout width').to.be.greaterThan(0);
                                expect($title[0].scrollWidth, 'title fits').to.be.at.most($title[0].clientWidth + 1);
                            });
                            cy.get('[data-testid="notification-item-930001"] .line-clamp-3').should(($message) => {
                                const element = $message[0];
                                const rect = element.getBoundingClientRect();
                                const win = element.ownerDocument.defaultView!;
                                const style = win.getComputedStyle(element);
                                expect(element.textContent).to.equal(message);
                                expect(rect.width, 'message layout width').to.be.greaterThan(0);
                                expect(rect.height, 'message has at least one line').to.be.at.least(parseFloat(style.lineHeight));
                                expect(element.scrollWidth, 'message fits horizontally').to.be.at.most(element.clientWidth + 1);
                                // The product intentionally previews at most three lines; require a readable preview, not the full message.
                                expect(rect.height, 'message preview stays within three lines').to.be.at.most(parseFloat(style.lineHeight) * 3 + 1);
                            });
                            expectReachable('[data-testid="notification-tab-mate"]');
                            cy.get('[data-testid="notification-tab-mate"]').click().should('have.attr', 'aria-selected', 'true');
                            cy.get('[data-testid="notification-item-930002"]').should('exist');
                            cy.get('[data-testid="notification-item-930001"]').should('not.exist');
                            cy.get('[data-testid="notification-tab-cheer"]').click().should('have.attr', 'aria-selected', 'true');
                            cy.get('[data-testid="notification-item-930001"]').should('exist');
                            cy.get('[data-testid="notification-item-930002"]').should('not.exist');
                        }
                        if (state === 'error') {
                            expectReachable('[data-testid="notification-retry"]');
                            cy.then(() => { recover = true; });
                            cy.get('[data-testid="notification-retry"]').click();
                            cy.wait('@notifications');
                            cy.get('[data-testid="notification-empty"]').should('be.visible');
                        }
                        if (state === 'loading') {
                            cy.then(() => releaseResponse());
                            cy.wait('@notifications');
                            cy.get('[data-testid="notification-empty"]').should('be.visible');
                        }
                    });
                }
            }
        }
    }
});
