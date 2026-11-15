/// <reference types="cypress" />
import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

// Fictional local fixtures only. Final Delete is focused/measured, never activated.
describe('Admin post and Mate delete confirmation presentation and dismissal', () => {
    const approvedPolicy = Boolean(Cypress.expose('matePolicyApproved'));
    const policyOnly = Boolean(Cypress.expose('matePolicyOnly')) || approvedPolicy;
    for (const tab of ['posts', 'parties'] as const) for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        if (policyOnly && tab !== 'parties') continue;
        if (Cypress.expose('singleCase') && !(width === 320 && font === 32 && theme === 'dark')) continue;
        it(`${tab} / ${width} / ${font} / ${theme}`, () => {
            const origin = new URL(String(Cypress.config('baseUrl'))).origin, id = `${policyOnly ? 'policy-' : ''}${tab}-${width}-${font}-${theme}`;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const viewer = { id: 990881, email: 'community-dialog@example.invalid', name: '합성 운영자', handle: 'synthetic_community_dialog', role: 'ROLE_ADMIN', hasPassword: true, favoriteTeam: null, profileImageUrl: null };
            const users = [{ ...viewer, createdAt: '2020-01-01T09:00:00', postCount: 0 }];
            const post = tab === 'posts', kind = post ? 'post' : 'mate', list = post ? 'posts' : 'mates', recordId = post ? 990882 : 990884;
            const rows = post ? [
                { id: 990882, team: 'SYNTH', content: '합성 삭제 확인 게시글', author: '합성 작성자', createdAt: '2020-01-01T09:00:00', likeCount: 2, commentCount: 1, isHot: false },
                { id: 990883, team: 'SYNTH', content: '보존 여부를 확인하는 합성 게시글', author: '다른 합성 작성자', createdAt: '2020-01-02T09:00:00', likeCount: 3, commentCount: 0, isHot: false },
            ] : [
                { id: 990884, title: '합성 삭제 확인 모임', hostName: '합성 호스트', gameDate: '2099-01-01', maxMembers: 4, currentMembers: 2, status: 'pending' },
                { id: 990885, title: '보존 여부를 확인하는 합성 모임', hostName: '다른 합성 호스트', gameDate: '2099-01-02', maxMembers: 4, currentMembers: 4, status: 'matched' },
            ];
            const titleCopy = post ? '게시글을 삭제하시겠습니까?' : '메이트 모임을 삭제하시겠습니까?';
            const policy = post ? '이 작업은 되돌릴 수 없습니다. 게시글과 관련된 모든 데이터가 영구적으로 삭제됩니다.'
                : '연결된 신청·결제·대화·체크인 등의 기록이 있으면 삭제가 차단됩니다. 연결 기록은 자동 삭제·환불되지 않으며 별도 정리 절차가 필요합니다.';
            const targetCopy = post ? '#990882 게시글을 삭제합니다.' : '합성 삭제 확인 모임 모임은 연결 기록이 없는 경우에만 삭제됩니다.';
            const panel = `[data-testid="admin-${list}-panel"]`, dialog = `[data-testid="admin-${kind}-delete-dialog"]`;
            const source = `[data-testid="admin-${kind}-delete-${recordId}"]`, cancel = `[data-testid="admin-${kind}-delete-cancel"]`, confirm = `[data-testid="admin-${kind}-delete-confirm"]`;
            const findings: string[] = [], observations: Array<Record<string, unknown>> = [], writes: string[] = [], unknown: string[] = [], foreignUrls: string[] = [];
            const presentationFindings: string[] = [], visualFindings = policyOnly ? presentationFindings : findings;
            const tabs: Array<{ trusted: boolean; shift: boolean }> = [], escapes: boolean[] = [];
            let usersReads = 0, listReads = 0, finished = false, originalOverflow = '';
            let originalRows: Array<{ id: string | null; cells: string[] }> = [];
            const rowSnapshot = (doc: Document) => Array.from(doc.querySelectorAll(`${panel} tbody tr`), (row) => ({
                id: row.getAttribute('data-testid'), cells: Array.from(row.querySelectorAll('td'), (cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
            }));
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/community-delete-${id}.json`, { mode: policyOnly ? 'policy' : 'presentation', tab, width, font, theme, role: viewer.role, usersReads, listReads, foreignUrls, writes, unknown, tabs, escapes, observations, findings, presentationFindings, originalRows, finished });
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url), mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
                if (mutation) writes.push(`${req.method} ${req.url}`);
                if (url.origin !== origin) { foreignUrls.push(url.href); return req.reply({ forceNetworkError: true }); }
                if (mutation) return req.reply({ statusCode: 503, body: {} });
            });
            cy.intercept('**/api/**', (req) => { unknown.push(`${req.method} ${req.url}`); req.reply({ statusCode: 503, body: {} }); });
            cy.intercept('**/auth/**', (req) => { unknown.push(`${req.method} ${req.url}`); req.reply({ statusCode: 401, body: {} }); });
            cy.intercept('GET', `${origin}/api/auth/mypage`, { body: { success: true, data: toAuthApiUser(viewer) } });
            cy.intercept('GET', `${origin}/api/admin/stats`, { body: { success: true, data: { totalUsers: 1, totalPosts: 2, totalMates: 2 } } });
            cy.intercept('GET', `${origin}/api/admin/users*`, (req) => {
                const url = new URL(req.url); expect(url.pathname).to.equal('/api/admin/users');
                expect(Array.from(url.searchParams.entries()).every(([key, value]) => key === 'search' && value === '')).to.equal(true);
                usersReads++; req.alias = 'users'; req.reply({ body: { success: true, data: users } });
            });
            cy.intercept('GET', `${origin}/api/admin/${list}`, (req) => { listReads++; req.alias = 'list'; req.reply({ body: { success: true, data: rows } }); });
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
            cy.get('[data-testid="admin-user-delete-990881"]').should('be.disabled');
            cy.get(`[data-testid="admin-tab-${tab}"]`).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
            cy.get(`[data-testid="admin-tab-${tab}"]`).click(); cy.wait('@list');
            cy.get(`${panel} tbody tr`).should('have.length', 2);
            cy.document().then((doc) => {
                originalOverflow = doc.body.style.overflow; originalRows = rowSnapshot(doc); expect(originalRows).to.have.length(2);
                doc.addEventListener('keydown', (event) => {
                    if (event.key === 'Tab') tabs.push({ trusted: event.isTrusted, shift: event.shiftKey });
                    if (event.key === 'Escape') escapes.push(event.isTrusted);
                });
            });
            const capture = (state: string) => { cy.screenshot(`community-delete-${id}-${state}`, { capture: 'viewport', disableTimersAndAnimations: false }); cy.then(persist); };
            const twoFrames = () => cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
            const open = () => {
                cy.get(source).then(($el) => $el[0].scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
                cy.get(source).focus().should('have.focus'); cy.get(source).click({ scrollBehavior: false });
                cy.get(dialog).should('be.visible').and('have.attr', 'aria-modal', 'true'); cy.get(confirm).should('be.enabled').and('have.text', '삭제');
                cy.focused().should('have.attr', 'aria-label', '닫기');
            };
            const sample = (state: string) => {
                cy.document().then((doc) => doc.fonts.ready);
                cy.get(dialog).then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, r = el.getBoundingClientRect(), title = el.querySelector('h2')!;
                    const description = doc.getElementById(el.getAttribute('aria-describedby')!)!, account = Array.from(el.querySelectorAll('p')).find((node) => node !== description)!;
                    expect(title.textContent).to.equal(titleCopy); expect(description.textContent).to.equal(policy);
                    expect(account.textContent?.replace(/\s+/g, ' ').trim()).to.equal(targetCopy);
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(win.localStorage.getItem('kbo-theme')).to.equal(theme);
                    expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                    expect(doc.body.style.overflow).to.equal('hidden');
                    const background = win.getComputedStyle(el).backgroundColor;
                    const luminance = (color: string) => {
                        if (!/^rgba?\(/.test(color)) return null;
                        const parsed = color.match(/[\d.]+/g)?.map(Number);
                        if (!parsed || parsed.length < 3 || (parsed.length === 4 && parsed[3] !== 1)) return null;
                        const values = parsed.slice(0, 3).map((channel) => { const c = channel / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
                        return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
                    };
                    const surfaceLuminance = luminance(background), texts = [title, description, account, account.querySelector('span')!].map((node) => {
                        const color = win.getComputedStyle(node).color, value = luminance(color), contrast = value === null || surfaceLuminance === null ? null : (Math.max(value, surfaceLuminance) + 0.05) / (Math.min(value, surfaceLuminance) + 0.05);
                        return { text: node.textContent, color, contrast };
                    });
                    const controls = Array.from(el.querySelectorAll('button')).map((node) => { const box = node.getBoundingClientRect(); return { id: node.getAttribute('data-testid') || node.getAttribute('aria-label'), width: box.width, height: box.height }; });
                    const overflow = Array.from(el.querySelectorAll('h2,button')).filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => ({ tag: node.tagName, id: node.getAttribute('data-testid'), width: node.clientWidth, scrollWidth: node.scrollWidth }));
                    observations.push({ state, background, surfaceLuminance, texts, dark: Boolean(el.closest('.dark')), rect: { left: r.left, top: r.top, width: r.width, height: r.height }, controls, overflow,
                        headerScroll: { scrollTop: description.parentElement!.scrollTop, height: description.parentElement!.clientHeight, scrollHeight: description.parentElement!.scrollHeight },
                        cssFontFamily: win.getComputedStyle(title).fontFamily, declaredFontFaces: Array.from(doc.fonts, (face) => ({ family: face.family, status: face.status })) });
                    if (surfaceLuminance === null || surfaceLuminance > 0.25) visualFindings.push(`${state}: Admin dialog surface light/unmeasurable`);
                    // A bounded diagnostic floor, not a compliance claim.
                    if (texts.some((node) => node.contrast === null || node.contrast < 3)) visualFindings.push(`${state}: dialog text below diagnostic contrast floor/unmeasurable`);
                    if (controls.some((control) => control.width < 44 || control.height < 44)) visualFindings.push(`${state}: controls below44`);
                    if (r.left < -1 || r.right > win.innerWidth + 1 || r.top < -1 || r.bottom > win.innerHeight + 1 || overflow.length) visualFindings.push(`${state}: dialog/control overflow`);
                }); capture(state);
            };
            const cycle = (reverse: boolean, afterFocus?: (expected: string) => void) => {
                const expectedStops = reverse
                    ? [...(!post ? ['안내 내용'] : []), `admin-${kind}-delete-confirm`, `admin-${kind}-delete-cancel`, '닫기']
                    : [`admin-${kind}-delete-cancel`, `admin-${kind}-delete-confirm`, ...(!post ? ['안내 내용'] : []), '닫기'];
                for (const expected of expectedStops) {
                    if (!reverse) cy.press(Cypress.Keyboard.Keys.TAB);
                    else cy.then(async () => {
                        const params = { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, modifiers: 8 };
                        for (const type of ['keyDown', 'keyUp']) await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type } });
                    });
                    twoFrames();
                    cy.document().then((doc) => {
                        const active = doc.activeElement as HTMLElement, actual = active.getAttribute('data-testid') || active.getAttribute('aria-label'), r = active.getBoundingClientRect(), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                        const clear = Boolean(hit && (hit === active || active.contains(hit))), inside = Boolean(doc.querySelector(dialog)?.contains(active)), visible = active.matches(':focus-visible');
                        observations.push({ state: 'native-focus', reverse, expected, actual, clear, inside, visible, hit: hit?.outerHTML.slice(0, 400) });
                        if (actual !== expected || !inside || !clear || !visible) findings.push('native dialog focus destination/clearance failure');
                    });
                    afterFocus?.(expected);
                }
            };
            const measureReturn = (state: string, observedRemovalAt: number) => cy.document().then((doc) => {
                const active = doc.activeElement as HTMLElement, r = active.getBoundingClientRect(), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                const restored = active === doc.querySelector(source), clear = Boolean(hit && (hit === active || active.contains(hit))), rowsNow = rowSnapshot(doc);
                expect(rowsNow).to.deep.equal(originalRows); expect(doc.body.style.overflow).to.equal(originalOverflow);
                observations.push({ state, restored, clear, overflow: doc.body.style.overflow, elapsedSinceObservedRemovalMs: doc.defaultView!.performance.now() - observedRemovalAt, rows: rowsNow,
                    rect: { left: r.left, top: r.top, width: r.width, height: r.height }, hit: hit?.outerHTML.slice(0, 400), headerAnimations: doc.querySelector('header')?.getAnimations({ subtree: true }).map((animation) => animation.playState) ?? [] });
                if (!restored || !clear) findings.push(`${state}: source focus not restored/clear`);
            });
            const dismissed = (state: string) => {
                cy.get(dialog).should('not.exist'); let observedRemovalAt = 0;
                cy.window().then((win) => { observedRemovalAt = win.performance.now(); }); twoFrames();
                cy.then(() => measureReturn(state, observedRemovalAt)); cy.wait(300); cy.then(() => measureReturn(`${state}-after300ms`, observedRemovalAt));
                cy.get(`${panel} tbody tr`).should('have.length', 2); capture(`${state}-after300ms`);
            };
            if (policyOnly) {
                let keyboardTailSeen = false, overflowing = false, headerTailSeen = false, headerScrollTop = 0;
                const policyKeys: Array<{ key: string; trusted: boolean }> = [];
                const probe = (state: string) => cy.get(dialog).then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, description = doc.getElementById(el.getAttribute('aria-describedby')!)!;
                    const scroller = description.parentElement!, frame = scroller.getBoundingClientRect(), tail = '별도 정리 절차가 필요합니다.';
                    expect(description.childNodes).to.have.length(1); const text = description.firstChild!;
                    expect(text.textContent).to.equal(policy); expect(policy.lastIndexOf(tail)).to.be.at.least(0);
                    const range = doc.createRange(); range.setStart(text, policy.lastIndexOf(tail)); range.setEnd(text, policy.length);
                    const rects = Array.from(range.getClientRects(), (r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom }));
                    expect(rects.length).to.be.greaterThan(0);
                    const tailClear = rects.every((r) => {
                        const hit = doc.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
                        return r.top >= frame.top - 1 && r.bottom <= frame.top + scroller.clientHeight + 1
                            && r.left >= frame.left - 1 && r.right <= frame.left + scroller.clientWidth + 1 && Boolean(hit && description.contains(hit));
                    });
                    overflowing = scroller.scrollHeight > scroller.clientHeight + 1;
                    if (state !== 'script-scroll-end') keyboardTailSeen ||= tailClear;
                    if (state === 'keyboard-header-End') { headerTailSeen = tailClear; headerScrollTop = scroller.scrollTop; }
                    const active = doc.activeElement as HTMLElement;
                    observations.push({ state, tail, tailClear, overflowing, scrollTop: scroller.scrollTop, scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight,
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
                            if (!stable) findings.push('policy probe scroll did not settle'); resolve();
                        } else win.requestAnimationFrame(tick);
                    };
                    win.requestAnimationFrame(tick);
                }));
                open(); sample('policy-opened');
                if (approvedPolicy) cy.get(`${dialog} [role="region"][aria-label="안내 내용"]`).should('have.attr', 'tabindex', '0');
                cy.document().then((doc) => doc.addEventListener('keydown', (event) => {
                    if (['PageDown', 'End', 'ArrowDown'].includes(event.key)) policyKeys.push({ key: event.key, trusted: event.isTrusted });
                }));
                settle(); probe('initial');
                for (const expected of ['닫기', 'admin-mate-delete-cancel', 'admin-mate-delete-confirm']) {
                    cy.focused().then(($el) => expect($el.attr('data-testid') || $el.attr('aria-label')).to.equal(expected));
                    for (const [key, code, virtual] of [['PageDown', 'PageDown', 34], ['End', 'End', 35], ['ArrowDown', 'ArrowDown', 40]] as const) {
                        cy.then(async () => {
                            const params = { key, code, windowsVirtualKeyCode: virtual, nativeVirtualKeyCode: virtual };
                            for (const type of ['keyDown', 'keyUp']) await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type } });
                        });
                        settle(); probe(`keyboard-${expected}-${key}`);
                    }
                    cy.press(Cypress.Keyboard.Keys.TAB); settle(); probe(`after-tab-${expected}`);
                }
                if (approvedPolicy) {
                    cy.focused().should('have.attr', 'aria-label', '안내 내용').then(($el) => {
                        const el = $el[0], style = el.ownerDocument.defaultView!.getComputedStyle(el);
                        const focusVisible = el.matches(':focus-visible'), outlined = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2;
                        const inset = parseFloat(style.outlineOffset) <= -2, r = el.getBoundingClientRect(), frame = el.parentElement!.getBoundingClientRect();
                        const withinFrame = r.left >= frame.left && r.right <= frame.right && r.top >= frame.top && r.bottom <= frame.bottom;
                        observations.push({ state: 'policy-header-focus', focusVisible, outlined, inset, withinFrame, outlineColor: style.outlineColor, outlineOffset: style.outlineOffset });
                        expect(focusVisible && outlined && inset && withinFrame, 'visible inset policy focus indicator').to.equal(true);
                    });
                    cy.then(async () => {
                        const params = { key: 'End', code: 'End', windowsVirtualKeyCode: 35, nativeVirtualKeyCode: 35 };
                        for (const type of ['keyDown', 'keyUp']) await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type } });
                    });
                    settle(); probe('keyboard-header-End');
                    cy.press(Cypress.Keyboard.Keys.TAB); settle(); probe('after-header-tab');
                }
                cy.focused().should('have.attr', 'aria-label', '닫기');
                cycle(true, (expected) => { settle(); probe(`after-reverse-${expected}`); });
                cy.focused().should('have.attr', 'aria-label', '닫기');
                capture('after-native-keyboard');
                cy.get(dialog).then(($el) => {
                    const el = $el[0], description = el.ownerDocument.getElementById(el.getAttribute('aria-describedby')!)!;
                    // Structural scrollability only; not pointer or keyboard reachability.
                    description.parentElement!.scrollTop = description.parentElement!.scrollHeight;
                });
                settle(); probe('script-scroll-end'); capture('after-script-scroll');
                cy.get(cancel).click(); dismissed('policy-canceled');
                open(); cy.press(Cypress.Keyboard.Keys.ESC); dismissed('policy-escaped');
                open(); cy.get(`${dialog} button[aria-label="닫기"]`).click(); dismissed('policy-closed');
                cy.then(() => {
                    observations.push({ state: 'policy-summary', keyboardTailSeen, overflowing, headerTailSeen, headerScrollTop, policyKeys });
                    expect(policyKeys).to.have.length(approvedPolicy ? 10 : 9); expect(policyKeys.every((event) => event.trusted)).to.equal(true);
                    expect(tabs).to.have.length(approvedPolicy ? 8 : 6); expect(tabs.every((event) => event.trusted)).to.equal(true); expect(tabs.filter((event) => event.shift)).to.have.length(approvedPolicy ? 4 : 3);
                    expect(escapes).to.deep.equal([true]); expect(usersReads).to.equal(1); expect(listReads).to.equal(1); expect(writes).to.deep.equal([]); expect(unknown).to.deep.equal([]);
                    expect(foreignUrls.every((url) => url === 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css')).to.equal(true);
                    if (!keyboardTailSeen) findings.push('policy tail not visible through tested native keyboard cycle');
                    if (approvedPolicy && (!headerTailSeen || (overflowing && headerScrollTop <= 0))) findings.push('focused policy does not reveal tail with End');
                    finished = true;
                });
                cy.then(persist); cy.then(() => expect(findings, 'Mate policy keyboard findings; presentation findings remain separate').to.deep.equal([]));
                return;
            }
            open(); sample('opened'); cycle(false); cycle(true);
            cy.get(cancel).click(); dismissed('canceled');
            open(); sample('reopened-for-escape'); cy.press(Cypress.Keyboard.Keys.ESC); dismissed('escaped');
            open(); sample('reopened-for-close'); cy.get(`${dialog} button[aria-label="닫기"]`).click(); dismissed('closed');
            cy.then(() => {
                expect(usersReads).to.equal(1); expect(listReads).to.equal(1); expect(writes).to.deep.equal([]); expect(unknown).to.deep.equal([]);
                expect(foreignUrls.every((url) => url === 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css'), 'only the explicitly blocked HTML font stylesheet is expected').to.equal(true);
                expect(tabs).to.have.length(post ? 6 : 8); expect(tabs.every((event) => event.trusted)).to.equal(true); expect(tabs.filter((event) => event.shift)).to.have.length(post ? 3 : 4); expect(escapes).to.deep.equal([true]); finished = true;
            }); cy.then(persist);
            cy.then(() => expect(findings, 'bounded community delete confirmation findings').to.deep.equal([]));
        });
    }
});
