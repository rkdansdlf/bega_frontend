/// <reference types="cypress" />

import type { AdminOffseasonMovement } from '../../src/types/admin';
import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

// Fictional UI-only row. Never activate create/edit/delete/import/source links.
describe('Offseason Admin synthetic read-only list states', () => {
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width}px / ${font}px / ${theme}`, () => {
            const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const viewer = { id: 950094, email: 'offseason-design@example.invalid', name: '합성 관리자', handle: 'design_offseason_admin',
                role: 'ROLE_ADMIN', favoriteTeam: null, profileImageUrl: null, hasPassword: true };
            const panel = '[data-testid="admin-offseason-content"]', results = '[data-testid="admin-offseason-results-runtime"]';
            const empty = '[data-testid="admin-offseason-empty-results"]';
            const movement: AdminOffseasonMovement = { id: 950094, movementDate: '2026-10-25', section: '합성 UI 검증',
                teamCode: 'SYNTH_TEAM', playerName: '합성 선수 UI 전용', summary: '합성 목록 표시 검증이며 실제 이적 사실이 아닙니다.',
                details: null, contractTerm: null, contractValue: null, sourceLabel: null, sourceUrl: null, announcedAt: null };
            let phase: 'error' | 'empty' | 'data' = 'error', release!: () => void, foreignBlocked = 0;
            const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
            const mutations: string[] = [], unexpectedReads: string[] = [], findings: string[] = [];
            const replies: Array<Record<string, unknown>> = [], observations: Array<Record<string, unknown>> = [];
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/offseason-${id}.json`, {
                width, font, requestedTheme: theme, phase, foreignBlocked, mutations, unexpectedReads, replies, observations, findings,
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
            cy.intercept('GET', `${origin}/api/admin/stats`, { statusCode: 200, body: { success: true, data: { totalUsers: 1, totalPosts: 0, totalMates: 0 } } });
            cy.intercept('GET', `${origin}/api/admin/users*`, (req) => {
                const url = new URL(req.url); expect(url.pathname).to.equal('/api/admin/users');
                expect(Array.from(url.searchParams.entries()).every(([key, value]) => key === 'search' && value === '')).to.equal(true);
                req.reply({ statusCode: 200, body: { success: true, data: [] } });
            });
            cy.intercept('GET', `${origin}/api/dm/rooms/my`, { statusCode: 200, body: { success: true, data: [] } });
            cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { statusCode: 200, body: { success: true, data: 0 } });
            cy.intercept('GET', `${origin}/api/notifications/my*`, (req) => {
                const url = new URL(req.url); expect(url.pathname).to.equal('/api/notifications/my'); expect(url.search).to.equal('');
                req.reply({ statusCode: 200, body: [] });
            });
            cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { statusCode: 200, body: 0 });
            cy.intercept('GET', `${origin}/api/admin/offseason/movements*`, (req) => {
                const url = new URL(req.url), current = phase;
                expect(url.pathname).to.equal('/api/admin/offseason/movements'); expect(url.search).to.equal('');
                req.alias = `offseason-${current}`;
                const reply = () => {
                    const status = current === 'error' ? 503 : 200;
                    replies.push({ phase: current, status, path: url.pathname, query: url.search });
                    req.reply({ statusCode: status, body: status === 503 ? {} : { success: true, data: current === 'data' ? [movement] : [] } });
                };
                return current === 'error' ? gate.then(reply) : reply();
            });
            const align = (selector: string) => cy.get(selector).first().then(($el) => {
                const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                const capsule = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
                win.scrollBy({ top: el.getBoundingClientRect().top - Math.max(capsule?.bottom ?? 0, 80) - 16, behavior: 'instant' });
            });
            const capture = (state: string, selector: string) => {
                cy.document().then((doc) => doc.fonts.ready); align(selector);
                cy.get(selector).first().should('be.visible').then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(win.localStorage.getItem('kbo-theme')).to.equal(theme);
                    expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                    observations.push({ state, text: el.innerText, width: el.clientWidth, scrollWidth: el.scrollWidth });
                    if (Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > doc.documentElement.clientWidth + 1) findings.push(`${state}: document overflow`);
                    // Populated data tables intentionally scroll horizontally; status copy should not need it.
                    if (selector !== '[data-testid="admin-offseason-results-scroll"]' && el.scrollWidth > el.clientWidth + 1) findings.push(`${state}: selected element internal overflow`);
                }); cy.screenshot(`offseason-${id}-${state}`, { capture: 'viewport' }); cy.then(persist);
            };
            const refresh = () => {
                align('[data-testid="admin-offseason-refresh"]');
                cy.get('[data-testid="admin-offseason-refresh"]').should('be.enabled').click({ scrollBehavior: false });
            };
            cy.viewport(width, width === 1280 ? 900 : 844);
            cy.visit('/admin', { onBeforeLoad(win) {
                win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            align('[data-testid="admin-tab-offseason"]'); cy.get('[data-testid="admin-tab-offseason"]').click({ scrollBehavior: false });
            cy.get(`${panel} h3`).should('contain.text', '스토브리그 이동 관리');
            cy.get(`${results} [aria-busy="true"]`).should('contain.text', '불러오는 중');
            cy.get('[data-testid="admin-offseason-refresh"]').should('be.disabled');
            capture('loading', `${results} [aria-busy="true"]`);
            cy.get(`${results} [aria-busy="true"]`).then(($el) => {
                const spinner = $el[0].firstElementChild!;
                // Layout dimensions exclude the spinner's animated rotation transform.
                observations.push({ state: 'loading-spinner', width: spinner.clientWidth, height: spinner.clientHeight });
                if (Math.abs(spinner.clientWidth - spinner.clientHeight) > 1) findings.push('loading spinner compressed');
            });
            cy.then(() => release()); cy.wait('@offseason-error').its('response.statusCode').should('equal', 503);
            cy.get(`${panel} [role="alert"]`).should('contain.text', '서비스 연결이 불안정합니다.');
            cy.get('[data-testid="admin-offseason-refresh"]').should('be.enabled');
            cy.get('[data-testid="admin-offseason-results-error"]').should('exist'); cy.get(empty).should('not.exist');
            capture('failed-alert', `${panel} [role="alert"]`); capture('failed-results', results);
            cy.get(results).then(($el) => {
                const falseEmpty = $el.text().includes('조건에 맞는 스토브리그 이동이 없습니다.');
                observations.push({ state: 'failed-empty-distinction', falseEmpty });
                if (falseEmpty) findings.push('failed read shown as healthy empty');
            });
            cy.then(() => { phase = 'empty'; }); refresh(); cy.wait('@offseason-empty').its('response.statusCode').should('equal', 200);
            cy.get(`${panel} [role="alert"]`).should('not.exist'); cy.get(empty).should('contain.text', '조건에 맞는 스토브리그 이동이 없습니다.');
            capture('healthy-empty', empty);
            cy.then(() => { phase = 'data'; }); refresh(); cy.wait('@offseason-data').its('response.statusCode').should('equal', 200);
            cy.get(`[data-testid="admin-offseason-row-${movement.id}"]`).should('contain.text', movement.playerName).and('contain.text', movement.summary!);
            cy.get(empty).should('not.exist'); capture('populated-table', '[data-testid="admin-offseason-results-scroll"]');
            capture('populated-header', `${panel} h3`);
            capture('populated-filters', '[data-testid="admin-offseason-search"]');
            if (width < 640) for (const [name, word] of [['refresh', '새로고침'], ['apply-filters', '조회'], ['reset-filters', '초기화']]) {
                cy.get(`[data-testid="admin-offseason-${name}"]`).then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, walker = doc.createTreeWalker(el, doc.defaultView!.NodeFilter.SHOW_TEXT);
                    let node: Node | null, ranges = 0;
                    while ((node = walker.nextNode())) {
                        const start = node.textContent?.indexOf(word) ?? -1; if (start < 0) continue;
                        const range = doc.createRange(); range.setStart(node, start); range.setEnd(node, start + word.length);
                        ranges += Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0).length;
                    }
                    observations.push({ state: 'mobile-control-word', name, word, ranges });
                    if (ranges !== 1) findings.push(`${name}: mobile word fragmented`);
                });
            }
            for (const name of ['section-trigger', 'team-trigger']) {
                cy.get(`[data-testid="admin-offseason-${name}"]`).then(($el) => {
                    const el = $el[0] as HTMLSelectElement, style = el.ownerDocument.defaultView!.getComputedStyle(el);
                    const ctx = el.ownerDocument.createElement('canvas').getContext('2d')!; ctx.font = style.font;
                    const text = el.selectedOptions[0].textContent ?? '', measured = ctx.measureText(text).width;
                    const available = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - parseFloat(style.fontSize);
                    observations.push({ state: 'selected-option-space', name, text, measured, available, arrowAllowance: parseFloat(style.fontSize) });
                    if (measured > available + 1) findings.push(`${name}: selected text lacks space with conservative arrow allowance`);
                });
            }
            cy.get('[data-testid="admin-offseason-search"]').then(($el) => {
                const el = $el[0], style = el.ownerDocument.defaultView!.getComputedStyle(el);
                const available = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
                observations.push({ state: 'search-content-space', available, fontSize: parseFloat(style.fontSize) });
                if (available < parseFloat(style.fontSize) * 2) findings.push('search text slot smaller than two font ems');
            });
            for (const name of ['refresh', 'search', 'section-trigger', 'team-trigger', 'from-date', 'to-date', 'apply-filters', 'reset-filters',
                'download-template', 'import-csv', 'open-create', `edit-${movement.id}`, `delete-${movement.id}`]) {
                cy.get(`[data-testid="admin-offseason-${name}"]`).should('have.length', 1).then(($el) => {
                    const r = $el[0].getBoundingClientRect(); observations.push({ state: 'control-size', name, width: r.width, height: r.height });
                    if (r.width < 43.99 || r.height < 43.99) findings.push(`${name}: below44px`);
                });
            }
            cy.then(() => { phase = 'error'; }); refresh(); cy.wait('@offseason-error').its('response.statusCode').should('equal', 503);
            cy.get(`${panel} [role="alert"]`).should('contain.text', '서비스 연결이 불안정합니다.');
            cy.get(`[data-testid="admin-offseason-row-${movement.id}"]`).should('contain.text', movement.playerName);
            cy.get('[data-testid="admin-offseason-results-error"]').should('not.exist'); cy.get(empty).should('not.exist');
            capture('cached-data-after-failure', '[data-testid="admin-offseason-results-scroll"]');
            cy.then(() => { phase = 'empty'; }); refresh(); cy.wait('@offseason-empty').its('response.statusCode').should('equal', 200);
            cy.get(`${panel} [role="alert"]`).should('not.exist'); cy.get('[data-testid="admin-offseason-results-error"]').should('not.exist');
            cy.get(empty).should('contain.text', '조건에 맞는 스토브리그 이동이 없습니다.');
            capture('empty-after-cached-failure-recovery', empty);
            cy.then(() => {
                expect(mutations).to.deep.equal([]); expect(unexpectedReads).to.deep.equal([]);
                expect(replies.map((x) => x.status)).to.deep.equal([503, 200, 200, 503, 200]);
                observations.push({ finished: true });
            }); cy.then(persist);
            cy.then(() => expect(findings, 'Offseason read-state design findings').to.deep.equal([]));
        });
    }
});
