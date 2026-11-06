/// <reference types="cypress" />
import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

// Fictional accounts only. Final Delete is measured/focused and never activated.
describe('Admin user delete confirmation presentation and dismissal', () => {
    const policyOnly = Boolean(Cypress.expose('deletePolicyOnly'));
    for (const role of ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'] as const) for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        if (policyOnly && role !== 'ROLE_ADMIN') continue;
        it(`${role} / ${width} / ${font} / ${theme}`, () => {
            const origin = new URL(String(Cypress.config('baseUrl'))).origin, id = `${policyOnly ? 'policy-' : ''}${role}-${width}-${font}-${theme}`;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const viewer = { id: 990791, email: 'delete-viewer@example.invalid', name: '합성 운영자', handle: 'synthetic_delete_dialog', role, hasPassword: true, favoriteTeam: null, profileImageUrl: null };
            const rows = [
                { ...viewer, createdAt: '2020-01-01T09:00:00', postCount: 0 },
                { id: 990792, email: 'delete-member@example.invalid', name: '합성 삭제 대상', role: 'ROLE_USER', favoriteTeam: null, createdAt: '2020-01-02T09:00:00', postCount: 0 },
                { id: 990793, email: 'delete-admin@example.invalid', name: '합성 다른 관리자', role: 'ROLE_ADMIN', favoriteTeam: null, createdAt: '2020-01-03T09:00:00', postCount: 0 },
            ];
            const dialog = '[data-testid="admin-user-delete-dialog"]', source = '[data-testid="admin-user-delete-990792"]';
            const cancel = '[data-testid="admin-user-delete-cancel"]', confirm = '[data-testid="admin-user-delete-confirm"]';
            const policy = '이 작업은 되돌릴 수 없습니다. 계정 정보와 비금융 콘텐츠를 즉시 비식별 처리합니다. 결제·지급 및 감사 기록과 보존 대상 콘텐츠는 유지될 수 있습니다.';
            const findings: string[] = [], observations: Array<Record<string, unknown>> = [], writes: string[] = [], unknown: string[] = [], foreignUrls: string[] = [];
            const tabs: Array<{ trusted: boolean; shift: boolean }> = [], escapes: boolean[] = [];
            let usersReads = 0, foreign = 0, finished = false, originalOverflow = '';
            let originalRows: Array<{ id: string | null; cells: string[]; roleValue: string | null }> = [];
            const rowSnapshot = (doc: Document) => Array.from(doc.querySelectorAll('[data-testid="admin-users-panel"] tbody tr'), (row) => ({
                id: row.querySelector('[data-testid^="admin-user-delete-"]')?.getAttribute('data-testid') ?? null,
                cells: Array.from(row.querySelectorAll('td'), (cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
                roleValue: row.querySelector<HTMLSelectElement>('select')?.value ?? null,
            }));
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/user-delete-dialog-${id}.json`, { mode: policyOnly ? 'policy' : 'presentation', role, width, font, theme, usersReads, foreign, foreignUrls, writes, unknown, tabs, escapes, observations, findings, originalRows, finished });
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url), mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
                if (mutation) writes.push(`${req.method} ${req.url}`);
                if (url.origin !== origin) { foreign++; foreignUrls.push(url.href); return req.reply({ forceNetworkError: true }); }
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
            cy.viewport(width, width === 1280 ? 900 : 844); cy.clock(Date.UTC(2099, 0, 2, 12), ['Date']);
            cy.visit('/admin', { onBeforeLoad(win) {
                win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            cy.wait('@users');
            const assertRows = () => {
                cy.get('[data-testid="admin-users-panel"] tbody tr').should('have.length', 3);
                cy.get('[data-testid="admin-user-delete-990791"]').should('be.disabled');
                cy.get('[data-testid="admin-user-delete-990793"]').should('be.disabled'); cy.get(source).should('be.enabled');
                cy.document().then((doc) => { if (originalRows.length) expect(rowSnapshot(doc)).to.deep.equal(originalRows); });
            };
            assertRows();
            cy.document().then((doc) => {
                originalOverflow = doc.body.style.overflow;
                originalRows = rowSnapshot(doc); expect(originalRows).to.have.length(3);
                doc.addEventListener('keydown', (event) => {
                    if (event.key === 'Tab') tabs.push({ trusted: event.isTrusted, shift: event.shiftKey });
                    if (event.key === 'Escape') escapes.push(event.isTrusted);
                });
            });
            const capture = (state: string) => { cy.screenshot(`user-delete-dialog-${id}-${state}`, { capture: 'viewport', disableTimersAndAnimations: false }); cy.then(persist); };
            const open = () => {
                cy.get(source).then(($el) => $el[0].scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
                cy.get(source).focus().should('have.focus'); cy.get(source).click({ scrollBehavior: false });
                cy.get(dialog).should('be.visible').and('have.attr', 'aria-modal', 'true');
                cy.get(confirm).should('be.enabled').and('have.text', '삭제');
                cy.focused().should('have.attr', 'aria-label', '닫기');
            };
            const sample = (state: string) => {
                cy.document().then((doc) => doc.fonts.ready);
                cy.get(dialog).then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, r = el.getBoundingClientRect(), title = el.querySelector('h2')!;
                    const description = doc.getElementById(el.getAttribute('aria-describedby')!)!;
                    expect(title.textContent).to.equal('유저를 삭제하시겠습니까?'); expect(description.textContent).to.equal(policy);
                    expect(el.innerText).to.contain('합성 삭제 대상 계정을 삭제합니다.');
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                    expect(doc.body.style.overflow).to.equal('hidden');
                    const background = win.getComputedStyle(el).backgroundColor, titleColor = win.getComputedStyle(title).color, descriptionColor = win.getComputedStyle(description).color;
                    const luminance = (color: string) => {
                        if (!/^rgba?\(/.test(color)) return null;
                        const parsed = color.match(/[\d.]+/g)?.map(Number);
                        if (!parsed || parsed.length < 3 || (parsed.length === 4 && parsed[3] !== 1)) return null;
                        const channels = parsed.slice(0, 3);
                        const values = channels.map((channel) => { const c = channel / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
                        return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
                    };
                    const contrast = (foreground: string) => {
                        const a = luminance(foreground), b = luminance(background); return a === null || b === null ? null : (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
                    };
                    const account = Array.from(el.querySelectorAll('p')).find((node) => node.textContent?.includes('계정을 삭제합니다.'))!;
                    const accountColor = win.getComputedStyle(account).color, nameColor = win.getComputedStyle(account.querySelector('span')!).color;
                    const titleContrast = contrast(titleColor), descriptionContrast = contrast(descriptionColor), accountContrast = contrast(accountColor), nameContrast = contrast(nameColor), surfaceLuminance = luminance(background);
                    const controls = Array.from(el.querySelectorAll('button')).map((node) => { const box = node.getBoundingClientRect(); return { id: node.getAttribute('data-testid') || node.getAttribute('aria-label'), width: box.width, height: box.height }; });
                    const overflow = Array.from(el.querySelectorAll('h2,button')).filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => ({ tag: node.tagName, id: node.getAttribute('data-testid'), width: node.clientWidth, scrollWidth: node.scrollWidth }));
                    const declaredFontFaces = Array.from(doc.fonts, (face) => ({ family: face.family, status: face.status }));
                    observations.push({ state, text: el.innerText, background, surfaceLuminance, titleColor, descriptionColor, accountColor, nameColor, titleContrast, descriptionContrast, accountContrast, nameContrast, dark: Boolean(el.closest('.dark')), rect: { left: r.left, top: r.top, width: r.width, height: r.height }, controls, overflow, cssFontFamily: win.getComputedStyle(title).fontFamily, declaredFontFaces });
                    if (surfaceLuminance === null || surfaceLuminance > 0.25) findings.push(`${state}: Admin dialog surface light/unmeasurable`);
                    // Diagnostic readability floor only; this is not a compliance audit.
                    if ([titleContrast, descriptionContrast, accountContrast, nameContrast].some((value) => value === null || value < 3)) findings.push(`${state}: dialog text contrast below diagnostic floor/unmeasurable`);
                    if (controls.some((control) => control.width < 44 || control.height < 44)) findings.push(`${state}: controls below44`);
                    if (r.left < -1 || r.right > win.innerWidth + 1 || r.top < -1 || r.bottom > win.innerHeight + 1 || overflow.length) findings.push(`${state}: dialog/control overflow`);
                }); capture(state);
            };
            const cycle = (reverse: boolean) => {
                for (const expected of reverse ? ['admin-user-delete-confirm', 'admin-user-delete-cancel', '닫기'] : ['admin-user-delete-cancel', 'admin-user-delete-confirm', '닫기']) {
                    if (!reverse) cy.press(Cypress.Keyboard.Keys.TAB);
                    else cy.then(async () => {
                        const params = { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, modifiers: 8 };
                        await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type: 'keyDown' } });
                        await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type: 'keyUp' } });
                    });
                    cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
                    cy.document().then((doc) => {
                        const active = doc.activeElement as HTMLElement, actual = active.getAttribute('data-testid') || active.getAttribute('aria-label'), r = active.getBoundingClientRect(), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                        const clear = Boolean(hit && (hit === active || active.contains(hit))), inside = Boolean(doc.querySelector(dialog)?.contains(active)), visible = active.matches(':focus-visible');
                        observations.push({ state: 'native-focus', reverse, expected, actual, clear, inside, visible, hit: hit?.outerHTML.slice(0, 400) });
                        if (actual !== expected || !inside || !clear || !visible) findings.push('native dialog focus destination/clearance failure');
                        if (!clear) capture(`native-${reverse ? 'reverse' : 'forward'}-${expected}-covered`);
                    });
                }
            };
            const measureReturn = (state: string, observedRemovalAt: number) => cy.document().then((doc) => {
                const active = doc.activeElement as HTMLElement, r = active.getBoundingClientRect(), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                const restored = active === doc.querySelector(source), clear = Boolean(hit && (hit === active || active.contains(hit)));
                const header = doc.querySelector('header');
                const rows = rowSnapshot(doc); expect(rows).to.deep.equal(originalRows);
                observations.push({ state, restored, clear, overflow: doc.body.style.overflow, elapsedSinceObservedRemovalMs: doc.defaultView!.performance.now() - observedRemovalAt, rows, rect: { left: r.left, top: r.top, width: r.width, height: r.height }, hit: hit?.outerHTML.slice(0, 400), headerBottom: header?.getBoundingClientRect().bottom, headerAnimations: header?.getAnimations({ subtree: true }).map((animation) => animation.playState) ?? [] });
                expect(doc.body.style.overflow).to.equal(originalOverflow);
                if (!restored || !clear) findings.push(`${state}: source focus not restored/clear`);
            });
            const dismissed = (state: string) => {
                cy.get(dialog).should('not.exist');
                let observedRemovalAt = 0;
                cy.window().then((win) => { observedRemovalAt = win.performance.now(); });
                cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
                cy.then(() => measureReturn(state, observedRemovalAt));
                cy.wait(300); cy.then(() => measureReturn(`${state}-after300ms`, observedRemovalAt));
                assertRows(); capture(`${state}-after300ms`);
            };
            if (policyOnly) {
                let keyboardTailSeen = false, overflowing = false;
                const policyKeys: Array<{ key: string; trusted: boolean }> = [];
                const probe = (state: string) => cy.get(dialog).then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                    const description = doc.getElementById(el.getAttribute('aria-describedby')!)!;
                    const scroller = description.parentElement!, frame = scroller.getBoundingClientRect();
                    expect(description.childNodes).to.have.length(1);
                    const tail = '유지될 수 있습니다.', text = description.firstChild!;
                    expect(text.textContent).to.equal(policy);
                    const range = doc.createRange(); range.setStart(text, policy.lastIndexOf(tail)); range.setEnd(text, policy.length);
                    const rects = Array.from(range.getClientRects(), (r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom }));
                    expect(rects.length).to.be.greaterThan(0);
                    const tailClear = rects.every((r) => {
                        const hit = doc.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
                        return r.top >= frame.top - 1 && r.bottom <= frame.top + scroller.clientHeight + 1
                            && r.left >= frame.left - 1 && r.right <= frame.right + 1 && Boolean(hit && description.contains(hit));
                    });
                    overflowing = scroller.scrollHeight > scroller.clientHeight + 1;
                    if (state !== 'script-scroll-end') keyboardTailSeen ||= tailClear;
                    const active = doc.activeElement as HTMLElement;
                    observations.push({ state, tailClear, overflowing, scrollTop: scroller.scrollTop, scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight,
                        rects, frame: { left: frame.left, top: frame.top, width: frame.width, height: frame.height },
                        active: active.getAttribute('data-testid') || active.getAttribute('aria-label'), inside: el.contains(active), bodyOverflow: doc.body.style.overflow });
                    expect(el.contains(active)).to.equal(true); expect(doc.body.style.overflow).to.equal('hidden');
                    if (state === 'script-scroll-end' && !tailClear) findings.push('policy tail not reachable after explicit scroller scroll');
                });
                const settle = () => cy.window().then((win) => new Cypress.Promise<void>((resolve) => {
                    const start = win.performance.now(); let last = '', stableSince = start;
                    const tick = () => {
                        const el = win.document.querySelector(dialog)!, description = win.document.getElementById(el.getAttribute('aria-describedby')!)!, scroller = description.parentElement!;
                        const r = scroller.getBoundingClientRect(), now = win.performance.now();
                        const current = JSON.stringify([scroller.scrollTop, win.document.scrollingElement?.scrollTop, r.top, r.bottom, r.left, r.right]);
                        if (current !== last) { last = current; stableSince = now; }
                        const stable = now - stableSince >= 220, timedOut = now - start >= 2500;
                        if (stable || timedOut) {
                            observations.push({ state: 'scroll-settle', elapsedMs: now - start, stableForMs: now - stableSince, stable, timedOut, positions: JSON.parse(current) });
                            if (!stable) findings.push('policy probe scroll did not settle');
                            resolve();
                        } else win.requestAnimationFrame(tick);
                    };
                    win.requestAnimationFrame(tick);
                }));
                open(); sample('opened');
                cy.document().then((doc) => {
                    doc.addEventListener('keydown', (event) => {
                        if (['PageDown', 'End', 'ArrowDown'].includes(event.key)) policyKeys.push({ key: event.key, trusted: event.isTrusted });
                    });
                });
                probe('initial');
                for (const expected of ['닫기', 'admin-user-delete-cancel', 'admin-user-delete-confirm']) {
                    cy.focused().then(($el) => expect($el.attr('data-testid') || $el.attr('aria-label')).to.equal(expected));
                    for (const [key, code, virtual] of [['PageDown', 'PageDown', 34], ['End', 'End', 35], ['ArrowDown', 'ArrowDown', 40]] as const) {
                        cy.then(async () => {
                            const params = { key, code, windowsVirtualKeyCode: virtual, nativeVirtualKeyCode: virtual };
                            for (const type of ['keyDown', 'keyUp']) await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type } });
                        });
                        settle(); probe(`keyboard-${expected}-${key}`);
                    }
                    cy.press(Cypress.Keyboard.Keys.TAB); settle();
                }
                cy.focused().should('have.attr', 'aria-label', '닫기');
                capture('after-native-keyboard');
                cy.get(dialog).then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, description = doc.getElementById(el.getAttribute('aria-describedby')!)!;
                    // Structural scrollability only: this does not claim pointer/keyboard reachability.
                    description.parentElement!.scrollTop = description.parentElement!.scrollHeight;
                });
                settle(); probe('script-scroll-end'); capture('after-script-scroll');
                cy.press(Cypress.Keyboard.Keys.ESC); dismissed('policy-escaped');
                cy.then(() => {
                    observations.push({ state: 'policy-summary', keyboardTailSeen, overflowing, policyKeys });
                    expect(policyKeys).to.have.length(9); expect(policyKeys.every((event) => event.trusted)).to.equal(true);
                    expect(tabs).to.have.length(3); expect(tabs.every((event) => event.trusted && !event.shift)).to.equal(true);
                    expect(escapes).to.deep.equal([true]); expect(usersReads).to.equal(1); expect(writes).to.deep.equal([]); expect(unknown).to.deep.equal([]);
                    expect(foreignUrls.every((url) => url === 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css')).to.equal(true);
                    if (overflowing && !keyboardTailSeen) findings.push('policy tail not reachable from normal keyboard focus cycle');
                    finished = true;
                });
                cy.then(persist); cy.then(() => expect(findings, 'policy reachability findings').to.deep.equal([]));
                return;
            }
            open(); sample('opened'); cycle(false); cycle(true);
            cy.get(cancel).click(); dismissed('canceled');
            open(); sample('reopened-for-escape'); cy.press(Cypress.Keyboard.Keys.ESC); dismissed('escaped');
            open(); sample('reopened-for-close'); cy.get(`${dialog} button[aria-label="닫기"]`).click(); dismissed('closed');
            cy.then(() => {
                expect(usersReads).to.equal(1); expect(writes).to.deep.equal([]); expect(unknown).to.deep.equal([]);
                expect(foreignUrls.every((url) => url === 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css'), 'only the explicitly blocked HTML font stylesheet is expected').to.equal(true);
                expect(tabs).to.have.length(6); expect(tabs.every((tab) => tab.trusted)).to.equal(true); expect(tabs.filter((tab) => tab.shift)).to.have.length(3); expect(escapes).to.deep.equal([true]); finished = true;
            }); cy.then(persist);
            cy.then(() => expect(findings, 'bounded user delete confirmation UI findings').to.deep.equal([]));
        });
    }
});
