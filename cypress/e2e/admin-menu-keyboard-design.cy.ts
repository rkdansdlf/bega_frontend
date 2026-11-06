/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

// Native forward Tab only. Never activate a menu or management action.
describe('Admin menu synthetic role and forward-Tab visibility', () => {
    for (const role of ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] as const) {
        for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
            it(`${role} / ${width}px / ${font}px / ${theme}`, () => {
                const id = `${role}-${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
                expect(new URL(origin).hostname).to.equal('127.0.0.1');
                const viewer = { id: 950095, email: 'menu-design@example.invalid', name: '합성 관리자', handle: 'design_menu_admin',
                    role, favoriteTeam: null, profileImageUrl: null, hasPassword: true };
                const names = ['users', 'posts', 'parties', 'reports', 'game-status', 'client-errors', 'seat-views', 'offseason', 'stadiums', 'ai'];
                const mutations: string[] = [], unexpectedReads: string[] = [], findings: string[] = [];
                const observations: Array<Record<string, unknown>> = [];
                let foreignBlocked = 0, usersReplies = 0, finished = false;
                const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/menu-${id}.json`, {
                    role, width, font, requestedTheme: theme, foreignBlocked, usersReplies, mutations, unexpectedReads, observations, findings, finished,
                });
                cy.intercept({ url: '**', middleware: true }, (req) => {
                    const url = new URL(req.url);
                    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                        mutations.push(`${req.method} ${url.pathname}`); return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                    }
                    if (url.origin !== origin) {
                        foreignBlocked++;
                        if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) unexpectedReads.push(url.pathname);
                        return req.reply({ forceNetworkError: true, log: false });
                    }
                    if (url.pathname !== '/admin' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                        && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
                });
                cy.intercept('**/api/**', (req) => { unexpectedReads.push(new URL(req.url).pathname); req.reply({ statusCode: 503, body: {} }); });
                cy.intercept('**/auth/**', (req) => { unexpectedReads.push(new URL(req.url).pathname); req.reply({ statusCode: 401, body: {} }); });
                cy.intercept('GET', `${origin}/api/auth/mypage`, { statusCode: 200, body: { success: true, data: toAuthApiUser(viewer) } });
                cy.intercept('GET', `${origin}/api/admin/stats`, { statusCode: 200, body: { success: true, data: { totalUsers: 0, totalPosts: 0, totalMates: 0 } } });
                cy.intercept('GET', `${origin}/api/admin/users*`, (req) => {
                    const url = new URL(req.url); expect(url.pathname).to.equal('/api/admin/users');
                    expect(Array.from(url.searchParams.entries()).every(([key, value]) => key === 'search' && value === '')).to.equal(true);
                    usersReplies++; req.alias = 'menu-users'; req.reply({ statusCode: 200, body: { success: true, data: [] } });
                });
                cy.intercept('GET', `${origin}/api/dm/rooms/my`, { statusCode: 200, body: { success: true, data: [] } });
                cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { statusCode: 200, body: { success: true, data: 0 } });
                cy.intercept('GET', `${origin}/api/notifications/my*`, (req) => {
                    const url = new URL(req.url); expect(url.pathname).to.equal('/api/notifications/my'); expect(url.search).to.equal('');
                    req.reply({ statusCode: 200, body: [] });
                });
                cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { statusCode: 200, body: 0 });
                cy.viewport(width, width === 1280 ? 900 : 844);
                cy.visit('/admin', { onBeforeLoad(win) {
                    win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
                    win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
                } });
                cy.wait('@menu-users').its('response.statusCode').should('equal', 200);
                cy.get('[data-testid="admin-users-empty"]').should('exist');
                cy.get('[role="tablist"][aria-label="관리자 메뉴"] [role="tab"]').should('have.length', 10);
                cy.document().then((doc) => doc.fonts.ready);
                // Deliberately scoped starting point, not a body-to-menu Tab claim.
                cy.get('[data-testid="admin-tab-users"]').focus();
                const record = (name: string, step: number) => {
                    cy.document().then((doc) => {
                        const el = doc.querySelector<HTMLElement>(`[data-testid="admin-tab-${name}"]`)!;
                        const win = doc.defaultView!, r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                        expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                        expect(win.localStorage.getItem('kbo-theme')).to.equal(theme);
                        expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                        const active = doc.activeElement === el;
                        // Mid-edge samples avoid the legitimate rounded-corner hit exclusion.
                        const samples = [[cx, cy], [cx, r.top + 2], [cx, r.bottom - 2]].map(([x, y]) => {
                            const hit = doc.elementFromPoint(x, y);
                            return { x, y, uncovered: Boolean(hit && (hit === el || el.contains(hit))), hit: hit?.getAttribute('data-testid') ?? hit?.tagName ?? null };
                        });
                        const rendered = Cypress.dom.isVisible(el) && r.width > 0 && r.height > 0;
                        observations.push({ step, name, active, rendered, width: r.width, height: r.height, top: r.top, bottom: r.bottom,
                            viewportHeight: win.innerHeight, focusVisible: el.matches(':focus-visible'), samples });
                        if (!active) findings.push(`${name}: forward Tab order mismatch`);
                        if (!rendered || samples.some((point) => !point.uncovered)) findings.push(`${name}: focus target partly outside viewport or covered`);
                        if (r.width < 43.99 || r.height < 43.99) findings.push(`${name}: below44px`);
                    }); cy.then(persist);
                };
                record('users', 0); cy.screenshot(`menu-${id}-start`, { capture: 'viewport' });
                for (const [index, name] of names.slice(1).entries()) {
                    cy.press(Cypress.Keyboard.Keys.TAB);
                    // No corrective scrolling between native Tab and measurements/capture.
                    record(name, index + 1);
                    if (name === 'client-errors' || name === 'ai') cy.screenshot(`menu-${id}-${name}`, { capture: 'viewport' });
                }
                cy.get('[data-testid="admin-tab-users"]').should('have.attr', 'aria-selected', 'true');
                cy.get('[role="tab"][aria-selected="true"]').should('have.length', 1);
                cy.location('pathname').should('equal', '/admin');
                cy.then(() => {
                    expect(mutations).to.deep.equal([]); expect(unexpectedReads).to.deep.equal([]); expect(usersReplies).to.equal(1);
                    expect(observations).to.have.length(10); finished = true;
                }); cy.then(persist);
                cy.then(() => expect(findings, 'Admin menu forward-Tab design findings').to.deep.equal([]));
            });
        }
    }
});
