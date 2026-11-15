/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

// Fictional local moderation records, not real people, posts, games or teams.
const admin = { id: 99400, email: 'admin-states@example.invalid', name: '합성 관리자',
    handle: 'synthetic-admin-states', role: 'ROLE_ADMIN', favoriteTeam: null, hasPassword: true, profileImageUrl: null };
const posts = [
    { id: 99401, team: 'SYNTH', content: '합성 게시글 목록 디자인 검증', author: '합성 작성자',
        createdAt: '2020-01-01T09:00:00', likeCount: 12, commentCount: 3, views: 20, isHot: false },
    { id: 99402, team: 'SYNTH', content: '합성 긴 게시글 내용과 작성자 표시를 검증하기 위한 반복 안내 문구입니다. 실제 게시글이 아닙니다.',
        author: '아주긴합성작성자표시이름', createdAt: '2020-01-02T09:00:00', likeCount: 12345, commentCount: 678, views: 20, isHot: true },
];
const mates = [
    { id: 99403, teamId: 'SYNTH', title: '합성 메이트 목록 디자인 검증', stadium: '합성 검증 구장', gameDate: '2099-01-01',
        currentMembers: 2, maxMembers: 4, status: 'pending', createdAt: '2020-01-01T09:00:00', hostName: '합성 호스트',
        homeTeam: '합성 홈', awayTeam: '합성 원정', section: '합성 구역' },
    { id: 99404, teamId: 'SYNTH', title: '아주 긴 합성 메이트 모임 제목의 표시 공간을 확인합니다', stadium: '합성 검증 구장', gameDate: '2099-01-02',
        currentMembers: 4, maxMembers: 4, status: 'matched', createdAt: '2020-01-02T09:00:00', hostName: '아주긴합성호스트표시이름',
        homeTeam: '합성 홈', awayTeam: '합성 원정', section: '합성 구역' },
];

describe('Admin community list design states', () => {
    for (const tab of ['posts', 'parties'] as const) {
        for (const width of [320, 390, 1280]) {
            for (const font of [16, 32]) {
                for (const theme of ['light', 'dark'] as const) {
                    it(`${tab} / ${width}px / ${font}px / ${theme}`, () => {
                        const id = `${tab}-${width}-${font}-${theme}`;
                        const origin = new URL(String(Cypress.config('baseUrl')));
                        expect(origin.hostname).to.equal('127.0.0.1');
                        const kind = tab === 'posts' ? 'posts' : 'mates';
                        const panel = `[data-testid="admin-${kind}-panel"]`;
                        const empty = `[data-testid="admin-${kind}-empty"]`;
                        const rows = tab === 'posts' ? posts : mates;
                        const findings: string[] = [], observations: Array<Record<string, unknown>> = [];
                        const responses: Array<{ state: string; status: number }> = [];
                        let phase: 'populated' | 'error' | 'empty' | 'recover' = 'populated';
                        let writes = 0, pending = 0, release!: () => void, releaseRest!: () => void;
                        const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
                        const restGate = new Cypress.Promise<void>((resolve) => { releaseRest = resolve; });
                        const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/admin-community-${id}.json`, {
                            tab, width, font, theme, role: admin.role, browserCacheDisabled: true, findings, observations, responses, writes,
                        });
                        cy.intercept({ url: '**', middleware: true }, (req) => {
                            const url = new URL(req.url);
                            if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                                writes++;
                                return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                            }
                            if (url.origin !== origin.origin) return req.reply({ forceNetworkError: true, log: false });
                            if (!['/admin'].includes(url.pathname) && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                                && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) {
                                req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
                            }
                        });
                        cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                        cy.intercept('**/auth/**', { statusCode: 503, body: {} });
                        cy.intercept('GET', '**/auth/mypage*', { statusCode: 200, body: { success: true, data: admin } });
                        cy.intercept('GET', '**/api/admin/stats*', { statusCode: 200, body: { success: true, data: { totalUsers: 1, totalPosts: 2, totalMates: 2 } } });
                        cy.intercept('GET', '**/api/admin/users*', { statusCode: 200, body: { success: true, data: [] } }).as('users');
                        cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
                        cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
                        cy.intercept('GET', `**/api/admin/${kind}`, (req) => {
                            const state = phase;
                            req.alias = `adminList-${state}`;
                            pending++;
                            const reply = () => {
                                const status = state === 'error' ? 503 : 200;
                                responses.push({ state, status });
                                req.reply({ statusCode: status, body: state === 'error'
                                    ? { code: 'SYNTHETIC_LIST_UNAVAILABLE' }
                                    : { success: true, data: state === 'empty' ? [] : rows } });
                            };
                            return state === 'populated' ? (pending === 1 ? gate : restGate).then(reply) : reply();
                        });
                        cy.viewport(width, width === 1280 ? 900 : 844);
                        cy.then(() => Cypress.automation('remote:debugger:protocol', {
                            command: 'Network.setCacheDisabled', params: { cacheDisabled: true },
                        }));
                        const visit = () => {
                            cy.visit('/admin', { onBeforeLoad(win) {
                                win.localStorage.clear(); win.sessionStorage.clear();
                                seedCypressAuthState(win, admin, undefined, { theme });
                                win.document.documentElement.style.fontSize = `${font}px`;
                                win.document.documentElement.style.scrollBehavior = 'auto';
                            } });
                            cy.wait('@users');
                            cy.get(`[data-testid="admin-tab-${tab}"]`, { timeout: 20000 }).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                            cy.get(`[data-testid="admin-tab-${tab}"]`).click();
                            cy.get(panel).should('exist');
                        };
                        const capture = (state: string, selector = panel, align = true) => {
                            if (align) cy.get(selector).then(($el) => {
                                const el = $el[0], win = el.ownerDocument.defaultView!;
                                const header = el.ownerDocument.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
                                win.scrollBy({ top: el.getBoundingClientRect().top - Math.max(header?.bottom ?? 0, 80) - 16, behavior: 'instant' });
                            });
                            cy.screenshot(`admin-community-${id}-${state}`, { capture: 'viewport' });
                            cy.then(persist);
                        };
                        const snapshot = (state: string) => cy.get(panel).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                            const busy = el.closest('[data-testid="admin-community-runtime"]')?.getAttribute('aria-busy') === 'true';
                            const emptyClaim = Boolean(el.querySelector(empty));
                            const error = doc.querySelector('[data-testid="admin-error-message"]');
                            const text = el.innerText.replace(/\s+/g, ' ').trim();
                            observations.push({ state, busy, emptyClaim, error: error?.textContent ?? null, text,
                                documentWidth: Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth), viewport: doc.documentElement.clientWidth });
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(win.localStorage.getItem('kbo-theme')).to.equal(theme);
                            expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                            if (Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > doc.documentElement.clientWidth + 1) findings.push(`${state}: document overflow`);
                            if (state === 'held-loading' && (emptyClaim || !busy)) findings.push('pending list presents healthy empty instead of loading');
                            if (state === 'held-loading') expect(el.querySelector(`[data-testid="admin-${kind}-loading"]`)?.getAttribute('role')).to.equal('status');
                            if (state === 'overlap-loading') expect(busy, 'remaining request keeps list busy after first response').to.equal(true);
                            if (state === 'error' && emptyClaim) findings.push('failed list retains healthy empty claim beside global error');
                            if (state === 'error') {
                                expect(el.querySelector(`[data-testid="admin-${kind}-error"]`)).not.to.equal(null);
                                expect(busy).to.equal(false);
                            }
                            if (state === 'empty') expect(emptyClaim).to.equal(true);
                        });
                        visit();
                        cy.wrap(null).should(() => expect(pending, 'held list request observed').to.be.greaterThan(0));
                        snapshot('held-loading'); capture('held-loading');
                        cy.get('[data-testid="admin-tab-users"]').then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get('[data-testid="admin-tab-users"]').click();
                        cy.get(`[data-testid="admin-tab-${tab}"]`).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(`[data-testid="admin-tab-${tab}"]`).click();
                        cy.wrap(null).should(() => expect(pending, 'overlapping requests observed').to.be.at.least(2));
                        cy.then(() => release());
                        cy.wait('@adminList-populated').its('response').should((response) => {
                            expect(response?.statusCode).to.equal(200);
                            expect(response?.body.data).to.have.length(2);
                        });
                        cy.get(`${panel} tbody tr`).should('have.length', 2);
                        snapshot('overlap-loading'); capture('overlap-loading');
                        cy.then(() => releaseRest());
                        cy.wait('@adminList-populated').its('response.statusCode').should('equal', 200);
                        cy.get(`${panel} [data-testid="admin-${kind}-loading"]`).should('not.exist');
                        snapshot('populated'); capture('populated-start');
                        cy.get(`${panel} [data-slot="table-container"]`).then(($el) => {
                            const el = $el[0];
                            observations.push({ state: 'table-scroll', width: el.clientWidth, scrollWidth: el.scrollWidth,
                                overflowX: el.ownerDocument.defaultView!.getComputedStyle(el).overflowX });
                            el.scrollLeft = el.scrollWidth;
                        });
                        const actions = `${panel} tbody button`;
                        cy.get(actions).should('have.length', 2);
                        cy.get(actions).first().then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(actions).first().then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, rect = el.getBoundingClientRect();
                            const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                            const reachable = Boolean(hit && (hit === el || el.contains(hit)));
                            observations.push({ state: 'delete-control', width: rect.width, height: rect.height, reachable });
                            if (rect.width < 44 || rect.height < 44) findings.push('delete control below44px');
                            if (!reachable) findings.push('delete control obscured after table and page scroll');
                        });
                        capture('populated-end', panel, false);
                        cy.then(() => { phase = 'error'; }); visit();
                        cy.wait('@adminList-error').its('response.statusCode').should('equal', 503);
                        cy.get('[data-testid="admin-error-message"]', { timeout: 15000 }).should('contain.text', tab === 'posts' ? '게시글' : '메이트');
                        snapshot('error'); capture('error-alert', '[data-testid="admin-error-message"]'); capture('error-panel');
                        cy.then(() => { phase = 'recover'; });
                        cy.get('[data-testid="admin-tab-users"]').then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get('[data-testid="admin-tab-users"]').click();
                        cy.get(`[data-testid="admin-tab-${tab}"]`).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(`[data-testid="admin-tab-${tab}"]`).click();
                        cy.wait('@adminList-recover').its('response.statusCode').should('equal', 200);
                        cy.get(`${panel} tbody tr`).should('have.length', 2);
                        cy.get('[data-testid="admin-error-message"]').should('not.exist');
                        snapshot('recovered'); capture('recovered');
                        cy.then(() => { phase = 'empty'; }); visit();
                        cy.wait('@adminList-empty').its('response').should((response) => {
                            expect(response?.statusCode).to.equal(200);
                            expect(response?.body.data).to.deep.equal([]);
                        });
                        cy.get('[data-testid="admin-error-message"]').should('not.exist');
                        cy.get(empty).should('exist');
                        cy.wrap(null).should(() => expect(responses.some((r) => r.state === 'empty' && r.status === 200)).to.equal(true));
                        snapshot('empty'); capture('empty');
                        cy.then(() => { expect(writes).to.equal(0); observations.push({ finished: true }); });
                        cy.then(persist);
                        cy.then(() => expect(findings, 'Admin list design findings').to.deep.equal([]));
                    });
                }
            }
        }
    }
});
