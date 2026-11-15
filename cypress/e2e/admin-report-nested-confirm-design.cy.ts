/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

// Only open terminal confirmation and cancel it; never activate its final confirm control.
describe('Report nested confirmation cancellation design', () => {
    for (const role of ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] as const) {
        for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
            it(`${role} / ${width}px / ${font}px / ${theme}`, () => {
                const id = `${role}-${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
                expect(new URL(origin).hostname).to.equal('127.0.0.1');
                const viewer = { id: 950095, email: 'menu-design@example.invalid', name: '합성 관리자', handle: 'design_menu_admin',
                    role, favoriteTeam: null, profileImageUrl: null, hasPassword: true };
                let initialBodyOverflow = '';
                const mutations: string[] = [], unexpectedReads: string[] = [], findings: string[] = [];
                const observations: Array<Record<string, unknown>> = [];
                let foreignBlocked = 0, usersReplies = 0, reportReplies = 0, detailReplies = 0, finished = false;
                const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/report-nested-${id}.json`, {
                    role, width, font, requestedTheme: theme, foreignBlocked, usersReplies, reportReplies, detailReplies, mutations, unexpectedReads, observations, findings, finished,
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
                cy.document().then((doc) => { initialBodyOverflow = doc.body.style.overflow; });
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
                const nested = '[data-testid="confirm-dialog"]', appeal = '[data-testid="admin-report-appeal-accept"]';
                const cancel = '[data-testid="confirm-dialog-cancel"]';
                const openConfirmation = () => {
                    cy.get(appeal).then(($el) => $el[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
                    cy.get(appeal).focus().click({ scrollBehavior: false });
                    cy.get(nested).should('be.visible').and('contain.text', '이의제기 종결 확인');
                    cy.get(nested).find('button:not([disabled])').should('have.length', 3);
                    cy.get(nested).should(($el) => {
                        expect($el[0].ownerDocument.activeElement).to.equal($el[0].querySelector('button[aria-label="닫기"]'));
                    });
                    cy.get(nested).then(($el) => $el[0].ownerDocument.fonts.ready);
                };
                const surface = (state: string) => cy.get(nested).then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, parent = doc.querySelector<HTMLElement>(drawer)!;
                    const r = el.getBoundingClientRect(), title = el.querySelector('h2')!;
                    const dark = Boolean(el.closest('.dark'));
                    const background = win.getComputedStyle(el).backgroundColor;
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(win.localStorage.getItem('kbo-theme')).to.equal(theme);
                    expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                    observations.push({ state, dark, background,
                        titleColor: win.getComputedStyle(title).color, width: r.width, height: r.height,
                        nestedZ: win.getComputedStyle(el.parentElement!.parentElement!).zIndex,
                        parentZ: win.getComputedStyle(parent.parentElement!.parentElement!).zIndex,
                        bodyOverflow: doc.body.style.overflow, initialBodyOverflow });
                    // This is the measured white-surface regression, not an ancestry-only or contrast claim.
                    if (background === 'rgb(255, 255, 255)') findings.push(`${state}: white confirmation surface in Admin dark-only flow`);
                });
                openConfirmation(); surface('cancel-open');
                const order = ['confirm-dialog-cancel', 'confirm-dialog-confirm', 'close'];
                for (let step = 0; step < 6; step++) {
                    cy.press(Cypress.Keyboard.Keys.TAB);
                    cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
                    cy.get(nested).then(($el) => {
                        const doc = $el[0].ownerDocument, win = doc.defaultView!, active = doc.activeElement as HTMLElement;
                        const r = active.getBoundingClientRect(), inside = $el[0].contains(active);
                        const actual = active.getAttribute('aria-label') === '닫기' ? 'close' : active.getAttribute('data-testid');
                        const insetX = Math.min(8, r.width / 4), insetY = Math.min(8, r.height / 4);
                        const points = [
                            { name: 'center', x: r.left + r.width / 2, y: r.top + r.height / 2 },
                            { name: 'left', x: r.left + insetX, y: r.top + r.height / 2 },
                            { name: 'right', x: r.right - insetX, y: r.top + r.height / 2 },
                            { name: 'top', x: r.left + r.width / 2, y: r.top + insetY },
                            { name: 'bottom', x: r.left + r.width / 2, y: r.bottom - insetY },
                        ].map((p) => {
                            const hit = doc.elementFromPoint(p.x, p.y);
                            return { ...p, inViewport: p.x >= 0 && p.x < win.innerWidth && p.y >= 0 && p.y < win.innerHeight,
                                clear: Boolean(hit && (hit === active || active.contains(hit))),
                                hit: hit?.getAttribute('data-testid') ?? hit?.closest('[data-testid]')?.getAttribute('data-testid') ?? hit?.tagName ?? null };
                        });
                        const focusVisible = active.matches(':focus-visible'), rendered = Cypress.dom.isVisible(active);
                        observations.push({ state: 'nested-tab', step: step + 1, expected: order[step % order.length], actual,
                            inside, focusVisible, rendered, width: r.width, height: r.height, points });
                        if (!inside || actual !== order[step % order.length] || !focusVisible || !rendered) findings.push(`Tab${step + 1}: confirmation focus/order mismatch`);
                        if (points.some((p) => !p.clear)) findings.push(`Tab${step + 1}-${actual}: sampled point not attributable to confirmation button`);
                        if (r.width < 43.99 || r.height < 43.99) findings.push(`Tab${step + 1}-${actual}: target below44px`);
                    });
                    cy.then(persist);
                }
                cy.screenshot(`report-nested-${id}-cancel-open`, { capture: 'viewport', disableTimersAndAnimations: false });
                cy.get(cancel).click({ scrollBehavior: false }); cy.get(nested).should('not.exist');
                cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
                cy.document().then((doc) => {
                    const parentPresent = Boolean(doc.querySelector(drawer)), restored = doc.activeElement === doc.querySelector(appeal);
                    observations.push({ state: 'cancel-return', parentPresent, restored, bodyOverflow: doc.body.style.overflow });
                    if (!parentPresent || !restored) findings.push('Cancel: parent detail/focus not retained');
                    if (parentPresent && doc.body.style.overflow !== 'hidden') findings.push('Cancel: parent survives but body scroll lock lost');
                });
                cy.screenshot(`report-nested-${id}-cancel-return`, { capture: 'viewport', disableTimersAndAnimations: false });
                openConfirmation(); surface('escape-open');
                cy.screenshot(`report-nested-${id}-escape-open`, { capture: 'viewport', disableTimersAndAnimations: false });
                cy.press(Cypress.Keyboard.Keys.ESC); cy.get(nested).should('not.exist');
                cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
                cy.document().then((doc) => {
                    const parentPresent = Boolean(doc.querySelector(drawer)), restored = parentPresent && doc.activeElement === doc.querySelector(appeal);
                    const bodyOverflow = doc.body.style.overflow;
                    observations.push({ state: 'escape-return', parentPresent, restored, bodyOverflow, initialBodyOverflow,
                        active: (doc.activeElement as HTMLElement)?.getAttribute('data-testid') ?? doc.activeElement?.tagName });
                    if (!parentPresent || !restored) findings.push('Escape: parent detail/focus not retained');
                    if (parentPresent && bodyOverflow !== 'hidden') findings.push('Escape: parent survives but body scroll lock lost');
                    if (!parentPresent && bodyOverflow !== initialBodyOverflow) findings.push('Escape: scroll-lock style remains after both dialogs closed');
                });
                cy.screenshot(`report-nested-${id}-escape-return`, { capture: 'viewport', disableTimersAndAnimations: false });
                // A second Escape now closes the remaining single parent and releases the final lock.
                cy.press(Cypress.Keyboard.Keys.ESC); cy.get(drawer).should('not.exist');
                cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
                cy.document().then((doc) => {
                    const restored = doc.activeElement === doc.querySelector(trigger), bodyOverflow = doc.body.style.overflow;
                    observations.push({ state: 'parent-escape-return', restored, bodyOverflow, initialBodyOverflow });
                    if (!restored || bodyOverflow !== initialBodyOverflow) findings.push('Parent Escape: original focus/overflow not restored');
                });
                cy.screenshot(`report-nested-${id}-parent-return`, { capture: 'viewport', disableTimersAndAnimations: false });
                cy.then(() => {
                    expect(mutations).to.deep.equal([]); expect(unexpectedReads).to.deep.equal([]);
                    expect(usersReplies).to.equal(1); expect(reportReplies).to.equal(1); expect(detailReplies).to.equal(1);
                    expect(observations).to.have.length(11); finished = true;
                }); cy.then(persist);
                cy.then(() => expect(findings, 'Nested confirmation design findings').to.deep.equal([]));
            });
        }
    }
});
