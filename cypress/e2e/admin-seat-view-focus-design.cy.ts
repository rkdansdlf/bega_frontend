/// <reference types="cypress" />

import type { AdminSeatView } from '../../src/types/admin';
import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

// Focus only: never activate approval, classification, reward or memo submission.
describe('Admin seat-view detail forward keyboard and return focus', () => {
    for (const role of ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] as const) {
        for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
            it(`${role} / ${width}px / ${font}px / ${theme}`, () => {
                const id = `${role}-${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
                expect(new URL(origin).hostname).to.equal('127.0.0.1');
                const viewer = { id: 950097, email: 'seat-focus@example.invalid', name: '합성 관리자', handle: 'design_seat_focus',
                    role, favoriteTeam: null, profileImageUrl: null, hasPassword: true };
                const seat: AdminSeatView = { id: 99801, diaryId: null, userId: 99890, photoUrl: null,
                    storagePath: 'synthetic/not-a-real-object', sourceType: 'DIRECT', aiSuggestedLabel: null,
                    aiConfidence: null, aiReason: null, userSelected: true, moderationStatus: 'PENDING', adminLabel: null,
                    adminMemo: null, reviewedBy: null, reviewedAt: null, rewardGranted: false, stadium: '합성 검증 공간',
                    section: '합성 구역', block: null, seatRow: null, seatNumber: null, diaryDate: null,
                    ticketVerified: false, ticketVerifiedAt: null, rating: 3,
                    comment: '실제 좌석 정보가 아닌 합성 제출 내용입니다.', tags: ['합성 태그'] };
                const mutations: string[] = [], unexpectedReads: string[] = [], findings: string[] = [];
                const observations: Array<Record<string, unknown>> = [], detailStatuses: number[] = [];
                let foreignBlocked = 0, usersReplies = 0, listReplies = 0, detailRequests = 0, finished = false;
                let detailFailure = false, release!: () => void;
                const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
                const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/seat-focus-${id}.json`, {
                    role, width, font, requestedTheme: theme, foreignBlocked, usersReplies, listReplies, detailRequests,
                    detailStatuses, mutations, unexpectedReads, observations, findings, finished,
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
                    expect(Array.from(url.searchParams.entries()).length).to.be.at.most(1);
                    expect(Array.from(url.searchParams.entries()).every(([key, value]) => key === 'search' && value === '')).to.equal(true);
                    usersReplies++; req.alias = 'focus-users'; req.reply({ statusCode: 200, body: { success: true, data: [] } });
                });
                cy.intercept('GET', `${origin}/api/dm/rooms/my`, { statusCode: 200, body: { success: true, data: [] } });
                cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { statusCode: 200, body: { success: true, data: 0 } });
                cy.intercept('GET', `${origin}/api/notifications/my*`, (req) => {
                    const url = new URL(req.url); expect(url.pathname).to.equal('/api/notifications/my'); expect(url.search).to.equal('');
                    req.reply({ statusCode: 200, body: [] });
                });
                cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { statusCode: 200, body: 0 });
                cy.intercept('GET', `${origin}/api/admin/seat-views?*`, (req) => {
                    const url = new URL(req.url); expect(url.pathname).to.equal('/api/admin/seat-views');
                    expect(Array.from(url.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b)))
                        .to.deep.equal([['page', '0'], ['size', '20']]);
                    listReplies++; req.alias = 'focus-seats';
                    req.reply({ statusCode: 200, body: { success: true, data: { content: [seat], totalElements: 1,
                        totalPages: 1, size: 20, number: 0, last: true } } });
                });
                cy.intercept('GET', `${origin}/api/admin/seat-views/99801`, (req) => {
                    expect(new URL(req.url).search).to.equal(''); detailRequests++; const failed = detailFailure;
                    req.alias = failed ? 'focus-detail-error' : 'focus-detail-data';
                    const reply = () => {
                        const status = failed ? 503 : 200; detailStatuses.push(status);
                        req.reply({ statusCode: status, body: failed ? {} : { success: true, data: seat } });
                    };
                    return failed ? reply() : gate.then(reply);
                });
                const drawer = '[data-testid="admin-seat-view-detail-drawer"]', trigger = '[data-testid="admin-seat-view-detail-99801"]';
                const controls = 'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]';
                const align = (selector: string) => cy.get(selector).then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                    const header = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
                    win.scrollBy({ top: el.getBoundingClientRect().top - Math.max(header?.bottom ?? 0, 80) - 16, behavior: 'instant' });
                });
                const settle = () => {
                    cy.get(drawer).then(async ($el) => {
                        await $el[0].ownerDocument.fonts.ready;
                        await Promise.all($el[0].getAnimations().map((a) => a.finished.catch(() => undefined)));
                    });
                    cy.get(drawer).should(($el) => {
                        const el = $el[0], win = el.ownerDocument.defaultView!, transform = win.getComputedStyle(el).transform;
                        expect(Math.abs(el.getBoundingClientRect().right - win.innerWidth)).to.be.lessThan(0.5);
                        expect(transform === 'none' || Math.abs(new win.DOMMatrixReadOnly(transform).m41) < 0.1).to.equal(true);
                    });
                };
                const cycle = (state: string, expected: string[], steps: number) => {
                    let arrivals = 0;
                    cy.get(drawer).find(controls).should('have.length', expected.length);
                    for (let index = 0; index < steps; index++) {
                        cy.press(Cypress.Keyboard.Keys.TAB);
                        cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
                        cy.get(drawer).then(($el) => {
                            const doc = $el[0].ownerDocument, win = doc.defaultView!, active = doc.activeElement as HTMLElement;
                            const inside = $el[0].contains(active), r = active.getBoundingClientRect(), style = win.getComputedStyle(active);
                            const actual = active.getAttribute('aria-label') === '닫기' ? 'close' : active.getAttribute('data-testid') ?? active.id;
                            const [header, body, footer] = Array.from($el[0].children);
                            // Only the actual PlainDialog title/body/footer regions may be browser-implicit Tab stops.
                            const knownScrollRegion = Boolean(header?.querySelector('button[aria-label="닫기"]'))
                                && [header.firstElementChild, body, footer].includes(active);
                            const scrollRegion = active.tagName === 'DIV' && inside && knownScrollRegion
                                && !active.hasAttribute('tabindex') && /auto|scroll/.test(style.overflowY)
                                && active.scrollHeight > active.clientHeight;
                            const expectedId = expected[arrivals % expected.length], focusVisible = active.matches(':focus-visible');
                            const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                            const centerClear = Boolean(hit && (hit === active || active.contains(hit))), rendered = Cypress.dom.isVisible(active);
                            // Rounded corners are not hit targets. Sample inset edge midpoints on buttons, not oversized scroll regions/textareas.
                            const insetX = Math.min(8, r.width / 4), insetY = Math.min(8, r.height / 4);
                            const buttonPoints = active.tagName === 'BUTTON' ? [
                                { name: 'left-middle', x: r.left + insetX, y: r.top + r.height / 2 },
                                { name: 'right-middle', x: r.right - insetX, y: r.top + r.height / 2 },
                                { name: 'top-middle', x: r.left + r.width / 2, y: r.top + insetY },
                                { name: 'bottom-middle', x: r.left + r.width / 2, y: r.bottom - insetY },
                            ].map((point) => {
                                const target = doc.elementFromPoint(point.x, point.y);
                                return { ...point, clear: Boolean(target && (target === active || active.contains(target))),
                                    hit: target?.getAttribute('data-testid') ?? target?.closest('[data-testid]')?.getAttribute('data-testid') ?? target?.tagName };
                            }) : [];
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(win.localStorage.getItem('kbo-theme')).to.equal(theme);
                            expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                            observations.push({ state, step: index + 1, actual, expectedId, inside, scrollRegion,
                                knownScrollRegion, explicitTabIndex: active.getAttribute('tabindex'), focusVisible,
                                centerClear, buttonPoints, rendered, left: r.left, right: r.right, top: r.top, bottom: r.bottom,
                                width: r.width, height: r.height, innerWidth: win.innerWidth, innerHeight: win.innerHeight });
                            if (!inside || (!scrollRegion && actual !== expectedId)) findings.push(`${state}-Tab${index + 1}: unexpected focus target`);
                            if (!scrollRegion) arrivals++;
                            if (!rendered || !centerClear || !focusVisible) findings.push(`${state}-Tab${index + 1}-${actual}: focus obscured or not visible`);
                            if (buttonPoints.some((point) => !point.clear)) findings.push(`${state}-Tab${index + 1}-${actual}: inset button edge covered`);
                        });
                        cy.then(persist);
                    }
                    cy.then(() => { if (arrivals < expected.length + 1) findings.push(`${state}: insufficient arrivals for complete cycle`); });
                    cy.screenshot(`seat-focus-${id}-${state}-cycle-end`, { capture: 'viewport', disableTimersAndAnimations: false });
                    cy.press(Cypress.Keyboard.Keys.ESC); cy.get(drawer).should('not.exist');
                    cy.get(trigger).then(($el) => {
                        const doc = $el[0].ownerDocument, restored = doc.activeElement === $el[0], r = $el[0].getBoundingClientRect();
                        const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                        const centerClear = Boolean(hit && (hit === $el[0] || $el[0].contains(hit)));
                        observations.push({ state: `${state}-escape-return`, restored, centerClear });
                        if (!restored || !centerClear) findings.push(`${state}-Escape: trigger focus not restored or covered`);
                    });
                    cy.screenshot(`seat-focus-${id}-${state}-returned`, { capture: 'viewport', disableTimersAndAnimations: false });
                };
                cy.viewport(width, width === 1280 ? 900 : 844);
                cy.visit('/admin', { onBeforeLoad(win) {
                    win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
                    win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
                } });
                cy.wait('@focus-users'); align('[data-testid="admin-tab-seat-views"]');
                cy.get('[data-testid="admin-tab-seat-views"]').click({ scrollBehavior: false }); cy.wait('@focus-seats');
                align(trigger); cy.get(trigger).focus().click({ scrollBehavior: false });
                cy.get(drawer).should('be.visible').and('contain.text', '상세 정보를 불러오는 중...');
                cy.get(drawer).should(($el) => expect($el[0].ownerDocument.activeElement).to.equal($el[0]));
                cy.then(() => release()); cy.wait('@focus-detail-data').its('response.statusCode').should('equal', 200);
                cy.contains(drawer, seat.comment!).should('exist'); settle();
                cycle('data', ['close', 'admin-seat-view-admin-memo', 'admin-seat-view-action-approve', 'admin-seat-view-action-ticket',
                    'admin-seat-view-action-other', 'admin-seat-view-action-inappropriate'], 12);
                cy.then(() => { detailFailure = true; });
                cy.get(trigger).click({ scrollBehavior: false }); cy.wait('@focus-detail-error').its('response.statusCode').should('equal', 503);
                cy.get('[data-testid="admin-seat-view-detail-error"]').should('contain.text', '시야뷰 후보 상세를 불러오는데 실패했습니다.');
                cy.get(drawer).find('[data-testid^="admin-seat-view-action-"]').should('not.exist'); settle();
                cy.get(drawer).should(($el) => expect($el[0].ownerDocument.activeElement).to.equal($el[0]));
                cycle('error', ['close'], 6);
                cy.then(() => {
                    expect(mutations).to.deep.equal([]); expect(unexpectedReads).to.deep.equal([]);
                    expect(usersReplies).to.equal(1); expect(listReplies).to.equal(1); expect(detailRequests).to.equal(2);
                    expect(detailStatuses).to.deep.equal([200, 503]); expect(observations).to.have.length(20); finished = true;
                }); cy.then(persist);
                cy.then(() => expect(findings, 'Seat-view detail focus findings').to.deep.equal([]));
            });
        }
    }
});
