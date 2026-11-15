/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

// Read-only report detail: Shift-Tab and Escape only; never activate a management action.
describe('Report detail native Shift-Tab and return focus', () => {
    for (const role of ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] as const) {
        for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
            it(`${role} / ${width}px / ${font}px / ${theme}`, () => {
                const id = `${role}-${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
                expect(new URL(origin).hostname).to.equal('127.0.0.1');
                const viewer = { id: 950095, email: 'menu-design@example.invalid', name: '합성 관리자', handle: 'design_menu_admin',
                    role, favoriteTeam: null, profileImageUrl: null, hasPassword: true };
                const mutations: string[] = [], unexpectedReads: string[] = [], findings: string[] = [];
                const observations: Array<Record<string, unknown>> = [];
                const reverseKeys: Array<{ key: string; shift: boolean; trusted: boolean }> = [];
                let foreignBlocked = 0, usersReplies = 0, reportReplies = 0, detailReplies = 0, finished = false;
                const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/report-reverse-${id}.json`, {
                    role, width, font, requestedTheme: theme, foreignBlocked, usersReplies, reportReplies, detailReplies, mutations, unexpectedReads, observations, reverseKeys, findings, finished,
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
                    usersReplies++; req.alias = 'menu-users'; req.reply({ statusCode: 200, body: { success: true, data: [] } });
                });
                cy.intercept('GET', `${origin}/api/dm/rooms/my`, { statusCode: 200, body: { success: true, data: [] } });
                cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { statusCode: 200, body: { success: true, data: 0 } });
                cy.intercept('GET', `${origin}/api/notifications/my*`, (req) => {
                    const url = new URL(req.url); expect(url.pathname).to.equal('/api/notifications/my'); expect(url.search).to.equal('');
                    req.reply({ statusCode: 200, body: [] });
                });
                cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { statusCode: 200, body: 0 });

                const drawer = '[data-testid="admin-report-detail-drawer"]', trigger = '[data-testid="admin-report-detail-99701"]';
                const report = { id: 99701, status: 'PENDING', reason: 'OTHER', reporterHandle: 'synthetic-reporter',
                    postPreview: '실제 게시물이 아닌 합성 신고 키보드 검증입니다.', createdAt: '2020-01-01T09:00:00',
                    appealStatus: 'REQUESTED', appealReason: '합성 이의제기', appealCount: 1, requestedAction: 'REVIEW',
                    evidenceUrl: null, adminMemo: '', postId: 99702, reporterId: 99703, description: '합성 설명',
                    adminAction: null, handledBy: null, handledAt: null };
                let release!: () => void;
                const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
                cy.intercept('GET', `${origin}/api/admin/reports?*`, (req) => {
                    const url = new URL(req.url); expect(url.pathname).to.equal('/api/admin/reports');
                    expect(Array.from(url.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b)))
                        .to.deep.equal([['page', '0'], ['size', '100']]);
                    reportReplies++; req.alias = 'focus-reports';
                    req.reply({ statusCode: 200, body: { success: true, data: { content: [report], totalElements: 1,
                        totalPages: 1, size: 100, number: 0, last: true } } });
                });
                cy.intercept('GET', `${origin}/api/admin/reports/99701`, (req) => {
                    expect(new URL(req.url).search).to.equal(''); detailReplies++; req.alias = 'focus-detail';
                    return gate.then(() => req.reply({ statusCode: 200, body: { success: true, data: report } }));
                });
                const align = (selector: string) => cy.get(selector).then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                    const header = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
                    win.scrollBy({ top: el.getBoundingClientRect().top - Math.max(header?.bottom ?? 0, 80) - 16, behavior: 'instant' });
                });
                cy.viewport(width, width === 1280 ? 900 : 844);
                cy.visit('/admin', { onBeforeLoad(win) {
                    win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
                    win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
                } });
                cy.wait('@menu-users'); align('[data-testid="admin-tab-reports"]');
                cy.get('[data-testid="admin-tab-reports"]').click({ scrollBehavior: false }); cy.wait('@focus-reports');
                align(trigger); cy.get(trigger).focus().click({ scrollBehavior: false });
                cy.get(drawer).should('be.visible').and('contain.text', '상세 정보를 불러오는 중...');
                cy.get(drawer).should(($el) => {
                    expect($el[0].ownerDocument.activeElement).to.equal($el[0]);
                });
                cy.then(() => release()); cy.wait('@focus-detail').its('response.statusCode').should('equal', 200);
                cy.contains(drawer, report.postPreview).should('exist');
                cy.get(drawer).then(async ($el) => {
                    await $el[0].ownerDocument.fonts.ready;
                    await Promise.all($el[0].getAnimations().map((a) => a.finished.catch(() => undefined)));
                });
                cy.get(drawer).should(($el) => {
                    const el = $el[0], win = el.ownerDocument.defaultView!, r = el.getBoundingClientRect();
                    const transform = win.getComputedStyle(el).transform;
                    expect(Math.abs(r.right - win.innerWidth), 'drawer reaches final right edge').to.be.lessThan(0.5);
                    expect(transform === 'none' || Math.abs(new win.DOMMatrixReadOnly(transform).m41) < 0.1,
                        'drawer translation has settled').to.equal(true);
                });
                const focusables = 'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]';
                cy.get(drawer).find(focusables).should('have.length', 10);
                const expected = ['admin-report-action-warning', 'admin-report-action-require-modification',
                    'admin-report-action-restore', 'admin-report-action-dismiss', 'admin-report-action-take-down',
                    'admin-report-appeal-reject', 'admin-report-appeal-accept', 'admin-report-appeal-review',
                    'admin-report-admin-memo', 'close'];
                cy.document().then((doc) => {
                    doc.addEventListener('keydown', (event) => {
                        if (event.key === 'Tab') reverseKeys.push({ key: event.key, shift: event.shiftKey, trusted: event.isTrusted });
                    }, true);
                });
                let controlArrivals = 0;
                const measure = (step: number) => cy.get(drawer).then(($el) => {
                    const doc = $el[0].ownerDocument, win = doc.defaultView!, active = doc.activeElement as HTMLElement;
                    const inside = $el[0].contains(active), r = active.getBoundingClientRect();
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(win.localStorage.getItem('kbo-theme')).to.equal(theme);
                    expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                    const actual = active.getAttribute('aria-label') === '닫기' ? 'close' : active.getAttribute('data-testid') ?? active.id;
                    const style = win.getComputedStyle(active);
                    const [header, body, footer] = Array.from($el[0].children);
                    const knownScrollRegion = Boolean(header?.querySelector('button[aria-label="닫기"]'))
                        && [header?.firstElementChild, body, footer].includes(active);
                    const scrollRegion = active.tagName === 'DIV' && inside && knownScrollRegion
                        && !active.hasAttribute('tabindex') && /auto|scroll/.test(style.overflowY)
                        && active.scrollHeight > active.clientHeight;
                    const expectedId = expected[controlArrivals % expected.length];
                    const x = r.left + r.width / 2, y = r.top + r.height / 2, hit = doc.elementFromPoint(x, y);
                    const centerClear = Boolean(hit && (hit === active || active.contains(hit)));
                    const insetX = Math.min(8, r.width / 4), insetY = Math.min(8, r.height / 4);
                    // Inset edge midpoints avoid rounded corners; do not demand full textarea/scroll-region visibility.
                    const buttonPoints = active.tagName === 'BUTTON' ? [
                        { name: 'left-middle', x: r.left + insetX, y: r.top + r.height / 2 },
                        { name: 'right-middle', x: r.right - insetX, y: r.top + r.height / 2 },
                        { name: 'top-middle', x: r.left + r.width / 2, y: r.top + insetY },
                        { name: 'bottom-middle', x: r.left + r.width / 2, y: r.bottom - insetY },
                    ].map((point) => {
                        const target = doc.elementFromPoint(point.x, point.y);
                        return { ...point, inViewport: point.x >= 0 && point.x < win.innerWidth && point.y >= 0 && point.y < win.innerHeight,
                            clear: Boolean(target && (target === active || active.contains(target))),
                            hit: target?.getAttribute('data-testid') ?? target?.closest('[data-testid]')?.getAttribute('data-testid') ?? target?.tagName ?? null };
                    }) : [];
                    const focusVisible = active.matches(':focus-visible'), rendered = Cypress.dom.isVisible(active);
                    observations.push({ step, expectedId, actual, scrollRegion, knownScrollRegion,
                        explicitTabIndex: active.getAttribute('tabindex'), inside, centerClear, rendered, buttonPoints, width: r.width, height: r.height,
                        left: r.left, right: r.right, top: r.top, bottom: r.bottom, innerWidth: win.innerWidth, innerHeight: win.innerHeight,
                        focusVisible, hit: hit?.getAttribute('data-testid') ?? hit?.tagName ?? null });
                    if (!inside || (!scrollRegion && actual !== expectedId)) findings.push(`Tab${step}: unexpected focus target`);
                    if (!scrollRegion) controlArrivals++;
                    if (!rendered || !centerClear || !focusVisible) findings.push(`Tab${step}-${actual}: focus center covered or not visible`);
                    if (buttonPoints.some((point) => !point.clear)) findings.push(`Tab${step}-${actual}: inset edge not attributable to button`);
                });
                for (let index = 0; index < 14; index++) {
                    // Native Chromium input: Shift modifier=8. Recorded DOM events must be trusted and shifted.
                    cy.then(async () => {
                        const params = { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, modifiers: 8 };
                        await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type: 'keyDown' } });
                        await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type: 'keyUp' } });
                    });
                    // Sample after native focus/scroll layout has reached subsequent frames; do not scroll or refocus.
                    cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
                    measure(index + 1);
                    cy.then(persist);
                }
                cy.screenshot(`report-reverse-${id}-cycle-end`, { capture: 'viewport', disableTimersAndAnimations: false });
                cy.press(Cypress.Keyboard.Keys.ESC);
                cy.get(drawer).should('not.exist');
                cy.get(trigger).then(($el) => {
                    const doc = $el[0].ownerDocument, restored = doc.activeElement === $el[0], r = $el[0].getBoundingClientRect();
                    const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                    const centerClear = Boolean(hit && (hit === $el[0] || $el[0].contains(hit)));
                    observations.push({ state: 'escape-return', restored, centerClear });
                    if (!restored || !centerClear) findings.push('Escape: trigger focus not restored or covered');
                });
                cy.screenshot(`report-reverse-${id}-returned`, { capture: 'viewport', disableTimersAndAnimations: false });
                cy.then(() => {
                    expect(mutations).to.deep.equal([]); expect(unexpectedReads).to.deep.equal([]);
                    expect(usersReplies).to.equal(1); expect(reportReplies).to.equal(1); expect(detailReplies).to.equal(1);
                    expect(observations).to.have.length(15);
                    expect(reverseKeys).to.have.length(14);
                    expect(reverseKeys.every((event) => event.key === 'Tab' && event.shift && event.trusted)).to.equal(true);
                    if (controlArrivals < 11) findings.push('insufficient control arrivals to prove a complete reverse cycle');
                    finished = true;
                }); cy.then(persist);
                cy.then(() => expect(findings, 'Report detail reverse-Tab design findings').to.deep.equal([]));
            });
        }
    }
});
