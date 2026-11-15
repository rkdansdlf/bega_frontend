/// <reference types="cypress" />

const noScrollSelectOptions: Partial<Cypress.SelectOptions> & { scrollBehavior: false } = { scrollBehavior: false };
import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

// Local pending-role UI only. Confirm is measured/focused, never activated.
describe('Admin role confirmation presentation and dismissal', () => {
    const returnOnly = Cypress.expose('roleReturnOnly') === true;
    const residualOnly = Cypress.expose('roleResidualOnly') === true;
    for (const width of returnOnly ? [1280] : [320, 390, 1280]) for (const font of returnOnly || residualOnly ? [32] : [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width} / ${font} / ${theme}`, () => {
            const origin = new URL(String(Cypress.config('baseUrl'))).origin, id = `${width}-${font}-${theme}`;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const viewer = { id: 990781, email: 'role-viewer@example.invalid', name: '합성 최고 관리자', handle: 'synthetic_role_dialog', role: 'ROLE_SUPER_ADMIN', hasPassword: true, favoriteTeam: null, profileImageUrl: null };
            const rows = [
                { ...viewer, createdAt: '2020-01-01T09:00:00', postCount: 0 },
                { id: 990782, email: 'role-member@example.invalid', name: '합성 일반 사용자', role: 'ROLE_USER', favoriteTeam: null, createdAt: '2020-01-02T09:00:00', postCount: 0 },
                { id: 990783, email: 'role-admin@example.invalid', name: '합성 다른 관리자', role: 'ROLE_ADMIN', favoriteTeam: null, createdAt: '2020-01-03T09:00:00', postCount: 0 },
            ];
            const dialog = '[data-testid="admin-role-change-dialog"]', reason = '[data-testid="admin-role-change-reason"]';
            const cancel = '[data-testid="admin-role-change-cancel"]', confirm = '[data-testid="admin-role-change-confirm"]';
            const fallback = '[data-testid="admin-community-role-dialog-fallback"]';
            const trigger = (user: number) => `[data-testid="admin-user-role-trigger-${user}"]`;
            const observations: Array<Record<string, unknown>> = [], findings: string[] = [], writes: string[] = [], unknown: string[] = [];
            const tabs: Array<{ trusted: boolean; shift: boolean }> = [], escapes: boolean[] = [];
            let originalOverflow = '', usersReads = 0, chunkReads = 0, foreign = 0, finished = false;
            let releaseChunk!: () => void;
            const chunkGate = new Cypress.Promise<void>((resolve) => { releaseChunk = resolve; });
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/role-dialog-${id}.json`, { width, font, theme, returnOnly, residualOnly, role: viewer.role, usersReads, chunkReads, foreign, writes, unknown, tabs, escapes, observations, findings, finished });
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url), mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
                if (mutation) writes.push(`${req.method} ${req.url}`);
                if (url.origin !== origin) { foreign++; return req.reply({ forceNetworkError: true }); }
                if (mutation) return req.reply({ statusCode: 503, body: {} });
            });
            cy.intercept('**/api/**', (req) => { unknown.push(`${req.method} ${req.url}`); req.reply({ statusCode: 503, body: {} }); });
            cy.intercept('**/auth/**', (req) => { unknown.push(`${req.method} ${req.url}`); req.reply({ statusCode: 401, body: {} }); });
            cy.intercept('GET', `${origin}/api/auth/mypage`, { body: { success: true, data: toAuthApiUser(viewer) } });
            cy.intercept('GET', `${origin}/api/admin/stats`, { body: { success: true, data: { totalUsers: 3, totalPosts: 0, totalMates: 0 } } });
            cy.intercept('GET', `${origin}/api/admin/users*`, (req) => {
                const url = new URL(req.url); expect(url.pathname).to.equal('/api/admin/users');
                expect(Array.from(url.searchParams.entries()).every(([key, value]) => key === 'search' && value === '')).to.equal(true);
                usersReads++; req.alias = 'users'; req.reply({ body: { success: true, data: rows } });
            });
            cy.intercept('GET', `${origin}/api/dm/rooms/my`, { body: { success: true, data: [] } });
            cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { body: { success: true, data: 0 } });
            cy.intercept('GET', `${origin}/api/notifications/my`, { body: [] });
            cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { body: 0 });
            cy.intercept('GET', `${origin}/assets/AdminRoleChangeDialogContent-*.js*`, (req) => {
                chunkReads++; req.alias = 'role-chunk'; return chunkGate.then(() => req.continue());
            });
            // Deliberate cold-chunk fixture, not a production loading-duration claim.
            cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Network.setCacheDisabled', params: { cacheDisabled: true } }));
            cy.viewport(width, width === 1280 ? 900 : 844); cy.clock(Date.UTC(2099, 0, 2, 12), ['Date']);
            cy.visit('/admin', { onBeforeLoad(win) {
                win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            cy.wait('@users'); cy.get('[data-testid="admin-users-panel"] tbody tr').should('have.length', 3);
            cy.document().then((doc) => {
                originalOverflow = doc.body.style.overflow;
                doc.addEventListener('keydown', (event) => {
                    if (event.key === 'Tab') tabs.push({ trusted: event.isTrusted, shift: event.shiftKey });
                    if (event.key === 'Escape') escapes.push(event.isTrusted);
                });
            });
            const select = (user: number, next: string) => {
                cy.get(trigger(user)).then(($el) => $el[0].scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
                cy.get(trigger(user)).focus().should('have.focus');
                cy.get(trigger(user)).select(next, noScrollSelectOptions);
            };
            const capture = (state: string) => { cy.screenshot(`role-dialog-${id}-${state}`, { capture: 'viewport', disableTimersAndAnimations: false }); cy.then(persist); };
            const sample = (state: string) => {
                cy.document().then((doc) => doc.fonts.ready);
                cy.get(dialog).should('be.visible').then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, r = el.getBoundingClientRect();
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                    expect(doc.body.style.overflow).to.equal('hidden');
                    const controls = Array.from(el.querySelectorAll<HTMLElement>('button,input')).map((node) => {
                        const box = node.getBoundingClientRect(); return { id: node.getAttribute('data-testid') || node.getAttribute('aria-label'), width: box.width, height: box.height };
                    });
                    const words: Array<{ word: string; lines: number; rectangles: number }> = [];
                    const title = el.querySelector('h2')!, walker = doc.createTreeWalker(title, win.NodeFilter.SHOW_TEXT);
                    for (let node = walker.nextNode(); node; node = walker.nextNode()) for (const match of (node.textContent ?? '').matchAll(/\S+/g)) {
                        const range = doc.createRange(); range.setStart(node, match.index!); range.setEnd(node, match.index! + match[0].length);
                        const rectangles = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
                        words.push({ word: match[0], lines: new Set(rectangles.map((rect) => Math.round(rect.top))).size, rectangles: rectangles.length });
                    }
                    const overflow = Array.from(el.querySelectorAll('h2,label,button')).filter((node) => node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 1).map((node) => ({ tag: node.tagName, id: node.getAttribute('data-testid'), width: node.clientWidth, scrollWidth: node.scrollWidth }));
                    const input = el.querySelector<HTMLInputElement>(reason)!;
                    const nativeInputScroll = { clientWidth: input.clientWidth, scrollWidth: input.scrollWidth, scrollLeft: input.scrollLeft, value: input.value };
                    const dark = Boolean(el.closest('.dark')), background = win.getComputedStyle(el).backgroundColor;
                    const reference = doc.createElement('div'); reference.className = 'bg-card'; reference.style.display = 'none';
                    doc.querySelector('[data-testid="admin-route-theme"]')!.append(reference);
                    const expectedBackground = win.getComputedStyle(reference).backgroundColor; reference.remove();
                    expect(expectedBackground).to.match(/^rgba?\(/); expect(expectedBackground).not.to.equal('rgba(0, 0, 0, 0)');
                    observations.push({ state, text: el.innerText, dark, background, expectedBackground, rect: { left: r.left, top: r.top, width: r.width, height: r.height }, controls, words, overflow, nativeInputScroll });
                    if (!dark || background !== expectedBackground) findings.push(`${state}: dialog misses Admin dark-only theme/surface`);
                    if (controls.some((control) => control.width < 44 || control.height < 44)) findings.push(`${state}: controls below44`);
                    if (r.left < -1 || r.right > win.innerWidth + 1 || r.top < -1 || r.bottom > win.innerHeight + 1 || overflow.length) findings.push(`${state}: dialog/control overflow`);
                    if (words.map((word) => word.word).join('|') !== '역할|변경|확인' || words.some((word) => word.lines !== 1)) findings.push(`${state}: title word split/missing/unmeasurable`);
                }); capture(state);
            };
            const assertEntry = (promotion: boolean) => {
                cy.get(dialog).should('have.attr', 'aria-modal', 'true');
                cy.get(confirm).should('be.enabled').and('have.text', promotion ? '관리자로 승격' : '일반 사용자로 강등');
                cy.get(dialog).should('contain.text', promotion ? 'role-member@example.invalid' : 'role-admin@example.invalid');
                cy.get(reason).should('have.value', '');
                cy.focused().should('have.attr', 'aria-label', '닫기');
            };
            const cycle = (state: string, reverse: boolean) => {
                const targets = reverse ? ['admin-role-change-confirm', 'admin-role-change-cancel', 'admin-role-change-reason', '닫기'] : ['admin-role-change-reason', 'admin-role-change-cancel', 'admin-role-change-confirm', '닫기'];
                for (const expected of targets) {
                    if (!reverse) cy.press(Cypress.Keyboard.Keys.TAB);
                    else cy.then(async () => {
                        const params = { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, modifiers: 8 };
                        await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type: 'keyDown' } });
                        await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type: 'keyUp' } });
                    });
                    cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
                    cy.document().then((doc) => {
                        const active = doc.activeElement as HTMLElement, actual = active.getAttribute('data-testid') || active.getAttribute('aria-label'), r = active.getBoundingClientRect();
                        const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), clear = Boolean(hit && (hit === active || active.contains(hit))), visible = active.matches(':focus-visible');
                        const inside = Boolean(doc.querySelector(dialog)?.contains(active));
                        observations.push({ state: `${state}-native-focus`, reverse, expected, actual, clear, visible, inside, rect: { left: r.left, top: r.top, width: r.width, height: r.height }, hit: hit?.outerHTML.slice(0, 500) });
                        if (actual !== expected || !inside) findings.push(`${state}: native focus destination ${actual}`);
                        if (!clear || !visible) findings.push(`${state}: native focus covered/invisible`);
                        if (!clear) capture(`${state}-${reverse ? 'reverse' : 'forward'}-${expected}-covered`);
                    });
                }
            };
            const measureDismissal = (state: string, user: number) => {
                cy.document().then((doc) => {
                    const active = doc.activeElement as HTMLElement, r = active.getBoundingClientRect(), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                    const expected = doc.querySelector(trigger(user)), clear = Boolean(hit && (hit === active || active.contains(hit)));
                    const header = doc.querySelector('header'), headerBox = header?.getBoundingClientRect();
                    const headerAnimations = header?.getAnimations({ subtree: true }).map((animation) => ({ playState: animation.playState, currentTime: animation.currentTime, endTime: animation.effect?.getComputedTiming().endTime })) ?? [];
                    observations.push({ state, overflow: doc.body.style.overflow, restored: active === expected, clear, active: active.getAttribute('data-testid'), rect: { left: r.left, top: r.top, width: r.width, height: r.height }, hit: hit?.outerHTML.slice(0, 500), headerBottom: headerBox?.bottom, headerAnimations });
                    expect(doc.body.style.overflow).to.equal(originalOverflow);
                    if (active !== expected || !clear) findings.push(`${state}: source focus not restored/clear`);
                });
            };
            const dismissed = (state: string, user: number) => {
                cy.get(dialog).should('not.exist');
                cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
                measureDismissal(state, user);
                cy.get(trigger(990782)).should('have.value', 'ROLE_USER'); cy.get(trigger(990783)).should('have.value', 'ROLE_ADMIN'); capture(state);
                if (residualOnly) { cy.wait(300); measureDismissal(`${state}-after300ms`, user); capture(`${state}-after300ms`); }
            };
            const inspectRoleDescription = (stage: string, promotion: boolean) => {
                if (!residualOnly) return;
                const expected = promotion ? ['일반 사용자', '관리자'] : ['관리자', '일반 사용자'];
                cy.get(dialog).then(($el) => {
                    const doc = $el[0].ownerDocument, description = doc.getElementById($el.attr('aria-describedby')!)!;
                    expect(Array.from(description.querySelectorAll('[data-testid="admin-badge-content"]'), (node) => node.textContent)).to.deep.equal(expected);
                });
                for (let index = 0; index < 2; index++) {
                    cy.get(dialog).then(($el) => {
                        const el = $el[0], doc = el.ownerDocument, description = doc.getElementById(el.getAttribute('aria-describedby')!)!;
                        const node = description.querySelectorAll<HTMLElement>('[data-testid="admin-badge-content"]')[index];
                        node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
                        const scroll = el.querySelector('h2')!.parentElement!, frame = scroll.getBoundingClientRect(), r = node.getBoundingClientRect();
                        const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), clear = Boolean(hit && (hit === node || node.contains(hit)));
                        const within = r.left >= frame.left - 1 && r.right <= frame.right + 1 && r.top >= frame.top - 1 && r.bottom <= frame.bottom + 1;
                        observations.push({ state: `${stage}-role-description`, index, expected: expected[index], text: node.textContent, clear, within, width: node.clientWidth, scrollWidth: node.scrollWidth, headerScrollTop: scroll.scrollTop, headerClientHeight: scroll.clientHeight, headerScrollHeight: scroll.scrollHeight });
                        if (!clear || !within || node.scrollWidth > node.clientWidth + 1) findings.push(`${stage}: role label hidden/clipped after header scroll`);
                    }); capture(`${stage}-role-description-${index}`);
                }
                cy.get(dialog).then(($el) => { $el[0].querySelector('h2')!.parentElement!.scrollTop = 0; });
            };
            select(990782, 'ROLE_ADMIN');
            cy.get(fallback).should('have.attr', 'aria-busy', 'true');
            cy.get(fallback).then(($el) => {
                const el = $el[0], doc = el.ownerDocument, active = doc.activeElement;
                observations.push({ state: 'held-chunk-fallback', text: el.textContent, active: active?.getAttribute('data-testid'), focusInside: el.contains(active), overflow: doc.body.style.overflow });
                if (!el.contains(active)) findings.push('held-chunk fallback retains external focus');
            }); capture('held-chunk-fallback');
            cy.then(() => releaseChunk()); cy.wait('@role-chunk'); cy.get(fallback).should('not.exist');
            assertEntry(true); sample('promotion-ready');
            inspectRoleDescription('promotion', true);
            cy.get(reason).type('합성 UI 사유 — 서버로 전송하지 않음', { scrollBehavior: false }).should('have.value', '합성 UI 사유 — 서버로 전송하지 않음'); sample('promotion-entered');
            cy.get(`${dialog} button[aria-label="닫기"]`).focus(); cycle('promotion', false); cycle('promotion', true);
            cy.get(cancel).click(); dismissed('promotion-canceled', 990782);
            select(990782, 'ROLE_ADMIN'); assertEntry(true); sample('promotion-reopened');
            cy.press(Cypress.Keyboard.Keys.ESC); dismissed('promotion-escaped', 990782);
            select(990783, 'ROLE_USER'); assertEntry(false); sample('demotion-ready');
            inspectRoleDescription('demotion', false);
            cy.get(reason).type('다른 합성 사유', { scrollBehavior: false }).should('have.value', '다른 합성 사유'); sample('demotion-entered');
            cy.get(`${dialog} button[aria-label="닫기"]`).focus(); cycle('demotion', false); cycle('demotion', true);
            cy.press(Cypress.Keyboard.Keys.ESC); dismissed('demotion-escaped', 990783);
            cy.then(() => {
                expect(usersReads).to.equal(1); expect(chunkReads).to.equal(1);
                expect(writes).to.deep.equal([]); expect(unknown).to.deep.equal([]);
                expect(tabs).to.have.length(16); expect(tabs.every((tab) => tab.trusted)).to.equal(true); expect(tabs.filter((tab) => tab.shift)).to.have.length(8);
                expect(escapes).to.deep.equal([true, true]); finished = true;
            }); cy.then(persist);
            cy.then(() => expect(findings, 'bounded role confirmation presentation findings').to.deep.equal([]));
        });
    }
});
