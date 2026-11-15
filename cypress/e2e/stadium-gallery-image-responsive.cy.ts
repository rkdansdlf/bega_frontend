/// <reference types="cypress" />

export {};

// Local fictional photo fixtures; JAMSIL/block-101 only selects existing internal UI geometry.
describe('Stadium gallery synthetic image states', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl')));
                    expect(['127.0.0.1', 'localhost', 'host.docker.internal']).to.include(origin.hostname);
                    const findings: string[] = [], observations: Array<Record<string, unknown>> = [];
                    let reads = 0, writes = 0, authWrites = 0, blockedLocalReads = 0, goodReads = 0, failedReads = 0, release!: () => void;
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
                        return gate.then(() => req.reply({ statusCode: 200, body: ['good', 'failed'].map((kind) => ({
                            photoUrl: `${origin.origin}/__qa__/seat-${kind}.svg`, stadium: '합성 갤러리 검증',
                            section: '합성 검증 구역', block: null, diaryDate: '2099-01-01',
                        })) }));
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
                    cy.visit('/stadium', { onBeforeLoad(win) {
                        win.localStorage.clear(); win.sessionStorage.clear();
                        win.localStorage.setItem('kbo-theme', theme);
                        win.document.documentElement.style.fontSize = `${font}px`;
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.scrollBehavior = 'auto';
                    } });
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
                    cy.wait('@seatViewPhotos').then(({ response }) => {
                        expect(response?.statusCode).to.equal(200);
                        expect(response?.body).to.have.length(2);
                    });
                    cy.get(`${photo(0)} img`).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                    cy.get(`${photo(0)} img`).should(($el) => expect(($el[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0));
                    cy.get(photo(1)).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                    cy.get(`${photo(1)} [data-testid="seat-view-image-fallback"]`).should('be.visible')
                        .and('have.attr', 'role', 'img').and('have.attr', 'aria-label', '시야 사진을 불러오지 못했습니다.');
                    cy.get(`${photo(1)} img`).should('not.exist');
                    cy.get(photo(1)).should('have.attr', 'aria-label').and('include', '확대 보기');
                    const hasVisibleFallback = (el: HTMLElement) => {
                        const visible = (node: Element) => Cypress.dom.isVisible(Cypress.$(node as HTMLElement));
                        const graphic = Array.from(el.querySelectorAll('svg,[role="img"],[data-testid*="fallback"]'))
                            .some((node) => !node.closest(close) && visible(node));
                        const copy = Array.from(el.querySelectorAll('p,span,[role="status"],[role="alert"]'))
                            .some((node) => /불러|실패|사진.*없|이미지.*없|대체|unavailable|failed|error/i.test(node.textContent ?? '') && visible(node));
                        return graphic || copy;
                    };
                    const closeAfterMeasurement = (state: string) => {
                        cy.then(() => {
                            const metric = observations.find((item) => item.state === state);
                            if (metric?.receivesPointer) cy.get(close).click();
                            else {
                                observations.push({ setup: 'keyboard-close-after-obstructed-pointer', state });
                                cy.get(close).focus(); cy.press(Cypress.Keyboard.Keys.SPACE);
                            }
                        });
                        cy.get(box).should('not.exist');
                    };
                    const measure = (selector: string, state: string, requireFallback = false) => {
                        cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(selector).then(($el) => {
                            const el = $el[0] as HTMLElement, doc = el.ownerDocument, win = doc.defaultView!;
                            const r = el.getBoundingClientRect(), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                            const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                            const visibleFallback = hasVisibleFallback(el);
                            observations.push({ state, width: r.width, height: r.height, left: r.left, right: r.right, top: r.top, bottom: r.bottom,
                                receivesPointer, visibleFallback, accessibleLabel: el.getAttribute('aria-label'),
                                hitTag: hit?.tagName, hitClass: hit?.getAttribute('class'),
                                hitTestId: hit?.closest('[data-testid]')?.getAttribute('data-testid'),
                                images: Array.from(el.querySelectorAll('img')).map((img) => ({ complete: img.complete,
                                    naturalWidth: img.naturalWidth, display: win.getComputedStyle(img).display, alt: img.alt })) });
                            if (r.width < 44 || r.height < 44 || r.left < -1 || r.right > width + 1 || !receivesPointer) findings.push(`${state}: size/bounds/center`);
                            if (requireFallback && !visibleFallback) findings.push(`${state}: no visible image fallback`);
                        });
                        cy.screenshot(`stadium-gallery-${id}-${state}`, { capture: 'viewport' });
                        cy.then(persist);
                    };
                    measure(photo(0), 'loaded-thumbnail');
                    measure(photo(1), 'failed-thumbnail', true);
                    cy.get(photo(0)).focus(); cy.press(Cypress.Keyboard.Keys.SPACE);
                    cy.get(`${box} img`).should(($el) => expect(($el[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0));
                    measure(close, 'loaded-lightbox-close');
                    closeAfterMeasurement('loaded-lightbox-close');
                    // Keep a collapsed failure observable; keyboard setup does not erase failed pointer measurements.
                    cy.get(photo(1)).focus(); cy.press(Cypress.Keyboard.Keys.SPACE);
                    cy.get(`${box} [data-testid="seat-view-image-fallback"]`).should('be.visible')
                        .and('have.attr', 'aria-label', '시야 사진을 불러오지 못했습니다.')
                        .and('contain.text', '사진을 불러오지 못했어요');
                    cy.get(`${box} img`).should('not.exist');
                    cy.get(box).then(($el) => {
                        const fallback = hasVisibleFallback($el[0]);
                        observations.push({ state: 'failed-lightbox', fallback });
                        if (!fallback) findings.push('failed-lightbox: no explicit failure/fallback presentation');
                    });
                    measure(close, 'failed-lightbox-close');
                    closeAfterMeasurement('failed-lightbox-close');
                    cy.document().then((doc) => {
                        expect(doc.defaultView!.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                        expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                        expect(writes).to.equal(0); expect(goodReads).to.be.greaterThan(0); expect(failedReads).to.be.greaterThan(0);
                        observations.push({ finished: true, documentWidth: Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) });
                    });
                    cy.then(persist);
                    cy.then(() => expect(findings, 'gallery design findings').to.deep.equal([]));
                });
            }
        }
    }
});
