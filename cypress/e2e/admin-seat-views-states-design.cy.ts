/// <reference types="cypress" />

import type { AdminSeatView } from '../../src/types/admin';
import { seedCypressAuthState } from '../support/auth';

// Fictional submissions and local geometric SVG only. Never activate moderation.
describe('Admin seat-view read-only design states', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    const profile = { id: 99800, email: 'seat-design@example.invalid', name: '합성 관리자',
                        handle: 'synthetic-seat-admin', role: 'ROLE_ADMIN', favoriteTeam: null, hasPassword: true, profileImageUrl: null };
                    const base: AdminSeatView = { id: 99801, diaryId: null, userId: 99890,
                        photoUrl: '/synthetic-admin-seat-ok.svg', storagePath: 'synthetic/not-a-real-object', sourceType: 'DIRECT',
                        aiSuggestedLabel: null, aiConfidence: null, aiReason: null, userSelected: true, moderationStatus: 'PENDING',
                        adminLabel: null, adminMemo: null, reviewedBy: null, reviewedAt: null, rewardGranted: false,
                        stadium: '합성 검증 공간', section: '합성 구역', block: null, seatRow: null, seatNumber: null,
                        diaryDate: null, ticketVerified: false, ticketVerifiedAt: null, rating: 3,
                        comment: '실제 좌석 정보가 아닌 합성 제출 내용입니다.', tags: ['합성 태그'] };
                    const rows = Array.from({ length: 21 }, (_, index): AdminSeatView => ({ ...base, id: 99801 + index,
                        photoUrl: index === 0 ? base.photoUrl : index === 1 ? '/synthetic-admin-seat-broken.svg' : null }));
                    const panel = '[data-testid="admin-seat-views-panel"]', drawer = '[data-testid="admin-seat-view-detail-drawer"]';
                    const region = '[data-testid="admin-seat-views-table-region"]';
                    const findings: string[] = [], observations: Array<Record<string, unknown>> = [], responses: Array<Record<string, unknown>> = [];
                    let phase: 'data' | 'error' | 'empty' = 'data', detailError = false, holdDetailError = false, writes = 0, listPending = 0, detailPending = 0;
                    let releaseList!: () => void, releaseDetail!: () => void, releaseLateError!: () => void;
                    const listGate = new Cypress.Promise<void>((resolve) => { releaseList = resolve; });
                    const detailGate = new Cypress.Promise<void>((resolve) => { releaseDetail = resolve; });
                    const lateErrorGate = new Cypress.Promise<void>((resolve) => { releaseLateError = resolve; });
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/admin-seat-views-${id}.json`, {
                        width, font, theme, role: profile.role, browserCacheDisabled: true, findings, observations, responses, writes,
                    });
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        const url = new URL(req.url);
                        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                            writes++;
                            return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                        }
                        if (url.origin !== origin.origin) return req.reply({ forceNetworkError: true, log: false });
                        if (url.pathname !== '/admin' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                            && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
                    });
                    cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    cy.intercept('**/auth/**', { statusCode: 503, body: {} });
                    cy.intercept('GET', '**/auth/mypage*', { statusCode: 200, body: { success: true, data: profile } });
                    cy.intercept('GET', '**/api/admin/stats*', { statusCode: 200, body: { success: true, data: { totalUsers: 1, totalPosts: 0, totalMates: 0 } } });
                    cy.intercept('GET', '**/api/admin/users*', { statusCode: 200, body: { success: true, data: [] } }).as('users');
                    cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
                    cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
                    cy.intercept('GET', '**/synthetic-admin-seat-ok.svg', { statusCode: 200, headers: { 'content-type': 'image/svg+xml' },
                        body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#0f766e"/><circle cx="160" cy="90" r="45" fill="#fbbf24"/></svg>' });
                    cy.intercept('GET', '**/synthetic-admin-seat-broken.svg', { statusCode: 404, body: '' });
                    cy.intercept('GET', '**/api/admin/seat-views?*', (req) => {
                        const state = phase, query = new URL(req.url).searchParams, page = Number(query.get('page') ?? 0);
                        const filtered = query.get('moderationStatus') === 'APPROVED';
                        req.alias = `seat-list-${state}-${filtered ? 'filtered' : page}`; listPending++;
                        const reply = () => {
                            const status = state === 'error' ? 503 : 200, empty = state === 'empty' || filtered;
                            responses.push({ kind: 'list', state, page, filtered, status });
                            req.reply({ statusCode: status, body: status === 503 ? { message: 'synthetic list failure' }
                                : { success: true, data: { content: empty ? [] : rows.slice(page * 20, page * 20 + 20),
                                    totalElements: empty ? 0 : 21, totalPages: empty ? 0 : 2, number: page, size: 20, last: empty || page === 1 } } });
                        };
                        return state === 'data' ? listGate.then(reply) : reply();
                    });
                    cy.intercept('GET', /\/api\/admin\/seat-views\/998\d+$/, (req) => {
                        const failed = detailError, delayed = holdDetailError, key = Number(new URL(req.url).pathname.split('/').at(-1));
                        detailPending++; req.alias = failed ? delayed ? 'seat-detail-late-error' : 'seat-detail-error' : `seat-detail-${key}`;
                        const reply = () => {
                            responses.push({ kind: 'detail', key, delayed, status: failed ? 503 : 200 });
                            req.reply({ statusCode: failed ? 503 : 200, body: failed ? { message: 'synthetic detail failure' }
                                : { success: true, data: rows.find((row) => row.id === key) } });
                        };
                        return failed ? delayed ? lateErrorGate.then(reply) : reply() : detailGate.then(reply);
                    });
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    cy.then(() => Cypress.automation('remote:debugger:protocol', {
                        command: 'Network.setCacheDisabled', params: { cacheDisabled: true },
                    }));
                    const align = (selector: string) => cy.get(selector).first().then(($el) => {
                        const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                        const header = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
                        win.scrollBy({ top: el.getBoundingClientRect().top - Math.max(header?.bottom ?? 0, 80) - 16, behavior: 'instant' });
                    });
                    const capture = (state: string, selector = panel) => {
                        if (selector !== drawer) align(selector);
                        cy.get(selector).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(win.localStorage.getItem('kbo-theme')).to.equal(theme);
                            expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                            observations.push({ state, text: el.innerText.replace(/\s+/g, ' ').trim() });
                            if (Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > doc.documentElement.clientWidth + 1) findings.push(`${state}: document overflow`);
                            if (state === 'detail-image') {
                                const title = el.querySelector('h2 span span')!;
                                const background = win.getComputedStyle(el).backgroundColor, titleColor = win.getComputedStyle(title).color;
                                observations.push({ state: 'drawer-colors', background, titleColor, inheritsDark: Boolean(el.closest('.dark')) });
                                expect(el.classList.contains('dark')).to.equal(true);
                                expect(background).to.equal('rgb(15, 23, 42)'); expect(titleColor).to.equal('rgb(255, 255, 255)');
                                if (background === titleColor) findings.push('drawer title equals background color');
                            }
                            if (state === 'detail-error' && el.innerText.includes('상세 정보를 찾을 수 없습니다.')) findings.push('detail failure presented as not found');
                            if (state === 'list-error' && el.innerText.includes('시야뷰 후보가 없습니다.')) findings.push('list failure presented as healthy empty');
                            if (state === 'list-error') {
                                const message = el.querySelector('[data-testid="admin-seat-views-error"]')!, node = message.firstChild!;
                                const text = node.textContent!, word = '실패했습니다.', range = doc.createRange();
                                range.setStart(node, text.indexOf(word)); range.setEnd(node, text.indexOf(word) + word.length);
                                observations.push({ state: 'error-final-word', wordLines: range.getClientRects().length });
                                expect(range.getClientRects().length, 'whole error final word').to.equal(1);
                            }
                        });
                        cy.screenshot(`admin-seat-views-${id}-${state}`, { capture: 'viewport' }); cy.then(persist);
                    };
                    const measure = (selector: string) => cy.get(selector).each(($el) => {
                        const el = $el[0], rect = el.getBoundingClientRect(), control = el.getAttribute('data-testid') ?? el.getAttribute('aria-label');
                        observations.push({ control, width: rect.width, height: rect.height });
                        if (rect.width < 43.99 || rect.height < 43.99) findings.push(`${control}: below44px`);
                    });
                    const visit = () => {
                        cy.visit('/admin', { onBeforeLoad(win) {
                            win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, profile, undefined, { theme });
                            win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
                        } });
                        cy.wait('@users'); align('[data-testid="admin-tab-seat-views"]');
                        cy.get('[data-testid="admin-tab-seat-views"]').click({ scrollBehavior: false }); cy.get(panel, { timeout: 20000 }).should('exist');
                    };
                    const open = (key: number) => {
                        const cell = `[data-testid="admin-seat-view-row-${key}"] td:first-child`;
                        align(cell); cy.get(cell).click({ scrollBehavior: false }); cy.get(drawer).should('exist');
                    };
                    const close = () => { cy.get(`${drawer} button[aria-label="닫기"]`).click(); cy.get(drawer).should('not.exist'); };
                    visit(); cy.wrap(null).should(() => expect(listPending).to.be.greaterThan(0));
                    cy.contains(`${panel} [role="status"]`, '시야뷰 후보 로딩 중...').should('exist'); capture('list-loading', region);
                    cy.then(() => releaseList()); cy.wait('@seat-list-data-0').its('response.body.data.content').should('have.length', 20);
                    cy.get('[data-testid="admin-seat-view-row-99801"] img').should(($img) => expect(($img[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0));
                    measure(`${panel} select, ${panel} input, ${panel} > div > button, ${panel} [data-testid$="-page"], [data-testid="admin-seat-view-row-99801"] button`);
                    capture('filters'); align('[data-testid="admin-seat-view-row-99801"] img');
                    cy.get('[data-testid="admin-seat-view-row-99801"] img').should('be.visible'); capture('list-image', region);
                    align('[data-testid="admin-seat-view-photo-fallback-99802"]');
                    cy.get('[data-testid="admin-seat-view-photo-fallback-99802"]').should('have.attr', 'role', 'img').and('be.visible'); capture('list-fallback', region);
                    align('[data-testid="admin-seat-view-photo-fallback-99803"]');
                    cy.get('[data-testid="admin-seat-view-photo-fallback-99803"]').should('be.visible'); capture('list-no-photo', region);
                    open(99801); cy.wrap(null).should(() => expect(detailPending).to.equal(1));
                    cy.contains(drawer, '상세 정보를 불러오는 중...').should('exist'); capture('detail-loading', drawer);
                    cy.then(() => releaseDetail()); cy.wait('@seat-detail-99801').its('response.statusCode').should('equal', 200);
                    cy.get(`${drawer} img`).should(($img) => expect(($img[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0));
                    measure(`${drawer} button`); capture('detail-image', drawer); close();
                    open(99802); cy.wait('@seat-detail-99802').its('response.statusCode').should('equal', 200);
                    cy.get('[data-testid="admin-seat-view-detail-photo-fallback-99802"]').should('have.attr', 'role', 'img').and('be.visible'); capture('detail-broken', drawer); close();
                    align('[data-testid="admin-seat-views-next-page"]'); cy.get('[data-testid="admin-seat-views-next-page"]').click({ scrollBehavior: false });
                    cy.wait('@seat-list-data-1').its('response.body.data.number').should('equal', 1);
                    cy.get(`${panel} tbody tr`).should('have.length', 1);
                    cy.get('[data-testid="admin-seat-view-row-99821"]').should('exist'); cy.get('[data-testid="admin-seat-views-next-page"]').should('be.disabled'); capture('page-two', region);
                    open(99821); cy.wait('@seat-detail-99821').its('response.statusCode').should('equal', 200);
                    cy.get('[data-testid="admin-seat-view-detail-photo-fallback-99821"]').should('have.attr', 'role', 'img').and('be.visible'); capture('detail-no-photo', drawer); close();
                    align('[data-testid="admin-seat-views-status-filter"]'); cy.get('[data-testid="admin-seat-views-status-filter"]').select('APPROVED');
                    cy.wait('@seat-list-data-filtered').its('response.body.data.content').should('deep.equal', []);
                    cy.contains(panel, '시야뷰 후보가 없습니다.').should('exist'); capture('filter-empty', region);
                    align('[data-testid="admin-seat-views-reset-filters"]'); cy.get('[data-testid="admin-seat-views-reset-filters"]').click({ scrollBehavior: false });
                    cy.wait('@seat-list-data-0').its('response.body.data.number').should('equal', 0); cy.get('[data-testid="admin-seat-view-row-99801"]').should('exist'); capture('filter-reset', region);
                    cy.then(() => { detailError = true; }); open(99801); cy.wait('@seat-detail-error').its('response.statusCode').should('equal', 503);
                    cy.contains(drawer, '상세 정보를 불러오는 중...').should('not.exist');
                    cy.get('[data-testid="admin-seat-view-detail-error"]').should('contain.text', '시야뷰 후보 상세를 불러오는데 실패했습니다.');
                    cy.contains(drawer, '상세 정보를 찾을 수 없습니다.').should('not.exist');
                    cy.get(`${drawer} [data-testid^="admin-seat-view-action-"]`).should('not.exist'); capture('detail-error', drawer); close();
                    cy.then(() => { detailError = false; }); open(99801);
                    cy.wait('@seat-detail-99801').its('response.statusCode').should('equal', 200);
                    cy.get(`${drawer} img`).should('exist'); cy.get('[data-testid="admin-seat-view-detail-error"]').should('not.exist');
                    capture('detail-recovered', drawer); close();
                    cy.then(() => { detailError = true; holdDetailError = true; }); open(99801);
                    cy.wrap(null).should(() => expect(detailPending).to.equal(6));
                    cy.contains(drawer, '상세 정보를 불러오는 중...').should('exist'); close();
                    cy.then(() => { detailError = false; holdDetailError = false; }); open(99801);
                    cy.wait('@seat-detail-99801').its('response.statusCode').should('equal', 200);
                    cy.get(`${drawer} img`).should('exist'); cy.then(() => releaseLateError());
                    cy.wait('@seat-detail-late-error').its('response.statusCode').should('equal', 503);
                    cy.get('[data-testid="admin-seat-view-detail-error"]').should('not.exist');
                    cy.get('[data-testid="admin-seat-view-action-approve"]').should('exist'); capture('detail-late-error-isolated', drawer); close();
                    cy.then(() => { phase = 'error'; }); visit(); cy.wait('@seat-list-error-0').its('response.statusCode').should('equal', 503);
                    cy.get('[data-testid="admin-error-message"]').should('exist');
                    cy.get('[data-testid="admin-seat-views-error"]').should('contain.text', '시야뷰 후보를 불러오는데 실패했습니다.');
                    cy.contains(panel, '시야뷰 후보가 없습니다.').should('not.exist');
                    capture('list-error-alert', '[data-testid="admin-error-message"]'); capture('list-error', region);
                    cy.then(() => { phase = 'empty'; }); visit(); cy.wait('@seat-list-empty-0').its('response.body.data.content').should('deep.equal', []);
                    cy.contains(panel, '시야뷰 후보가 없습니다.').should('exist'); capture('list-empty', region);
                    cy.get('[data-testid="admin-seat-views-error"]').should('not.exist');
                    cy.then(() => { expect(writes).to.equal(0); observations.push({ finished: true }); }); cy.then(persist);
                    cy.then(() => expect(findings, 'Admin seat-view design findings').to.deep.equal([]));
                });
            }
        }
    }
});
