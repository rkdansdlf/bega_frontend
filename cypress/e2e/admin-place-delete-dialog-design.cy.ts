/// <reference types="cypress" />
import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

// Local fictional data only. Neither the cold loader nor resolved Confirm is activated.
describe('Admin place deletion confirmation cold and resolved design', () => {
    let releaseHeldModule: () => void = () => undefined;
    afterEach(() => releaseHeldModule());
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width} / ${font} / ${theme}`, () => {
            const origin = new URL(String(Cypress.config('baseUrl'))).origin, id = `${width}-${font}-${theme}`;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const viewer = { id: 990901, email: 'place-dialog@example.invalid', name: '합성 운영자', handle: 'synthetic_place_dialog', role: 'ROLE_ADMIN', hasPassword: true, favoriteTeam: null, profileImageUrl: null };
            const stadium = { stadiumId: 'SYNTH_PLACE_DIALOG', stadiumName: '합성 검증 공간', team: '', lat: 0, lng: 0, address: '합성 주소', phone: '' };
            const places = [990902, 990903].map((key) => ({ id: key, stadiumName: stadium.stadiumName, category: '기타', name: `합성 장소 ${key}`,
                description: '실제 장소가 아닌 합성 항목입니다.', lat: 0, lng: 0, address: '합성 주소', phone: '', rating: 3, openTime: '00:00', closeTime: '00:00' }));
            const panel = '[data-testid="admin-stadiums-panel"]', source = '[data-testid="admin-place-delete-990902"]', select = '[data-testid="admin-stadium-select-trigger"]';
            const fallback = '[data-testid="admin-stadiums-delete-dialog-fallback"]', dialog = '[data-testid="admin-delete-place-dialog"]';
            const cancel = '[data-testid="admin-delete-place-cancel"]', confirm = '[data-testid="admin-delete-place-confirm"]';
            const findings: string[] = [], observations: Array<Record<string, unknown>> = [], writes: string[] = [], unknown: string[] = [], foreignUrls: string[] = [];
            const tabs: Array<{ trusted: boolean; shift: boolean }> = [], escapes: boolean[] = [];
            let usersReads = 0, stadiumReads = 0, placeReads = 0, chunkReads = 0, finished = false, originalOverflow = '', coldDismissed = false;
            let coldEscapeObservedAt = 0;
            let originalRows: Array<{ id: string | null; cells: string[] }> = [];
            let releaseChunk!: () => void;
            const chunkGate = new Cypress.Promise<void>((resolve) => { releaseChunk = resolve; }); releaseHeldModule = releaseChunk;
            const rowSnapshot = (doc: Document) => Array.from(doc.querySelectorAll(`${panel} tbody tr`), (row) => ({ id: row.getAttribute('data-testid'), cells: Array.from(row.querySelectorAll('td'), (cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? '') }));
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/place-delete-${id}.json`, { width, font, theme, role: viewer.role, usersReads, stadiumReads, placeReads, chunkReads, coldDismissed, writes, unknown, foreignUrls, observations, findings, tabs, escapes, originalRows, finished });
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url), mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
                if (mutation) writes.push(`${req.method} ${req.url}`);
                if (url.origin !== origin) { foreignUrls.push(url.href); return req.reply({ forceNetworkError: true }); }
                if (mutation) return req.reply({ statusCode: 503, body: {} });
            });
            cy.intercept('**/api/**', (req) => { unknown.push(`${req.method} ${req.url}`); req.reply({ statusCode: 503, body: {} }); });
            cy.intercept('**/auth/**', (req) => { unknown.push(`${req.method} ${req.url}`); req.reply({ statusCode: 401, body: {} }); });
            cy.intercept('GET', `${origin}/api/auth/mypage`, { body: { success: true, data: toAuthApiUser(viewer) } });
            cy.intercept('GET', `${origin}/api/admin/stats`, { body: { success: true, data: { totalUsers: 1, totalPosts: 0, totalMates: 0 } } });
            cy.intercept('GET', `${origin}/api/admin/users*`, (req) => {
                const url = new URL(req.url); expect(url.pathname).to.equal('/api/admin/users');
                expect(Array.from(url.searchParams.entries()).every(([key, value]) => key === 'search' && value === '')).to.equal(true);
                usersReads++; req.alias = 'users'; req.reply({ body: { success: true, data: [] } });
            });
            cy.intercept('GET', `${origin}/api/stadiums`, (req) => { stadiumReads++; req.alias = 'stadiums'; req.reply({ body: [stadium] }); });
            cy.intercept('GET', `${origin}/api/stadiums/${stadium.stadiumId}/places`, (req) => { placeReads++; req.alias = 'places'; req.reply({ body: places }); });
            cy.intercept('GET', `${origin}/api/dm/rooms/my`, { body: { success: true, data: [] } });
            cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { body: { success: true, data: 0 } });
            cy.intercept('GET', `${origin}/api/notifications/my`, { body: [] });
            cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { body: 0 });
            cy.intercept('GET', `${origin}/assets/AdminDeletePlaceDialogContent-*.js*`, (req) => {
                chunkReads++; req.alias = 'delete-chunk'; return chunkGate.then(() => req.continue());
            });
            cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Network.setCacheDisabled', params: { cacheDisabled: true } }));
            cy.then(() => Cypress.automation('remote:debugger:protocol', { command: 'Network.setBypassServiceWorker', params: { bypass: true } }));
            cy.viewport(width, width === 1280 ? 900 : 844); cy.clock(Date.UTC(2099, 0, 2, 12), ['Date']);
            cy.visit('/admin', { onBeforeLoad(win) {
                win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
                observations.push({ state: 'service-worker-at-load', controlled: Boolean(win.navigator.serviceWorker?.controller) });
            } });
            cy.wait('@users');
            cy.get('[data-testid="admin-tab-stadiums"]').then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
            cy.get('[data-testid="admin-tab-stadiums"]').click(); cy.wait('@stadiums'); cy.wait('@places');
            cy.get(`${panel} tbody tr`).should('have.length', 2); cy.get(select).should('have.value', stadium.stadiumId).and('be.enabled');
            cy.document().then((doc) => {
                originalOverflow = doc.body.style.overflow; originalRows = rowSnapshot(doc); expect(originalRows).to.have.length(2);
                doc.addEventListener('keydown', (event) => {
                    if (event.key === 'Tab') tabs.push({ trusted: event.isTrusted, shift: event.shiftKey });
                    if (event.key === 'Escape') {
                        escapes.push(event.isTrusted);
                        if (doc.querySelector(fallback)) coldEscapeObservedAt = doc.defaultView!.performance.now();
                    }
                });
            });
            const twoFrames = () => cy.window().then((win) => new Cypress.Promise<void>((resolve) => win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()))));
            const capture = (state: string) => { cy.screenshot(`place-delete-${id}-${state}`, { capture: 'viewport', disableTimersAndAnimations: false }); cy.then(persist); };
            const tab = (reverse = false) => {
                if (!reverse) cy.press(Cypress.Keyboard.Keys.TAB);
                else cy.then(async () => {
                    const params = { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, modifiers: 8 };
                    for (const type of ['keyDown', 'keyUp']) await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { ...params, type } });
                });
                twoFrames();
            };
            const trigger = () => {
                cy.get(source).then(($el) => $el[0].scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
                cy.get(source).focus().should('have.focus'); cy.get(source).click({ scrollBehavior: false });
            };
            const coldProbe = (state: string) => cy.document().then((doc) => {
                const el = doc.querySelector<HTMLElement>(fallback), active = doc.activeElement as HTMLElement, r = el?.getBoundingClientRect();
                const inside = Boolean(el?.contains(active)), closeAvailable = Boolean(el?.querySelector('button'));
                observations.push({ state, present: Boolean(el), inside, closeAvailable, active: active.getAttribute('data-testid') || active.getAttribute('aria-label'), overflow: doc.body.style.overflow,
                    elapsedSinceColdEscapeMs: coldEscapeObservedAt ? doc.defaultView!.performance.now() - coldEscapeObservedAt : null,
                    text: el?.textContent, rect: r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null });
                if (el) {
                    expect(el.getAttribute('aria-busy')).to.equal('true'); expect(el.getAttribute('aria-modal')).to.equal('true'); expect(el.getAttribute('aria-label')).to.equal('장소 삭제');
                    expect(el.querySelector('[role="status"]')?.textContent).to.contain('장소 삭제 창 로딩 중');
                    if (!inside) findings.push(`${state}: cold fallback leaves focus outside`);
                    if (doc.body.style.overflow !== 'hidden') findings.push(`${state}: cold fallback does not lock body`);
                    if (!closeAvailable) findings.push(`${state}: cold fallback has no dismissal control`);
                    if (r!.left < -1 || r!.right > width + 1 || r!.top < -1 || r!.bottom > doc.defaultView!.innerHeight + 1) findings.push(`${state}: cold fallback overflow`);
                }
            });
            const sample = (state: string) => {
                cy.get(dialog).should('be.visible').and('have.attr', 'aria-modal', 'true'); cy.get(confirm).should('be.enabled').and('have.text', '삭제');
                cy.focused().should('have.attr', 'aria-label', '닫기'); cy.document().then((doc) => doc.fonts.ready);
                cy.get(dialog).then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, r = el.getBoundingClientRect(), heading = el.querySelector('h2')!;
                    const description = doc.getElementById(el.getAttribute('aria-describedby')!)!, titleText = heading.querySelector('span')!, policyText = description.querySelector('span')!;
                    expect(heading.textContent?.trim()).to.equal('장소를 삭제하시겠습니까?');
                    expect(description.textContent?.trim()).to.equal('이 작업은 되돌릴 수 없습니다. 해당 장소 정보가 영구적으로 삭제됩니다.');
                    const bodyText = Array.from(el.querySelectorAll('div')).find((node) => node.childElementCount === 0 && node.textContent?.trim() === '선택한 장소 정보가 완전히 제거됩니다.')!;
                    expect(bodyText).not.to.equal(undefined); expect(doc.body.style.overflow).to.equal('hidden');
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`); expect(win.localStorage.getItem('kbo-theme')).to.equal(theme);
                    expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                    const background = win.getComputedStyle(el).backgroundColor;
                    const luminance = (color: string) => {
                        if (!/^rgba?\(/.test(color)) return null;
                        const p = color.match(/[\d.]+/g)?.map(Number); if (!p || p.length < 3 || (p.length === 4 && p[3] !== 1)) return null;
                        const v = p.slice(0, 3).map((channel) => { const c = channel / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
                        return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722;
                    };
                    const surfaceLuminance = luminance(background), texts = [titleText, policyText, bodyText].map((node) => {
                        const color = win.getComputedStyle(node).color, value = luminance(color), contrast = value === null || surfaceLuminance === null ? null : (Math.max(value, surfaceLuminance) + 0.05) / (Math.min(value, surfaceLuminance) + 0.05);
                        return { text: node.textContent, color, contrast };
                    });
                    const controls = Array.from(el.querySelectorAll('button')).map((node) => { const b = node.getBoundingClientRect(); return { id: node.getAttribute('data-testid') || node.getAttribute('aria-label'), width: b.width, height: b.height }; });
                    const overflow = Array.from(el.querySelectorAll('h2,button')).filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => node.getAttribute('data-testid') || node.tagName);
                    observations.push({ state, background, surfaceLuminance, texts, controls, overflow, rect: { left: r.left, top: r.top, width: r.width, height: r.height },
                        cssFontFamily: win.getComputedStyle(titleText).fontFamily, declaredFontFaces: Array.from(doc.fonts, (face) => ({ family: face.family, status: face.status })) });
                    if (surfaceLuminance === null || surfaceLuminance > 0.25) findings.push(`${state}: resolved Admin surface light/unmeasurable`);
                    // Bounded readability diagnostic, not a compliance audit.
                    if (texts.some((node) => node.contrast === null || node.contrast < 3)) findings.push(`${state}: resolved text below diagnostic contrast floor/unmeasurable`);
                    if (controls.some((control) => control.width < 44 || control.height < 44)) findings.push(`${state}: resolved controls below44`);
                    if (r.left < -1 || r.right > width + 1 || r.top < -1 || r.bottom > win.innerHeight + 1 || overflow.length) findings.push(`${state}: resolved dialog/control overflow`);
                }); capture(state);
            };
            const cycle = (reverse: boolean) => {
                for (const expected of reverse ? ['admin-delete-place-confirm', 'admin-delete-place-cancel', '닫기'] : ['admin-delete-place-cancel', 'admin-delete-place-confirm', '닫기']) {
                    tab(reverse); cy.document().then((doc) => {
                        const active = doc.activeElement as HTMLElement, actual = active.getAttribute('data-testid') || active.getAttribute('aria-label'), r = active.getBoundingClientRect(), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                        const inside = Boolean(doc.querySelector(dialog)?.contains(active)), clear = Boolean(hit && (hit === active || active.contains(hit))), visible = active.matches(':focus-visible');
                        observations.push({ state: 'native-resolved-focus', reverse, expected, actual, inside, clear, visible, hit: hit?.outerHTML.slice(0, 400) });
                        if (expected !== actual || !inside || !clear || !visible) findings.push('resolved native focus destination/clearance failure');
                    });
                }
            };
            const measureReturn = (state: string, removalAt: number) => cy.document().then((doc) => {
                const active = doc.activeElement as HTMLElement, r = active.getBoundingClientRect(), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                const restored = active === doc.querySelector(source), clear = Boolean(hit && (hit === active || active.contains(hit))), rows = rowSnapshot(doc);
                expect(rows).to.deep.equal(originalRows); expect(doc.body.style.overflow).to.equal(originalOverflow);
                expect(doc.querySelector<HTMLSelectElement>(select)?.value).to.equal(stadium.stadiumId);
                observations.push({ state, restored, clear, rows, overflow: doc.body.style.overflow, active: active.getAttribute('data-testid') || active.getAttribute('aria-label'),
                    elapsedSinceObservedRemovalMs: doc.defaultView!.performance.now() - removalAt, hit: hit?.outerHTML.slice(0, 400) });
                if (!restored || !clear) findings.push(`${state}: source focus not restored/clear`);
            });
            const dismissed = (state: string) => {
                cy.get(dialog).should('not.exist'); let removalAt = 0; cy.window().then((win) => { removalAt = win.performance.now(); });
                twoFrames(); cy.then(() => measureReturn(state, removalAt)); cy.wait(300); cy.then(() => measureReturn(`${state}-after300ms`, removalAt)); capture(`${state}-after300ms`);
            };
            trigger(); cy.then(persist); cy.get(fallback).should('be.visible'); coldProbe('cold-opened'); capture('cold-opened');
            tab(); coldProbe('cold-forward-1'); tab(); coldProbe('cold-forward-2'); tab(true); coldProbe('cold-reverse');
            cy.press(Cypress.Keyboard.Keys.ESC); twoFrames(); coldProbe('cold-Escape-early'); cy.wait(300); coldProbe('cold-Escape-late');
            cy.document().then((doc) => { coldDismissed = !doc.querySelector(fallback); if (!coldDismissed) findings.push('cold Escape does not dismiss'); }); capture('cold-Escape-late');
            let chunkResponseAt = 0;
            cy.then(() => releaseChunk()); cy.wait('@delete-chunk');
            cy.window().then((win) => { chunkResponseAt = win.performance.now(); }); cy.get(fallback).should('not.exist');
            cy.then(() => {
                if (coldDismissed) {
                    twoFrames(); cy.wait(300);
                    cy.document().then((doc) => {
                        const reopened = Boolean(doc.querySelector(dialog));
                        observations.push({ state: 'late-chunk-after-cancel', reopened, elapsedSinceChunkResponseMs: doc.defaultView!.performance.now() - chunkResponseAt });
                        if (reopened) findings.push('late chunk reopened dismissed cold dialog');
                    });
                    cy.then(persist); cy.get(dialog).should('not.exist'); trigger();
                }
            });
            sample('resolved-after-cold'); cycle(false); cycle(true); cy.get(cancel).click(); dismissed('canceled');
            trigger(); sample('reopened-for-Escape'); cy.press(Cypress.Keyboard.Keys.ESC); dismissed('escaped');
            trigger(); sample('reopened-for-X'); cy.get(`${dialog} button[aria-label="닫기"]`).click(); dismissed('closed');
            cy.then(() => {
                expect(usersReads).to.equal(1); expect(stadiumReads).to.equal(1); expect(placeReads).to.equal(1); expect(chunkReads).to.equal(1);
                expect(writes).to.deep.equal([]); expect(unknown).to.deep.equal([]);
                expect(foreignUrls.every((url) => url === 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css')).to.equal(true);
                expect(tabs).to.have.length(9); expect(tabs.every((event) => event.trusted)).to.equal(true); expect(tabs.filter((event) => event.shift)).to.have.length(4);
                expect(escapes).to.deep.equal([true, true]); finished = true;
            }); cy.then(persist); cy.then(() => expect(findings, 'cold/resolved place deletion design findings').to.deep.equal([]));
        });
    }
});
