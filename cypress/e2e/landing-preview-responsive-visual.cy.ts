/// <reference types="cypress" />

export {};

// Existing repository marketing examples only, never live baseball data.
describe('Landing normal-motion preview responsive evidence', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    const findings: string[] = [], observations: Array<Record<string, unknown>> = [];
                    let unknownWrites = 0, profileReads = 0, motionStart = 0, nativeReducedMotion = false;
                    const phone = '[data-testid="landing-phone"]', toggle = '[data-testid="landing-ticker-toggle"]';
                    const step = (index: number) => `[data-step-index="${index}"]`;
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/landing-preview-${id}.json`, { width, font, theme, findings, observations });
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        if (new URL(req.url).origin !== origin.origin) req.reply({ forceNetworkError: true, log: false });
                    });
                    cy.intercept('**/api/**', (req) => {
                        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) unknownWrites++;
                        req.reply({ statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    });
                    cy.intercept('GET', '**/auth/mypage*', (req) => { profileReads++; req.reply({ statusCode: 401, body: {} }); });
                    cy.intercept('POST', '**/auth/reissue*', { statusCode: 401, body: {} });
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    // Only interval timers are controlled. CSS motion, RAF and transitions remain real.
                    cy.clock(Date.now(), ['setInterval', 'clearInterval']);
                    cy.visit('/', { onBeforeLoad(win) {
                        win.localStorage.clear(); win.sessionStorage.clear();
                        win.localStorage.setItem('kbo-theme', theme);
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.fontSize = `${font}px`;
                        win.document.documentElement.style.scrollBehavior = 'auto';
                        const original = win.matchMedia.bind(win);
                        nativeReducedMotion = original('(prefers-reduced-motion: reduce)').matches;
                        win.matchMedia = (query) => query === '(prefers-reduced-motion: reduce)' ? {
                            matches: false, media: query, onchange: null, addListener() {}, removeListener() {},
                            addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
                        } : original(query);
                    } });
                    cy.get('[data-testid="landing-page"]').should('be.visible');
                    cy.then(() => observations.push({ setup: 'native-reduced-motion', matches: nativeReducedMotion }));
                    cy.then(persist);
                    cy.then(() => expect(nativeReducedMotion, 'normal-motion browser prerequisite, not a product assertion').to.equal(false));
                    cy.location('pathname').should('equal', '/');
                    cy.get('html').should(theme === 'dark' ? 'have.class' : 'not.have.class', 'dark');
                    cy.document().then((doc) => expect(doc.defaultView!.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`));
                    cy.get('.landing-ticker-track').should('have.css', 'animation-play-state', 'running').then(($el) => {
                        motionStart = Number($el[0].getAnimations()[0]?.currentTime);
                        expect(Number.isFinite(motionStart)).to.equal(true);
                    });
                    cy.get('.landing-ticker-track').should(($el) => expect(Number($el[0].getAnimations()[0]?.currentTime)).to.be.greaterThan(motionStart + 30))
                        .then(($el) => observations.push({ motion: 'initial', start: motionStart, end: Number($el[0].getAnimations()[0]?.currentTime) }));
                    const control = (selector: string, phase: string) => {
                        cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(selector).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, r = el.getBoundingClientRect();
                            const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                            const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                            observations.push({ control: selector, phase, width: r.width, height: r.height, receivesPointer });
                            if (r.width < 44 || r.height < 44 || !receivesPointer || r.left < -1 || r.right > width + 1 || el.scrollWidth > el.clientWidth + 1) findings.push(`${phase}: control size/bounds/reachability ${selector}`);
                        });
                    };
                    control(toggle, 'ticker-running');
                    cy.get(toggle).focus(); cy.press(Cypress.Keyboard.Keys.SPACE);
                    cy.get(toggle).should('have.attr', 'aria-pressed', 'true').and('contain.text', '티커 재생');
                    cy.get('.landing-ticker-track').should('have.css', 'animation-play-state', 'paused');
                    for (const phase of [0, 0.25, 0.5, 0.75, 0.999]) {
                        cy.get('.landing-ticker-track').then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                            const animation = el.getAnimations()[0], duration = Number(animation.effect!.getTiming().duration);
                            animation.currentTime = duration * phase;
                            const aside = doc.querySelector('[data-testid="landing-score-ticker"]')!.getBoundingClientRect();
                            const items = Array.from(el.querySelectorAll<HTMLElement>('.landing-ticker-item')).map((item) => {
                                const r = item.getBoundingClientRect();
                                if (r.top < aside.top - 1 || r.bottom > aside.bottom + 1 || item.scrollHeight > item.clientHeight + 1) findings.push(`ticker-${phase}: vertical item clipping`);
                                return { width: r.width, height: r.height, top: r.top, bottom: r.bottom, fontSize: win.getComputedStyle(item).fontSize };
                            });
                            observations.push({ tickerPhase: phase, duration, currentTime: animation.currentTime, playState: win.getComputedStyle(el).animationPlayState, items });
                        });
                        cy.screenshot(`landing-preview-${id}-ticker-${phase}`, { capture: 'viewport' });
                        cy.then(persist);
                    }
                    cy.get(toggle).focus(); cy.press(Cypress.Keyboard.Keys.SPACE);
                    cy.get(toggle).should('have.attr', 'aria-pressed', 'false');
                    cy.get('.landing-ticker-track').should('have.css', 'animation-play-state', 'running');
                    cy.get('.landing-ticker-track').then(($el) => { motionStart = Number($el[0].getAnimations()[0]?.currentTime); });
                    cy.get('.landing-ticker-track').should(($el) => expect(Number($el[0].getAnimations()[0]?.currentTime)).to.be.greaterThan(motionStart + 30))
                        .then(($el) => observations.push({ motion: 'resumed', start: motionStart, end: Number($el[0].getAnimations()[0]?.currentTime) }));
                    const screen = (index: number) => {
                        cy.get(step(index)).should('have.attr', 'aria-pressed', 'true');
                        cy.get(`[data-phone-screen="${index}"]`).should(($el) => expect($el[0].ownerDocument.defaultView!.getComputedStyle($el[0]).opacity).to.equal('1'));
                        for (const other of [0, 1, 2].filter((x) => x !== index)) cy.get(`[data-phone-screen="${other}"]`).should(($el) => expect($el[0].ownerDocument.defaultView!.getComputedStyle($el[0]).opacity).to.equal('0'));
                    };
                    const capturePhone = (index: number, phase: string) => {
                        cy.get('.landing-app-preview-phone').then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get('.landing-app-preview-phone').should('have.attr', 'data-revealed', 'true').and('have.css', 'opacity', '1');
                        cy.document().then((doc) => doc.fonts.ready);
                        cy.get(phone).then(($phone) => {
                            const frame = $phone[0], doc = frame.ownerDocument, win = doc.defaultView!;
                            const viewport = frame.querySelector<HTMLElement>('.landing-phone-viewport')!, vr = viewport.getBoundingClientRect();
                            const documentWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth);
                            if (documentWidth > doc.documentElement.clientWidth + 1) findings.push(`${phase}: document overflow`);
                            const sharedHeaders = Array.from(viewport.querySelectorAll<HTMLElement>('.landing-phone-app-brand p'));
                            const screenHeaders = Array.from(viewport.querySelectorAll<HTMLElement>(`[data-phone-screen="${index}"] header p`));
                            for (const el of [...sharedHeaders, ...screenHeaders]) {
                                const r = el.getBoundingClientRect();
                                if (!el.textContent?.trim() || r.width <= 0 || r.height <= 0 || win.getComputedStyle(el).visibility === 'hidden') findings.push(`${phase}: essential header missing/unmeasurable`);
                            }
                            if (sharedHeaders.length !== 2 || screenHeaders.length === 0) findings.push(`${phase}: expected header copy absent`);
                            const copy: Array<Record<string, unknown>> = [];
                            const walker = doc.createTreeWalker(viewport, NodeFilter.SHOW_TEXT), range = doc.createRange();
                            let node = walker.nextNode();
                            while (node) {
                                const text = node.textContent?.trim(), parent = node.parentElement!;
                                const panel = parent.closest('[data-phone-screen]');
                                if (text && (!panel || panel.getAttribute('data-phone-screen') === String(index))) {
                                    range.selectNodeContents(node);
                                    let ellipsis = false;
                                    const intentionalClip: Array<Record<string, string>> = [];
                                    for (let p: HTMLElement | null = parent; p && viewport.contains(p); p = p.parentElement) {
                                        const style = win.getComputedStyle(p);
                                        if ((style.textOverflow === 'ellipsis' && ['hidden', 'clip'].includes(style.overflowX))
                                            || (Number(style.webkitLineClamp) > 0 && ['hidden', 'clip'].includes(style.overflowY))) {
                                            ellipsis = true;
                                            intentionalClip.push({ className: p.className, overflowX: style.overflowX, overflowY: style.overflowY, lineClamp: style.webkitLineClamp, textOverflow: style.textOverflow });
                                        }
                                    }
                                    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
                                    const outsideX = rects.some((r) => r.left < vr.left - 1 || r.right > vr.right + 1);
                                    const outsideY = rects.some((r) => r.top < vr.top - 1 || r.bottom > vr.bottom + 1);
                                    const header = Boolean(parent.closest('header'));
                                    if (header && rects.length === 0) findings.push(`${phase}: essential header has no rendered text ${text.slice(0, 40)}`);
                                    if (!ellipsis && outsideX) findings.push(`${phase}: phone horizontal copy clipping ${text.slice(0, 40)}`);
                                    if (header && outsideY) findings.push(`${phase}: phone header vertical clipping ${text.slice(0, 40)}`);
                                    copy.push({ text, fontSize: win.getComputedStyle(parent).fontSize, outsideX, outsideY, header, ellipsis, intentionalClip,
                                        rects: rects.map((r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom })) });
                                }
                                node = walker.nextNode();
                            }
                            observations.push({ phone: index, phase, viewport: { left: vr.left, right: vr.right, top: vr.top, bottom: vr.bottom }, documentWidth, copy });
                        });
                        cy.screenshot(`landing-preview-${id}-${phase}-phone`, { capture: 'viewport' });
                        cy.then(persist);
                    };
                    screen(0); capturePhone(0, 'auto-0');
                    cy.tick(4800); screen(1); capturePhone(1, 'auto-1');
                    cy.tick(4800); screen(2); capturePhone(2, 'auto-2');
                    for (const index of [0, 1, 2]) control(step(index), 'manual-steps');
                    cy.get(step(0)).focus(); cy.press(Cypress.Keyboard.Keys.ENTER); screen(0);
                    cy.tick(9600); screen(0);
                    cy.press(Cypress.Keyboard.Keys.TAB);
                    cy.focused().should('have.attr', 'data-step-index', '1').then(($el) => {
                        const el = $el[0], r = el.getBoundingClientRect(), hit = el.ownerDocument.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                        const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                        expect(el.matches(':focus-visible')).to.equal(true);
                        observations.push({ focus: 'native-tab-step-0-to-1', receivesPointer, focusVisible: true });
                        if (!receivesPointer) findings.push('native-tab: focused step center occluded');
                    });
                    cy.press(Cypress.Keyboard.Keys.SPACE); screen(1);
                    cy.tick(9600); screen(1); capturePhone(1, 'manual-stopped');
                    cy.then(() => {
                        expect(unknownWrites).to.equal(0); expect(profileReads).to.equal(0);
                        observations.push({ flow: 'normal-motion-keyboard-and-auto', unknownWrites, profileReads });
                    });
                    cy.then(persist);
                    cy.then(() => expect(findings, 'landing preview findings').to.deep.equal([]));
                });
            }
        }
    }
});
