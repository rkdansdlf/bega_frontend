/// <reference types="cypress" />

import { measureWordLines } from "../support/measureWordLines";

// Local UI only: no signup submission or real credentials.
describe('Signup helper copy and password reachability', () => {
    const stableGutter = Boolean(Cypress.expose('stableGutter'));
    const reservedViewport = Boolean(Cypress.expose('reservedViewport'));
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        if ((stableGutter || reservedViewport) && !(width === 320 && font === 32)) continue;
        it(`${width} / ${font} / ${theme}`, () => {
            const origin = new URL(String(Cypress.config('baseUrl'))).origin, id = `${reservedViewport ? 'reserved-15px-' : stableGutter ? 'stable-gutter-' : ''}${width}-${font}-${theme}`;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const findings: string[] = [], observations: Array<Record<string, unknown>> = [], writes: string[] = [], unknown: string[] = [], foreignUrls: string[] = [];
            const tabs: boolean[] = [];
            let finished = false;
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/signup-password-${id}.json`, { width, font, theme, stableGutter, reservedViewport, findings, observations, writes, unknown, foreignUrls, tabs, finished });
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url), mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
                if (mutation) writes.push(`${req.method} ${req.url}`);
                if (url.origin !== origin) { foreignUrls.push(url.href); return req.reply({ forceNetworkError: true }); }
                if (mutation) return req.reply({ statusCode: 503, body: {} });
                if (url.pathname === '/sw.js') return req.reply({ statusCode: 404, body: '' });
                if (!['/signup', '/', '/favicon.ico', '/manifest.json', '/theme-init.js', '/performance-shell-init.js'].includes(url.pathname) && !url.pathname.startsWith('/assets/')) {
                    unknown.push(`${req.method} ${url.pathname}`);
                    return req.reply({ statusCode: 503, body: {} });
                }
            });
            cy.intercept('**/api/**', (req) => { unknown.push(`${req.method} ${req.url}`); req.reply({ statusCode: 503, body: {} }); });
            cy.intercept('**/auth/**', (req) => { unknown.push(`${req.method} ${req.url}`); req.reply({ statusCode: 401, body: {} }); });
            cy.intercept('GET', `${origin}/api/auth/mypage`, { statusCode: 401, body: {} });
            cy.intercept('GET', `${origin}/api/auth/policies/required`, { body: { success: true, data: { policies: ['TERMS', 'PRIVACY', 'DATA_DISCLAIMER'].map((policyType) => ({ policyType, version: '2026-02-26', required: true })) } } });
            cy.viewport(width, 844); cy.clearCookies();
            cy.visit('/signup', { onBeforeLoad(win) {
                win.localStorage.clear(); win.sessionStorage.clear(); win.localStorage.setItem('kbo-theme', theme);
                win.document.documentElement.classList.toggle('dark', theme === 'dark');
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
                if (stableGutter) win.document.documentElement.style.scrollbarGutter = 'stable';
                if (reservedViewport) win.document.documentElement.style.width = 'calc(100% - 15px)';
                win.document.addEventListener('keydown', (event) => { if (event.key === 'Tab') tabs.push(event.isTrusted); });
            } });
            cy.get('[data-testid="signup-header"]').should('contain.text', '회원가입');
            const checkWords = (selector: string, words: string[]) => {
                cy.get(selector).should('be.visible').then(($el) => {
                    const element = $el[0] as HTMLElement, rect = element.getBoundingClientRect();
                    const style = element.ownerDocument.defaultView!.getComputedStyle(element);
                    if (rect.width <= 0 || rect.left < -1 || rect.right > width + 1 || element.scrollWidth > element.clientWidth + 1
                        || (['hidden', 'clip'].includes(style.overflowY) && element.scrollHeight > element.clientHeight + 1)) {
                        findings.push(`${selector}: helper bounds or clipping`);
                    }
                    const probe = element.cloneNode(false) as HTMLElement;
                    probe.textContent = 'syntheticlongtoken'.repeat(20);
                    probe.style.cssText = `position:fixed;left:0;top:-10000px;width:${rect.width}px;`;
                    element.parentElement!.appendChild(probe);
                    try {
                        const overflows = probe.scrollWidth > probe.clientWidth + 1;
                        observations.push({ state: 'long-token-probe', selector, overflows });
                        if (overflows) findings.push(`${selector}: long unbroken token overflows`);
                    } finally { probe.remove(); }
                    for (const word of words) {
                        const results = measureWordLines($el[0], word);
                        expect(results.length, `occurrence of ${word}`).to.be.greaterThan(0);
                        for (const [index, lines] of results.entries()) {
                            observations.push({ state: 'helper-word', word, occurrence: index + 1, lines });
                            if (lines !== 1) findings.push(`${word} #${index + 1}: spans ${lines} lines`);
                        }
                    }
                });
            };
            checkWords('[data-testid="signup-handle-availability"]', ['저장됩니다', '기호는']);
            cy.get('[data-testid="signup-password"]').closest('.space-y-2').find('p.auth-helper-text').as('passwordHelp');
            checkWords('@passwordHelp', ['숫자', '특수문자', '1개', '포함']);
            const capture = (state: string) => { cy.screenshot(`signup-password-${id}-${state}`, { capture: 'viewport', disableTimersAndAnimations: false }); cy.then(persist); };
            for (const name of ['password', 'confirm-password']) {
                const input = `[data-testid="signup-${name}"]`, eye = `[data-testid="signup-${name}-visibility"]`;
                cy.get(input).then(($el) => $el[0].scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
                cy.get(input).then(($el) => {
                    const el = $el[0] as HTMLInputElement, doc = el.ownerDocument, win = doc.defaultView!, rect = el.getBoundingClientRect(), button = doc.querySelector<HTMLElement>(eye)!;
                    const b = button.getBoundingClientRect(), style = win.getComputedStyle(el), hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                    const receivesCenter = hit === el || Boolean(hit && el.contains(hit));
                    const contentLeft = rect.left + el.clientLeft + parseFloat(style.paddingLeft);
                    const contentRight = rect.left + el.clientLeft + el.clientWidth - parseFloat(style.paddingRight);
                    const usableWidth = Math.max(0, contentRight - contentLeft);
                    const verticalOverlap = b.bottom > rect.top && b.top < rect.bottom;
                    const obstruction = verticalOverlap ? Math.max(0, Math.min(contentRight, b.right) - Math.max(contentLeft, b.left)) : 0;
                    const leftSegment = Math.max(0, Math.min(contentRight, b.left) - contentLeft);
                    const rightSegment = Math.max(0, contentRight - Math.max(contentLeft, b.right));
                    const unobscuredWidth = obstruction > 0 ? Math.max(leftSegment, rightSegment) : usableWidth;
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`); expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                    observations.push({ state: 'initial', name, input: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                        button: { left: b.left, top: b.top, width: b.width, height: b.height }, paddingLeft: style.paddingLeft, paddingRight: style.paddingRight,
                        usableWidth, contentLeft, contentRight, obstruction, unobscuredWidth, receivesCenter, hit: hit?.closest('[data-testid]')?.getAttribute('data-testid'), documentClientWidth: doc.documentElement.clientWidth, innerWidth: win.innerWidth,
                        scrollbarGutter: win.getComputedStyle(doc.documentElement).scrollbarGutter, rootWidth: doc.documentElement.getBoundingClientRect().width });
                    if (!receivesCenter) findings.push(`${name}: input center does not receive pointer hit`);
                    if (width < 640 && verticalOverlap) findings.push(`${name}: mobile input and visibility control overlap vertically`);
                    if (unobscuredWidth < 44 || b.width < 44 || b.height < 44 || rect.left < -1 || rect.right > win.innerWidth + 1) findings.push(`${name}: insufficient unobscured input/control space`);
                });
                capture(`${name}-initial`);
                cy.get(input).then(($el) => $el[0].scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
                cy.get(input).click(20, 24, { scrollBehavior: false }).should('have.focus').type('Synthetic123!').should('have.value', 'Synthetic123!');
                cy.press(Cypress.Keyboard.Keys.TAB);
                cy.focused().should('have.attr', 'data-testid', `signup-${name}-visibility`).then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, r = el.getBoundingClientRect(), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                    const visible = el.matches(':focus-visible'), clear = Boolean(hit && (hit === el || el.contains(hit)));
                    observations.push({ state: 'native-tab', name, focusVisible: visible, clear, hit: hit?.closest('[data-testid]')?.getAttribute('data-testid') });
                    if (!visible || !clear) findings.push(`${name}: visibility control focus is covered or not visible`);
                });
                cy.get(eye).click(); cy.get(input).should('have.attr', 'type', 'text').and('have.value', 'Synthetic123!');
                cy.get(eye).click(); cy.get(input).should('have.attr', 'type', 'password').and('have.value', 'Synthetic123!');
                capture(`${name}-toggled`);
            }
            cy.then(() => {
                expect(tabs).to.have.length(2); expect(tabs.every(Boolean)).to.equal(true);
                expect(writes).to.deep.equal([]); expect(unknown).to.deep.equal([]);
                expect(foreignUrls.every((url) => url === 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css')).to.equal(true);
                finished = true;
            }); cy.then(persist); cy.then(() => expect(findings, 'signup password reachability findings').to.deep.equal([]));
        });
    }
});
