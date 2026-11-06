/// <reference types="cypress" />

export {};

// Local fictional photo fixtures; JAMSIL/block-101 only selects existing internal UI geometry.
describe('Stadium gallery synthetic query states', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl')));
                    expect(['127.0.0.1', 'localhost', 'host.docker.internal']).to.include(origin.hostname);
                    const findings: string[] = [], observations: Array<Record<string, unknown>> = [];
                    let reads = 0, writes = 0, authWrites = 0, blockedLocalReads = 0, goodReads = 0, failedReads = 0, release!: () => void;
                    let mode: 'error' | 'empty' = 'error', emptyResponses = 0;
                    const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
                    const gallery = '[data-qa-gallery="current"]';
                    const photo = (index: number) => `${gallery} [data-testid="seat-view-photo-${index}"]`;
                    const box = '[data-testid="seat-view-lightbox"]';
                    const close = '[data-testid="seat-view-lightbox-close"]';
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/stadium-gallery-${id}.json`, {
                        width, font, theme, findings, observations, reads, writes, authWrites, blockedLocalReads, goodReads, failedReads,
                    });
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        const url = new URL(req.url);
                        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                            if (url.origin === origin.origin && /^\/(?:api\/)?auth\/reissue\/?$/.test(url.pathname)) authWrites++;
                            else writes++;
                        }
                        if (url.origin !== origin.origin) return req.reply({ forceNetworkError: true, log: false });
                        const frontend = url.pathname === '/stadium'
                            || url.pathname.startsWith('/src/')
                            || url.pathname.startsWith('/node_modules/')
                            || url.pathname.startsWith('/@')
                            || url.pathname === '/seo-routes.json'
                            || /\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname);
                        if (!frontend && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')) {
                            blockedLocalReads++;
                            req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_LOCAL_ROUTE' });
                            return;
                        }
                        if (url.pathname.startsWith('/__qa__/')) return;
                        if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')) {
                            req.continue();
                        }
                    });
                    cy.intercept('**/api/**', (req) => {
                        req.reply({ statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    });
                    cy.intercept('**/auth/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_AUTH' } });
                    cy.intercept('GET', '**/auth/mypage*', { statusCode: 401, body: {} });
                    cy.intercept('POST', '**/auth/reissue*', { statusCode: 401, body: {} });
                    cy.intercept('GET', '**/api/stadiums', { statusCode: 200, body: [{
                        stadiumId: 'JAMSIL', stadiumName: '합성 갤러리 검증', team: null,
                        lat: null, lng: null, address: null, phone: null,
                    }] });
                    cy.intercept('GET', '**/api/stadiums/JAMSIL/places*', { statusCode: 200, body: [] });
                    cy.intercept('GET', '**/api/diary/seat-views*', (req) => {
                        reads++;
                        expect(new URL(req.url).searchParams.get('stadium')).to.equal('JAMSIL');
                        const reply = () => { if (mode === 'empty') emptyResponses++; req.reply(mode === 'error' ? { statusCode: 503, body: { code: 'SYNTHETIC_UNAVAILABLE' } } : { statusCode: 200, body: [] }); };
                        return mode === 'error' ? gate.then(reply) : reply();
                    }).as('seatViewPhotos');
                    cy.intercept('GET', '**/__qa__/seat-good.svg', (req) => {
                        goodReads++;
                        req.reply({ statusCode: 200, headers: { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' },
                            body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#25776b"/><text x="40" y="240" font-size="40" fill="white">SYNTHETIC IMAGE</text></svg>' });
                    });
                    cy.intercept('GET', '**/__qa__/seat-failed.svg', (req) => {
                        failedReads++;
                        req.reply({ statusCode: 404, headers: { 'cache-control': 'no-store' }, body: '' });
                    });
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    const visit = () => cy.visit('/stadium', { onBeforeLoad(win) {
                        win.localStorage.clear(); win.sessionStorage.clear();
                        win.localStorage.setItem('kbo-theme', theme);
                        win.document.documentElement.style.fontSize = `${font}px`;
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.scrollBehavior = 'auto';
                    } });
                    visit();
                    // Seed focus explicitly; opening this panel is setup, not a pointer/focus-trap acceptance claim.
                    cy.get('[data-testid="jamsil-block-search"]', { timeout: 15000 }).filter(':visible').first().focus().type('101');
                    cy.get('[data-testid="jamsil-section-finder-item-block-101"]').filter(':visible').first().focus();
                    cy.press(Cypress.Keyboard.Keys.ENTER);
                    cy.wrap(null).should(() => expect(reads).to.be.greaterThan(0));
                    cy.get<HTMLElement>('[data-testid="seat-view-gallery"]').then(($items) => {
                        const el = Array.from($items).find((candidate) => {
                            for (let parent: HTMLElement | null = candidate; parent; parent = parent.parentElement) {
                                const style = parent.ownerDocument.defaultView!.getComputedStyle(parent);
                                if (style.display === 'none' || style.visibility === 'hidden') return false;
                            }
                            return true;
                        });
                        expect(el, 'gallery in active layout, before nested scrolling').to.exist;
                        el!.setAttribute('data-qa-gallery', 'current');
                        el!.scrollIntoView({ block: 'center', behavior: 'instant' });
                    });
                    cy.get(`${gallery} .animate-pulse`).should('have.length.greaterThan', 0);
                    cy.screenshot(`stadium-gallery-${id}-loading`, { capture: 'viewport' });
                    cy.then(() => release());
                    cy.wait('@seatViewPhotos').its('response.statusCode').should('eq', 503);
                    cy.get(`${gallery} [data-testid="seat-view-query-error"]`, { timeout: 20000 }).should('be.visible').and('have.attr', 'role', 'alert').and('contain.text', '사진 조회 실패');
                    cy.get(gallery).should('not.contain.text', '아직 등록된 시야가 없어요');
                    cy.get(`${gallery} [data-testid="seat-view-query-error"]`).then(($el) => {
                        const el = $el[0];
                        observations.push({ state: 'error', text: el.innerText, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
                        if (el.scrollWidth > el.clientWidth + 1) findings.push('error notice overflows');
                    });
                    cy.screenshot(`stadium-query-${id}-error`, { capture: 'viewport' });
                    cy.then(() => { mode = 'empty'; });
                    visit();
                    cy.get('[data-testid="jamsil-block-search"]', { timeout: 15000 }).filter(':visible').first().focus().type('101');
                    cy.get('[data-testid="jamsil-section-finder-item-block-101"]').filter(':visible').first().focus();
                    cy.press(Cypress.Keyboard.Keys.ENTER);
                    cy.wrap(null, { timeout: 15000 }).should(() => expect(emptyResponses).to.be.greaterThan(0));
                    cy.get<HTMLElement>('[data-testid="seat-view-gallery"]').then(($items) => {
                        const el = Array.from($items).find((candidate) => {
                            for (let parent: HTMLElement | null = candidate; parent; parent = parent.parentElement) {
                                const style = parent.ownerDocument.defaultView!.getComputedStyle(parent);
                                if (style.display === 'none' || style.visibility === 'hidden') return false;
                            }
                            return true;
                        });
                        expect(el, 'empty gallery in active layout').to.exist;
                        el!.setAttribute('data-qa-gallery', 'current');
                        el!.scrollIntoView({ block: 'center', behavior: 'instant' });
                    });
                    cy.get(gallery).should('contain.text', '아직 등록된 시야가 없어요').and('not.contain', '사진 조회 실패');
                    cy.screenshot(`stadium-query-${id}-empty`, { capture: 'viewport' });
                    cy.document().then((doc) => {
                        expect(doc.defaultView!.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                        expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                        expect(writes).to.equal(0);
                    });
                    cy.then(persist);
                    cy.then(() => expect(findings, 'query state findings').to.deep.equal([]));
                });
            }
        }
    }
});
