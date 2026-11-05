/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

// Fictional local accounts only; do not activate deletion or role changes.
describe('Admin users state and role presentation', () => {
    for (const role of ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] as const) {
        for (const width of [320, 390, 1280]) {
            for (const font of [16, 32]) {
                for (const theme of ['light', 'dark'] as const) {
                    it(`${role} / ${width}px / ${font}px / ${theme}`, () => {
                        const id = `${role}-${width}-${font}-${theme}`;
                        const origin = new URL(String(Cypress.config('baseUrl')));
                        expect(origin.hostname).to.equal('127.0.0.1');
                        const profile = { id: 99600, email: 'viewer@example.invalid', name: '합성 운영자',
                            handle: 'synthetic-users-viewer', role, favoriteTeam: null, hasPassword: true, profileImageUrl: null };
                        const rows = [
                            { ...profile, createdAt: '2020-01-01T09:00:00', postCount: 0 },
                            { id: 99601, email: 'member@example.invalid', name: '합성 일반 사용자', role: 'ROLE_USER', favoriteTeam: null,
                                createdAt: '2020-01-02T09:00:00', postCount: 3 },
                            { id: 99602, email: 'admin@example.invalid', name: '합성 다른 관리자', role: 'ROLE_ADMIN', favoriteTeam: null,
                                createdAt: '2020-01-03T09:00:00', postCount: 5 },
                            { id: 99603, email: 'super-admin@example.invalid', name: '합성 다른 최고 관리자', role: 'ROLE_SUPER_ADMIN', favoriteTeam: null,
                                createdAt: '2020-01-04T09:00:00', postCount: 7 },
                        ];
                        const panel = '[data-testid="admin-users-panel"]', search = '[data-testid="admin-users-search"]';
                        let phase: 'populated' | 'error' | 'empty' = 'populated';
                        let pending = 0, writes = 0, release!: () => void;
                        const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
                        const findings: string[] = [], observations: Array<Record<string, unknown>> = [];
                        const responses: Array<{ phase: string; search: string | null; status: number }> = [];
                        const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/admin-users-${id}.json`, {
                            role, width, font, theme, findings, observations, responses, writes,
                        });
                        cy.intercept({ url: '**', middleware: true }, (req) => {
                            const url = new URL(req.url);
                            if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                                writes++;
                                return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                            }
                            if (url.origin !== origin.origin) return req.reply({ forceNetworkError: true, log: false });
                            if (url.pathname !== '/admin' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                                && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) {
                                req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
                            }
                        });
                        cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                        cy.intercept('**/auth/**', { statusCode: 503, body: {} });
                        cy.intercept('GET', '**/auth/mypage*', { statusCode: 200, body: { success: true, data: profile } });
                        cy.intercept('GET', '**/api/admin/stats*', { statusCode: 200,
                            body: { success: true, data: { totalUsers: 4, totalPosts: 0, totalMates: 0 } } });
                        cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
                        cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
                        cy.intercept('GET', '**/api/admin/users*', (req) => {
                            const state = phase, query = new URL(req.url).searchParams.get('search');
                            req.alias = query === 'fixture-zero' ? 'users-zero' : `users-${state}`;
                            pending++;
                            const reply = () => {
                                const status = state === 'error' ? 503 : 200;
                                responses.push({ phase: state, search: query, status });
                                req.reply({ statusCode: status, body: state === 'error' ? { message: '합성 사용자 조회 실패' }
                                    : { success: true, data: state === 'empty' || query === 'fixture-zero' ? [] : rows } });
                            };
                            return state === 'populated' && !query ? gate.then(reply) : reply();
                        });
                        cy.viewport(width, width === 1280 ? 900 : 844);
                        const visit = () => {
                            cy.visit('/admin', { onBeforeLoad(win) {
                                win.localStorage.clear(); win.sessionStorage.clear();
                                seedCypressAuthState(win, profile, undefined, { theme });
                                win.document.documentElement.style.fontSize = `${font}px`;
                                win.document.documentElement.style.scrollBehavior = 'auto';
                            } });
                            cy.get(panel, { timeout: 20000 }).should('exist');
                        };
                        const capture = (state: string, selector = panel, align = true) => {
                            if (align) cy.get(selector).then(($el) => {
                                const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                                const header = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
                                win.scrollBy({ top: el.getBoundingClientRect().top - Math.max(header?.bottom ?? 0, 80) - 16, behavior: 'instant' });
                            });
                            cy.screenshot(`admin-users-${id}-${state}`, { capture: 'viewport' });
                            cy.then(persist);
                        };
                        const snapshot = (state: string) => cy.get(panel).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                            const empty = Boolean(el.querySelector('[data-testid="admin-users-empty"]'));
                            const loading = Boolean(el.querySelector('[data-testid="admin-users-loading"]'));
                            const error = doc.querySelector('[data-testid="admin-error-message"]');
                            observations.push({ state, empty, loading, error: error?.textContent ?? null, text: el.innerText.replace(/\s+/g, ' ').trim() });
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(win.localStorage.getItem('kbo-theme')).to.equal(theme);
                            expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                            if (Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > doc.documentElement.clientWidth + 1) findings.push(`${state}: document overflow`);
                            if (state === 'held-loading') expect(loading && !empty).to.equal(true);
                            if (state === 'held-loading') {
                                const loader = el.querySelector<HTMLElement>('[data-testid="admin-users-loading"]')!;
                                const spinner = loader.querySelector<HTMLElement>('.animate-spin')!;
                                const label = loader.querySelector('span')!;
                                const rect = loader.getBoundingClientRect(), range = doc.createRange();
                                range.selectNodeContents(label);
                                const clipped = Array.from(range.getClientRects()).some((r) => r.left < rect.left - 1 || r.right > rect.right + 1);
                                observations.push({ state: 'loading-geometry', spinnerWidth: spinner.offsetWidth, spinnerHeight: spinner.offsetHeight, clipped });
                                if (Math.abs(spinner.offsetWidth - spinner.offsetHeight) > 1) findings.push('loading spinner squeezed out of circle');
                                if (clipped) findings.push('loading copy exceeds panel');
                            }
                            if (state === 'error' && empty) findings.push('failed users query retains healthy empty claim beside global error');
                            if (state === 'error') expect(el.querySelector('[data-testid="admin-users-error"]')).not.to.equal(null);
                            if (state === 'empty' || state === 'search-zero') expect(empty).to.equal(true);
                        });
                        const measure = (testId: string, state: string, scroll = true) => {
                            if (scroll) cy.get(`[data-testid="${testId}"]`).then(($el) => $el[0].scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
                            cy.get(`[data-testid="${testId}"]`).then(($el) => {
                                const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, rect = el.getBoundingClientRect();
                                const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                                const reachable = Boolean(hit && (hit === el || el.contains(hit)));
                                const focused = doc.activeElement === el;
                                const record: Record<string, unknown> = { state, testId, width: rect.width, height: rect.height, reachable, focused,
                                    x: rect.x, y: rect.y, hitTestId: hit?.getAttribute('data-testid') ?? null,
                                    hitTag: hit?.tagName, hitClass: hit?.getAttribute('class') ?? null,
                                    hitChatbot: Boolean(hit?.closest('[data-testid="chatbot-request-launcher"]')) };
                                if (el instanceof win.HTMLSelectElement) {
                                    const label = el.selectedOptions[0]?.textContent ?? '';
                                    const style = win.getComputedStyle(el), canvas = doc.createElement('canvas');
                                    const context = canvas.getContext('2d')!; context.font = style.font;
                                    const textWidth = context.measureText(label).width;
                                    const textArea = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
                                    Object.assign(record, { label, textWidth, textArea, textAreaExcludesNativeArrow: false });
                                    if (textWidth > textArea + 1) findings.push('role label exceeds text area before native arrow');
                                }
                                observations.push(record);
                                if (rect.width < 44 || rect.height < 44) findings.push(`${state}: control below44px`);
                                if (!reachable) findings.push(`${state}: control obscured`);
                            });
                        };
                        visit();
                        cy.wrap(null).should(() => expect(pending).to.be.greaterThan(0));
                        cy.get('[data-testid="admin-users-loading"]').should('have.attr', 'aria-busy', 'true');
                        snapshot('held-loading'); capture('held-loading'); cy.then(() => release());
                        cy.wait('@users-populated').its('response.body.data').should('have.length', 4);
                        cy.get(`${panel} tbody tr`).should('have.length', 4);
                        snapshot('populated'); capture('populated-start');
                        for (const userId of [99600, 99602, 99603]) cy.get(`[data-testid="admin-user-delete-${userId}"]`).should('be.disabled');
                        cy.get('[data-testid="admin-user-delete-99601"]').should('not.be.disabled');
                        cy.get(`${panel} select`).should('have.length', role === 'ROLE_SUPER_ADMIN' ? 2 : 0);
                        measure('admin-users-search', 'search-control');
                        measure('admin-user-delete-99601', 'delete-control'); capture('delete-control', panel, false);
                        if (role === 'ROLE_SUPER_ADMIN') {
                            measure('admin-user-role-trigger-99601', 'role-control'); capture('role-control', panel, false);
                        }
                        cy.then(persist);
                        cy.get(search).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(search).focus(); cy.press(Cypress.Keyboard.Keys.TAB);
                        const nextId = role === 'ROLE_SUPER_ADMIN' ? 'admin-user-role-trigger-99601' : 'admin-user-delete-99601';
                        measure(nextId, 'native-tab', false);
                        cy.get(`[data-testid="${nextId}"]`).then(($el) => { if ($el[0].ownerDocument.activeElement !== $el[0]) findings.push('native Tab order differs from first enabled table control'); });
                        capture('native-tab', panel, false);
                        cy.get(search).clear().type('fixture-zero');
                        cy.wait('@users-zero').its('response').should((response) => {
                            expect(response?.statusCode).to.equal(200); expect(response?.body.data).to.deep.equal([]);
                        });
                        cy.get('[data-testid="admin-users-empty"]').should('exist');
                        snapshot('search-zero'); capture('search-zero');
                        cy.then(() => { phase = 'error'; }); visit();
                        cy.wait('@users-error').its('response.statusCode').should('equal', 503);
                        cy.get('[data-testid="admin-error-message"]').should('have.attr', 'role', 'alert')
                            .and('contain.text', '서비스 연결이 불안정합니다.');
                        cy.get('[data-testid="admin-users-loading"]').should('not.exist');
                        snapshot('error'); capture('error-alert', '[data-testid="admin-error-message"]'); capture('error-panel');
                        cy.then(() => { phase = 'empty'; }); visit();
                        cy.wait('@users-empty').its('response').should((response) => {
                            expect(response?.statusCode).to.equal(200); expect(response?.body.data).to.deep.equal([]);
                        });
                        cy.get('[data-testid="admin-users-empty"]').should('exist');
                        cy.get('[data-testid="admin-error-message"]').should('not.exist');
                        snapshot('empty'); capture('empty');
                        cy.then(() => { expect(writes).to.equal(0); observations.push({ finished: true }); });
                        cy.then(persist);
                        cy.then(() => expect(findings, 'Admin users design findings').to.deep.equal([]));
                    });
                }
            }
        }
    }
});
