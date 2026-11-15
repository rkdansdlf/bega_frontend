/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

// Read-only fictional reports. Never activate moderation or appeal decisions.
describe('Admin reports list and detail design evidence', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`;
                    const origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    const profile = { id: 99700, email: 'reports@example.invalid', name: '합성 관리자',
                        handle: 'synthetic-reports', role: 'ROLE_ADMIN', favoriteTeam: null, hasPassword: true, profileImageUrl: null };
                    const report = { id: 99701, status: 'PENDING', reason: 'OTHER', reporterHandle: 'synthetic-reporter',
                        postPreview: '실제 게시물이 아닌 합성 신고 디자인 검증 문구입니다.', createdAt: '2020-01-01T09:00:00',
                        appealStatus: 'REQUESTED', appealReason: '합성 이의제기 안내 문구입니다.', appealCount: 1,
                        requestedAction: 'REVIEW', evidenceUrl: 'https://evidence.example.invalid/synthetic-reference', adminMemo: '',
                        postId: 99702, reporterId: 99703, description: '합성 신고 설명', adminAction: null, handledBy: null, handledAt: null };
                    const panel = '[data-testid="admin-reports-panel"]', drawer = '[data-testid="admin-report-detail-drawer"]';
                    let phase: 'populated' | 'error' | 'empty' = 'populated';
                    let detailError = false, holdDetailError = false, writes = 0, listPending = 0, detailPending = 0;
                    let releaseList!: () => void, releaseDetail!: () => void;
                    let releaseLateError!: () => void;
                    const listGate = new Cypress.Promise<void>((resolve) => { releaseList = resolve; });
                    const detailGate = new Cypress.Promise<void>((resolve) => { releaseDetail = resolve; });
                    const lateErrorGate = new Cypress.Promise<void>((resolve) => { releaseLateError = resolve; });
                    const findings: string[] = [], observations: Array<Record<string, unknown>> = [];
                    const responses: Array<{ state: string; status: number }> = [];
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/admin-reports-${id}.json`, {
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
                            && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) {
                            req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
                        }
                    });
                    cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    cy.intercept('**/auth/**', { statusCode: 503, body: {} });
                    cy.intercept('GET', '**/auth/mypage*', { statusCode: 200, body: { success: true, data: profile } });
                    cy.intercept('GET', '**/api/admin/stats*', { statusCode: 200, body: { success: true, data: { totalUsers: 1, totalPosts: 0, totalMates: 0 } } });
                    cy.intercept('GET', '**/api/admin/users*', { statusCode: 200, body: { success: true, data: [] } }).as('users');
                    cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
                    cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
                    cy.intercept('GET', '**/api/admin/reports?*', (req) => {
                        const state = phase;
                        listPending++;
                        req.alias = `reports-${state}`;
                        const reply = () => {
                            const status = state === 'error' ? 503 : 200;
                            responses.push({ state, status });
                            req.reply({ statusCode: status, body: state === 'error' ? { message: 'synthetic failure' }
                                : { success: true, data: { content: state === 'empty' ? [] : [report], totalElements: state === 'empty' ? 0 : 1,
                                    totalPages: 1, size: 100, number: 0, last: true } } });
                        };
                        return state === 'populated' ? listGate.then(reply) : reply();
                    });
                    cy.intercept('GET', '**/api/admin/reports/99701', (req) => {
                        const failed = detailError, delayed = holdDetailError;
                        detailPending++;
                        req.alias = failed ? delayed ? 'detail-late-error' : 'detail-error' : 'detail-data';
                        const reply = () => {
                            responses.push({ state: failed ? 'detail-error' : 'detail-data', status: failed ? 503 : 200 });
                            req.reply({ statusCode: failed ? 503 : 200, body: failed ? { message: 'synthetic detail failure' }
                                : { success: true, data: report } });
                        };
                        return failed ? delayed ? lateErrorGate.then(reply) : reply() : detailGate.then(reply);
                    });
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    cy.then(() => Cypress.automation('remote:debugger:protocol', {
                        command: 'Network.setCacheDisabled', params: { cacheDisabled: true },
                    }));
                    const visit = () => {
                        cy.visit('/admin', { onBeforeLoad(win) {
                            win.localStorage.clear(); win.sessionStorage.clear();
                            seedCypressAuthState(win, profile, undefined, { theme });
                            win.document.documentElement.style.fontSize = `${font}px`;
                            win.document.documentElement.style.scrollBehavior = 'auto';
                        } });
                        cy.wait('@users');
                        cy.get('[data-testid="admin-tab-reports"]').then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get('[data-testid="admin-tab-reports"]').click();
                        cy.get(panel, { timeout: 20000 }).should('exist');
                    };
                    const capture = (state: string, selector = panel) => {
                        if (selector === panel) cy.get(panel).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                            const header = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
                            win.scrollBy({ top: el.getBoundingClientRect().top - Math.max(header?.bottom ?? 0, 80) - 16, behavior: 'instant' });
                        });
                        cy.get(selector).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(win.localStorage.getItem('kbo-theme')).to.equal(theme);
                            expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                            observations.push({ state, text: el.innerText.replace(/\s+/g, ' ').trim() });
                            if (state === 'detail-data') {
                                const title = el.querySelector('h2 span span')!;
                                const background = win.getComputedStyle(el).backgroundColor;
                                const titleColor = win.getComputedStyle(title).color;
                                observations.push({ state: 'drawer-colors', background, titleColor,
                                    inheritsDark: Boolean(el.closest('.dark')), rootDark: doc.documentElement.classList.contains('dark') });
                                expect(el.classList.contains('dark')).to.equal(true);
                                expect(background).to.equal('rgb(15, 23, 42)');
                                expect(titleColor).to.equal('rgb(255, 255, 255)');
                                if (background === titleColor) findings.push('drawer title equals background color');
                            }
                            if (Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > doc.documentElement.clientWidth + 1) findings.push(`${state}: document overflow`);
                        });
                        cy.screenshot(`admin-reports-${id}-${state}`, { capture: 'viewport' });
                        cy.then(persist);
                    };
                    const measure = (selector: string) => cy.get(selector).each(($el) => {
                        const el = $el[0], rect = el.getBoundingClientRect();
                        observations.push({ control: el.getAttribute('data-testid') ?? el.getAttribute('aria-label'), width: rect.width, height: rect.height });
                        // Ignore subpixel transform rounding, not actual small controls.
                        if (rect.width < 43.99 || rect.height < 43.99) findings.push(`${el.getAttribute('data-testid') ?? el.getAttribute('aria-label')}: below44px`);
                    });
                    visit();
                    cy.wrap(null).should(() => expect(listPending).to.be.greaterThan(0));
                    cy.contains(`${panel} [role="status"]`, '신고 목록 로딩 중...').should('exist');
                    capture('list-loading'); cy.then(() => releaseList());
                    cy.wait('@reports-populated').its('response.statusCode').should('equal', 200);
                    cy.get('[data-testid="admin-report-row-99701"]').should('exist');
                    measure(`${panel} select, ${panel} input, ${panel} button`);
                    capture('list-data');
                    // Row click opens only the read-only detail GET, not its action buttons.
                    cy.get('[data-testid="admin-report-row-99701"] td').first().click();
                    cy.wrap(null).should(() => expect(detailPending).to.equal(1));
                    cy.contains(drawer, '상세 정보를 불러오는 중...').should('exist');
                    capture('detail-loading', drawer); cy.then(() => releaseDetail());
                    cy.wait('@detail-data').its('response.statusCode').should('equal', 200);
                    cy.contains(drawer, report.postPreview).should('exist');
                    measure(`${drawer} button`); capture('detail-data', drawer);
                    cy.get(`${drawer} button[aria-label="닫기"]`).click();
                    cy.get(drawer).should('not.exist');
                    cy.then(() => { detailError = true; });
                    cy.get('[data-testid="admin-report-row-99701"] td').first().click();
                    cy.wait('@detail-error').its('response.statusCode').should('equal', 503);
                    cy.get('[data-testid="admin-report-detail-error"]').should('contain.text', '신고 상세를 불러오는데 실패했습니다.');
                    cy.contains(drawer, '상세 정보를 찾을 수 없습니다.').should('not.exist');
                    cy.get(`${drawer} [data-testid^="admin-report-action-"]`).should('not.exist');
                    for (const action of ['review', 'accept', 'reject', 'retry-anonymization']) {
                        cy.get(`${drawer} [data-testid="admin-report-appeal-${action}"]`).should('not.exist');
                    }
                    capture('detail-error', drawer);
                    cy.get(`${drawer} button[aria-label="닫기"]`).click();
                    cy.then(() => { detailError = false; });
                    cy.get('[data-testid="admin-report-row-99701"] td').first().click();
                    cy.wait('@detail-data').its('response.statusCode').should('equal', 200);
                    cy.contains(drawer, report.postPreview).should('exist');
                    cy.get('[data-testid="admin-report-detail-error"]').should('not.exist');
                    capture('detail-recovered', drawer);
                    cy.get(`${drawer} button[aria-label="닫기"]`).click();
                    cy.then(() => { detailError = true; holdDetailError = true; });
                    cy.get('[data-testid="admin-report-row-99701"] td').first().click();
                    cy.wrap(null).should(() => expect(detailPending).to.equal(4));
                    cy.contains(drawer, '상세 정보를 불러오는 중...').should('exist');
                    cy.get(`${drawer} button[aria-label="닫기"]`).click();
                    cy.then(() => { detailError = false; holdDetailError = false; });
                    cy.get('[data-testid="admin-report-row-99701"] td').first().click();
                    cy.wait('@detail-data').its('response.statusCode').should('equal', 200);
                    cy.contains(drawer, report.postPreview).should('exist');
                    cy.then(() => releaseLateError());
                    cy.wait('@detail-late-error').its('response.statusCode').should('equal', 503);
                    cy.get('[data-testid="admin-report-detail-error"]').should('not.exist');
                    cy.get('[data-testid="admin-report-action-dismiss"]').should('exist');
                    capture('detail-late-error-isolated', drawer);
                    cy.get(`${drawer} button[aria-label="닫기"]`).click();
                    cy.then(() => { phase = 'error'; }); visit();
                    cy.wait('@reports-error').its('response.statusCode').should('equal', 503);
                    cy.get('[data-testid="admin-error-message"]').should('exist');
                    cy.get('[data-testid="admin-reports-error"]').should('contain.text', '신고 목록을 불러오는데 실패했습니다.');
                    cy.contains(panel, '신고 케이스가 없습니다.').should('not.exist');
                    cy.get('[data-testid="admin-error-message"]').then(($el) => {
                        const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                        const header = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
                        win.scrollBy({ top: el.getBoundingClientRect().top - Math.max(header?.bottom ?? 0, 80) - 16, behavior: 'instant' });
                    });
                    cy.screenshot(`admin-reports-${id}-list-error-alert`, { capture: 'viewport' });
                    capture('list-error');
                    cy.get('[data-testid="admin-reports-error"]').then(($el) => {
                        const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                        const region = el.closest<HTMLElement>('[data-testid="admin-reports-table-region"]')!;
                        el.scrollIntoView({ block: 'center', behavior: 'instant' });
                        const header = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
                        win.scrollBy({ top: el.getBoundingClientRect().top - Math.max(header?.bottom ?? 0, 80) - 16, behavior: 'instant' });
                        const node = el.firstChild!, text = node.textContent!, word = '실패했습니다.';
                        const range = doc.createRange();
                        range.setStart(node, text.indexOf(word)); range.setEnd(node, text.indexOf(word) + word.length);
                        const wordLines = range.getClientRects().length;
                        observations.push({ state: 'local-error-region', text: el.textContent,
                            width: region.clientWidth, height: region.clientHeight, scrollHeight: region.scrollHeight, wordLines });
                        expect(wordLines, 'whole final error word').to.equal(1);
                    });
                    cy.screenshot(`admin-reports-${id}-list-error-message`, { capture: 'viewport' });
                    cy.then(persist);
                    cy.then(() => { phase = 'empty'; }); visit();
                    cy.wait('@reports-empty').its('response').should((response) => {
                        expect(response?.statusCode).to.equal(200); expect(response?.body.data.content).to.deep.equal([]);
                    });
                    cy.contains(`${panel} [role="status"]`, '신고 케이스가 없습니다.').should('exist');
                    cy.get('[data-testid="admin-reports-error"]').should('not.exist');
                    capture('list-empty');
                    cy.then(() => { expect(writes).to.equal(0); observations.push({ finished: true }); });
                    cy.then(persist);
                    cy.then(() => expect(findings, 'Reports design findings').to.deep.equal([]));
                });
            }
        }
    }
});
