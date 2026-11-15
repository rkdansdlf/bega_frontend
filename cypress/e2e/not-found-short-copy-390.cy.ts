/// <reference types="cypress" />

describe('Actual catch-all route, synthetic guest responsive checks', () => {
    for (const width of [390]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.origin).to.equal('http://127.0.0.1:5214');
                    const observations: Array<Record<string, unknown>> = [];
                    const findings: string[] = [];
                    let unknownWrites = 0;
                    const keyEvents: Array<{ key: string; shift: boolean; trusted: boolean }> = [];
                    const clickEvents: Array<{ target: string | null; trusted: boolean }> = [];
                    const missingPath = '/__synthetic_missing_page__';
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        const url = new URL(req.url);
                        if (url.origin !== origin.origin) return req.reply({ forceNetworkError: true });
                        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                            if (!(req.method === 'POST' && url.pathname === '/api/auth/reissue')) unknownWrites++;
                            return req.reply({ statusCode: 401, body: {} });
                        }
                        if (url.pathname === '/sw.js') return req.reply({ statusCode: 404, body: '' });
                        if (!['/terms', missingPath, '/home', '/', '/favicon.ico', '/manifest.json', '/theme-init.js', '/performance-shell-init.js'].includes(url.pathname)
                            && !url.pathname.startsWith('/assets/') && !url.pathname.startsWith('/api/')) {
                            return req.reply({ statusCode: 404, body: {} });
                        }
                    });
                    cy.intercept('**/api/**', (req) => {
                        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) unknownWrites++;
                        req.reply({ statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    });
                    cy.intercept('GET', '**/auth/mypage*', { statusCode: 401, body: {} });
                    cy.intercept('POST', '**/auth/reissue*', { statusCode: 401, body: {} });
                    cy.viewport(width, 360);
                    const visit = (path: string) => cy.visit(path, { onBeforeLoad(win) {
                        win.localStorage.clear();
                        win.sessionStorage.clear();
                        win.localStorage.setItem('kbo-theme', theme);
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.fontSize = `${font}px`;
                        win.document.documentElement.style.scrollBehavior = 'auto';
                        win.document.addEventListener('keydown', (event) => { if (event.key === 'Tab') keyEvents.push({ key: event.key, shift: event.shiftKey, trusted: event.isTrusted }); });
                        win.document.addEventListener('click', (event) => { const target = (event.target as Element).closest('[data-testid]'); if (target) clickEvents.push({ target: target.getAttribute('data-testid'), trusted: event.isTrusted }); });
                    } });
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/not-found-copy-${width}-${font}-${theme}.json`, { width, height: 360, font, theme, findings, observations, keyEvents, clickEvents });
                    const measureControl = (selector: string, label: string) => {
                        cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(selector).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, r = el.getBoundingClientRect(), style = doc.defaultView!.getComputedStyle(el);
                            const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                            const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                            observations.push({ control: label, width: r.width, height: r.height, left: r.left, right: r.right, top: r.top, bottom: r.bottom, receivesPointer });
                            if (r.width < 44 || r.height < 44 || r.left < -1 || r.right > width + 1 || !receivesPointer || el.scrollWidth > el.clientWidth + 1
                                || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1)) findings.push(`${label}: size/bounds/reachability`);
                        });
                    };
                    visit('/terms');
                    cy.contains('h1', '이용약관').should('be.visible');
                    visit(missingPath);
                    cy.location('pathname').should('equal', missingPath);
                    cy.get('[data-testid="not-found-page"]').should('be.visible');
                    cy.contains('h1', '페이지를 찾을 수 없습니다').should('be.visible');
                    cy.get('[data-testid="not-found-page"] p').should('be.visible');
                    cy.get('header,[data-testid="public-mobile-bottom-nav"]').should('not.exist');
                    cy.document().then((doc) => doc.fonts.ready);
                    cy.get('[data-testid="not-found-page"]').then(($root) => {
                        const root = $root[0], doc = root.ownerDocument, win = doc.defaultView!;
                        expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                        expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                        const documentWidth = Math.max(doc.body.scrollWidth, doc.documentElement.scrollWidth);
                        if (documentWidth > width + 1) findings.push('document overflow');
                        const copy = Array.from(root.querySelectorAll<HTMLElement>('h1,p,button')).map((el) => {
                            const r = el.getBoundingClientRect(), style = win.getComputedStyle(el);
                            const words: Array<{ text: string; lines: number }> = [];
                            {
                                const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
                                let node = walker.nextNode();
                                while (node) {
                                    for (const match of (node.textContent ?? '').matchAll(/\S+/gu)) {
                                        const range = doc.createRange();
                                        range.setStart(node, match.index!);
                                        range.setEnd(node, match.index! + match[0].length);
                                        const lines = new Set(Array.from(range.getClientRects())
                                            .filter((rect) => rect.width > 0 && rect.height > 0).map((rect) => Math.round(rect.top))).size;
                                        words.push({ text: match[0], lines });
                                        if (lines !== 1) findings.push(`word split: ${match[0]}`);
                                    }
                                    node = walker.nextNode();
                                }
                                expect(words.length, 'copy words measured').to.be.greaterThan(0);
                            }
                            if (r.width <= 0 || r.height <= 0 || style.visibility !== 'visible' || r.left < -1 || r.right > width + 1 || el.scrollWidth > el.clientWidth + 1
                                || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1)) findings.push(`copy bounds: ${el.textContent}`);
                            return { text: el.textContent, left: r.left, right: r.right, width: r.width, height: r.height,
                                clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, words };
                        });
                        observations.push({ state: 'not-found', documentWidth, documentHeight: doc.documentElement.scrollHeight, copy });
                        win.scrollTo({ top: 0, behavior: 'instant' });
                    });
                    cy.screenshot(`not-found-copy-${width}-${font}-${theme}-top`, { capture: 'viewport' });
                    const home = '[data-testid="not-found-home"]', back = '[data-testid="not-found-back"]';
                    const activatePointer = (selector: string) => {
                        cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(selector).click({ scrollBehavior: false });
                    };
                    measureControl(home, 'home');
                    measureControl(back, 'back');
                    cy.get(home).focus();
                    cy.focused().should('have.attr', 'data-testid', 'not-found-home');
                    cy.press(Cypress.Keyboard.Keys.TAB);
                    cy.focused().should('have.attr', 'data-testid', 'not-found-back').then(($el) => {
                        const el = $el[0], r = el.getBoundingClientRect();
                        const hit = el.ownerDocument.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                        expect(el.matches(':focus-visible')).to.equal(true);
                        expect(hit === el || Boolean(hit && el.contains(hit))).to.equal(true);
                        observations.push({ focus: 'native-tab-home-to-back', focusVisible: true, receivesPointer: true });
                    });
                    cy.screenshot(`not-found-copy-${width}-${font}-${theme}-back-tab`, { capture: 'viewport' });
                    cy.then(async () => {
                        await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, modifiers: 8 } });
                        await Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchKeyEvent', params: { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, modifiers: 8 } });
                    });
                    cy.focused().should('have.attr', 'data-testid', 'not-found-home');
                    cy.then(() => {
                        const events = keyEvents.slice(-2);
                        expect(events).to.have.length(2);
                        expect(events.every((event) => event.trusted)).to.equal(true);
                        expect(events.map((event) => event.shift)).to.deep.equal([false, true]);
                    });
                    cy.press(Cypress.Keyboard.Keys.TAB);
                    cy.focused().should('have.attr', 'data-testid', 'not-found-back');
                    activatePointer(back);
                    cy.location('pathname').should('equal', '/terms');
                    cy.contains('h1', '이용약관').should('be.visible');
                    cy.then(() => observations.push({ navigation: 'back', pathname: '/terms' }));
                    visit(missingPath);
                    cy.get(home).focus();
                    activatePointer(home);
                    // Destination URL/unmount only: Home data rendering is not under this static-route regression.
                    cy.location('pathname').should('equal', '/home');
                    cy.get('[data-testid="not-found-page"]').should('not.exist');
                    cy.then(() => {
                        expect(unknownWrites).to.equal(0);
                        expect(clickEvents.filter((event) => event.target === 'not-found-back' || event.target === 'not-found-home')).to.deep.equal([{ target: 'not-found-back', trusted: false }, { target: 'not-found-home', trusted: false }]);
                        observations.push({ navigation: 'home', pathname: '/home', unknownWrites });
                    });
                    cy.then(persist);
                    cy.then(() => expect(findings, 'catch-all findings').to.deep.equal([]));
                });
            }
        }
    }
});
