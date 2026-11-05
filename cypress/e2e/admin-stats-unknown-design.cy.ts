/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

describe('Admin unknown, genuine zero and cached statistics design', () => {
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width}px / ${font}px / ${theme}`, () => {
            const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const viewer = { id: 950096, email: 'shell-design@example.invalid', name: '합성 관리자', handle: 'design_shell_admin',
                role: 'ROLE_ADMIN', favoriteTeam: null, profileImageUrl: null, hasPassword: true };
            const mutations: string[] = [], unexpectedReads: string[] = [], findings: string[] = [];
            const observations: Array<Record<string, unknown>> = [], statuses: number[] = [];
            let foreignBlocked = 0, usersReplies = 0, finished = false;
            let phase: 'initial-error' | 'zero' | 'populated' | 'cached-error' = 'initial-error', release!: () => void;
            const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
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
            cy.intercept('GET', `${origin}/api/admin/stats`, (req) => {
                expect(new URL(req.url).search).to.equal(''); const current = phase; req.alias = `stats-${current}`;
                const reply = () => {
                    const status = current.endsWith('error') ? 503 : 200; statuses.push(status);
                    req.reply({ statusCode: status, body: status === 503 ? {} : { success: true, data: current === 'zero'
                        ? { totalUsers: 0, totalPosts: 0, totalMates: 0 } : { totalUsers: 123456, totalPosts: 0, totalMates: 67 } } });
                };
                return current === 'initial-error' ? gate.then(reply) : reply();
            });
            cy.intercept('GET', `${origin}/api/admin/users*`, (req) => {
                const url = new URL(req.url); expect(url.pathname).to.equal('/api/admin/users');
                expect(Array.from(url.searchParams.entries()).every(([key, value]) => key === 'search' && value === '')).to.equal(true);
                usersReplies++; req.alias = 'stats-users'; req.reply({ statusCode: 200, body: { success: true, data: [] } });
            });
            cy.intercept('GET', `${origin}/api/dm/rooms/my`, { statusCode: 200, body: { success: true, data: [] } });
            cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { statusCode: 200, body: { success: true, data: 0 } });
            cy.intercept('GET', `${origin}/api/notifications/my*`, (req) => {
                const url = new URL(req.url); expect(url.pathname).to.equal('/api/notifications/my'); expect(url.search).to.equal('');
                req.reply({ statusCode: 200, body: [] });
            });
            cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { statusCode: 200, body: 0 });
            cy.viewport(width, width === 1280 ? 900 : 844);
            const visit = () => cy.visit('/admin', { onBeforeLoad(win) {
                win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            const measure = (state: string, values: string[], status?: string) => {
                for (const [index, name] of ['users', 'posts', 'mates'].entries()) {
                    const card = `[data-testid="admin-stat-${name}"]`;
                    cy.get(`${card} [data-testid="admin-stat-value"]`).should('have.text', values[index]);
                    if (status) cy.get(`${card} [data-testid="admin-stat-state"]`).should('have.text', status);
                    else cy.get(`${card} [data-testid="admin-stat-state"]`).should('not.exist');
                    cy.get(card).then(($el) => {
                        const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                        el.scrollIntoView({ block: 'center', behavior: 'instant' });
                        const header = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
                        win.scrollBy({ top: el.getBoundingClientRect().top - Math.max(header?.bottom ?? 0, 80) - 16, behavior: 'instant' });
                        expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                        expect(win.localStorage.getItem('kbo-theme')).to.equal(theme);
                        expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                        const texts = Array.from(el.querySelectorAll<HTMLElement>('[data-testid="admin-stat-value"], [data-testid="admin-stat-state"]'));
                        const cells = texts.map((text) => {
                            const r = text.getBoundingClientRect(), outer = el.getBoundingClientRect();
                            const range = doc.createRange(); range.selectNodeContents(text);
                            const fits = Array.from(range.getClientRects()).every((rect) => rect.left >= r.left - 1 && rect.right <= r.right + 1
                                && rect.top >= r.top - 1 && rect.bottom <= r.bottom + 1 && rect.left >= outer.left && rect.right <= outer.right);
                            const visible = Cypress.dom.isVisible(text);
                            if (!fits || !visible) findings.push(`${state}-${name}: count/status clipped`);
                            return { text: text.textContent, fits, visible, width: r.width, height: r.height };
                        });
                        observations.push({ state, name, cells });
                    });
                    cy.screenshot(`stats-${id}-${state}-${name}`, { capture: 'viewport', disableTimersAndAnimations: false });
                }
            };
            visit(); cy.wait('@stats-users'); cy.document().then((doc) => doc.fonts.ready);
            measure('loading', ['—', '—', '—'], '통계 로딩 중');
            cy.then(() => release()); cy.wait('@stats-initial-error').its('response.statusCode').should('equal', 503);
            cy.get('[data-testid="admin-error-message"]').should('contain.text', '통계를 불러오는데 실패했습니다.');
            measure('initial-error', ['—', '—', '—'], '통계 조회 실패');
            cy.then(() => { phase = 'zero'; }); visit(); cy.wait(['@stats-zero', '@stats-users']);
            cy.get('[data-testid="admin-error-message"]').should('not.exist'); measure('zero', ['0', '0', '0']);
            cy.then(() => { phase = 'populated'; }); visit(); cy.wait(['@stats-populated', '@stats-users']);
            measure('populated', ['123,456', '0', '67']);
            // Preserve the real QueryClient across SPA unmount/remount. Advance Date only past the unchanged 30s staleTime.
            cy.window().then((win) => cy.clock(win.Date.now(), ['Date'])); cy.tick(31001);
            cy.window().then((win) => {
                win.history.pushState({}, '', '/admin-stats-cache-probe'); win.dispatchEvent(new win.PopStateEvent('popstate'));
            });
            cy.get('[data-testid="admin-page-data-runtime"]').should('not.exist');
            cy.then(() => { phase = 'cached-error'; });
            cy.window().then((win) => { win.history.pushState({}, '', '/admin'); win.dispatchEvent(new win.PopStateEvent('popstate')); });
            cy.wait(['@stats-cached-error', '@stats-users']);
            cy.get('[data-testid="admin-error-message"]').should('contain.text', '통계를 불러오는데 실패했습니다.');
            measure('cached-error', ['123,456', '0', '67']);
            cy.then(() => {
                expect(statuses).to.deep.equal([503, 200, 200, 503]); expect(usersReplies).to.equal(4);
                expect(mutations).to.deep.equal([]); expect(unexpectedReads).to.deep.equal([]);
                expect(observations).to.have.length(15); finished = true;
            });
            cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/stats-${id}.json`, {
                width, font, requestedTheme: theme, statuses, usersReplies, foreignBlocked, mutations, unexpectedReads, observations, findings, finished,
            }));
            cy.then(() => expect(findings).to.deep.equal([]));
        });
    }
});
