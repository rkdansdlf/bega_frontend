/// <reference types="cypress" />

export {};

// Fictional local UI fixtures. No coordinates, real venues or provider responses.
const stadium = { stadiumId: 'QA_SYNTH', stadiumName: '합성 구장', team: null, lat: null, lng: null, address: '가상 검증 주소', phone: null };
const places = [{ id: 99101, stadiumName: '합성 구장', category: 'food', name: '합성 장소 가',
    description: '실제 매장 정보가 아닌 로컬 합성 설명입니다. 펼친 상태의 긴 문구도 확인합니다.',
    lat: null, lng: null, address: '가상 상세 주소', phone: null, rating: null, openTime: null, closeTime: null }];

describe('Stadium synthetic responsive state flow', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    const findings: string[] = [], observations: Array<Record<string, unknown>> = [];
                    let stadiumMode: 'held-error' | 'empty' | 'data' = 'held-error';
                    let placeMode: 'held-error' | 'empty' | 'data' = 'held-error';
                    let stadiumReads = 0, placeReads = 0, unknownWrites = 0, releaseStadium!: () => void, releasePlace!: () => void;
                    const stadiumGate = new Cypress.Promise<void>((resolve) => { releaseStadium = resolve; });
                    const placeGate = new Cypress.Promise<void>((resolve) => { releasePlace = resolve; });
                    const root = '[data-testid="stadium-guide-runtime"]';
                    const side = `[data-testid="stadium-guide-${width >= 1024 ? 'desktop' : 'mobile'}-panels"]`;
                    const panel = `${side} [data-testid="stadium-guide-places-panel"]`;
                    const search = `${panel} input`, sort = `${panel} select`;
                    const card = `${panel} [id="place-99101"]`;
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        if (new URL(req.url).origin !== origin.origin) req.reply({ forceNetworkError: true, log: false });
                    });
                    cy.intercept('**/api/**', (req) => {
                        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) unknownWrites++;
                        req.reply({ statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    });
                    cy.intercept('GET', '**/auth/mypage*', { statusCode: 401, body: {} });
                    cy.intercept('POST', '**/auth/reissue*', { statusCode: 401, body: {} });
                    cy.intercept('GET', '**/api/stadiums', (req) => {
                        stadiumReads++;
                        const reply = () => {
                            const statusCode = stadiumMode === 'held-error' ? 503 : 200;
                            observations.push({ response: 'stadiums', mode: stadiumMode, statusCode });
                            req.reply({ statusCode, body: statusCode === 503 ? { code: 'SYNTHETIC_UNAVAILABLE' } : stadiumMode === 'empty' ? [] : [stadium] });
                        };
                        return stadiumMode === 'held-error' ? stadiumGate.then(reply) : reply();
                    });
                    cy.intercept('GET', '**/api/stadiums/QA_SYNTH/places*', (req) => {
                        placeReads++;
                        expect(new URL(req.url).searchParams.get('category')).to.equal('food');
                        const reply = () => {
                            const statusCode = placeMode === 'held-error' ? 503 : 200;
                            observations.push({ response: 'places', mode: placeMode, statusCode });
                            req.reply({ statusCode, body: statusCode === 503 ? { code: 'SYNTHETIC_UNAVAILABLE' } : placeMode === 'empty' ? [] : places });
                        };
                        return placeMode === 'held-error' ? placeGate.then(reply) : reply();
                    });
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    const visit = () => cy.visit('/stadium', { onBeforeLoad(win) {
                        win.localStorage.clear(); win.sessionStorage.clear();
                        win.localStorage.setItem('kbo-theme', theme);
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.fontSize = `${font}px`;
                        win.document.documentElement.style.scrollBehavior = 'auto';
                    } });
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/stadium-state-${id}.json`, { width, font, theme, findings, observations });
                    const snapshot = (state: string) => {
                        cy.document().then((doc) => doc.fonts.ready);
                        cy.get('[data-testid="stadium-guide-title"]').should('be.visible');
                        if (width < 768) cy.get('[data-testid="public-mobile-bottom-nav"]').should('be.visible');
                        cy.get(root).then(($root) => {
                            const doc = $root[0].ownerDocument, win = doc.defaultView!;
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                            const documentWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth);
                            if (documentWidth > width + 1) findings.push(`${state}: document overflow`);
                            const copy = Array.from($root[0].querySelectorAll<HTMLElement>('h1,h3,h4,p,span.text-body,.stadium-guide-scroll-area .text-center')).filter((el) => el.getClientRects().length).map((el) => {
                                const r = el.getBoundingClientRect(), s = win.getComputedStyle(el);
                                const previewClamp = s.webkitLineClamp !== 'none' && Number(s.webkitLineClamp) > 0;
                                if (r.width <= 0 || r.height <= 0 || r.left < -1 || r.right > width + 1 || el.scrollWidth > el.clientWidth + 1
                                    || (!previewClamp && ['hidden', 'clip'].includes(s.overflowY) && el.scrollHeight > el.clientHeight + 1)) findings.push(`${state}: copy bounds/clipping ${el.textContent?.slice(0, 45)}`);
                                return { text: el.textContent, width: r.width, height: r.height, left: r.left, right: r.right,
                                    clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, clientHeight: el.clientHeight,
                                    scrollHeight: el.scrollHeight, previewClamp, overflowY: s.overflowY };
                            });
                            observations.push({ state, documentWidth, copy });
                            win.scrollTo({ top: 0, behavior: 'instant' });
                        });
                        cy.screenshot(`stadium-state-${id}-${state}-top`, { capture: 'viewport' });
                        cy.get(panel).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.screenshot(`stadium-state-${id}-${state}-panel`, { capture: 'viewport' });
                        cy.get(panel).then(($panel) => {
                            for (const el of $panel[0].querySelectorAll<HTMLElement>('.stadium-guide-scroll-area')) {
                                el.scrollTop = el.scrollHeight;
                                observations.push({ nestedScroll: state, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, scrollTop: el.scrollTop });
                            }
                        });
                        cy.screenshot(`stadium-state-${id}-${state}-panel-end`, { capture: 'viewport' });
                        cy.then(persist);
                    };
                    const control = (selector: string, state: string) => {
                        cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(selector).then(($el) => {
                            const el = $el[0] as HTMLInputElement | HTMLButtonElement | HTMLSelectElement, doc = el.ownerDocument;
                            const r = el.getBoundingClientRect(), style = doc.defaultView!.getComputedStyle(el);
                            const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                            const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                            observations.push({ control: selector, state, width: r.width, height: r.height, disabled: el.disabled,
                                receivesPointer, hit: hit?.tagName, hitText: hit?.textContent?.slice(0, 45),
                                hitSvgClass: hit?.closest('svg')?.getAttribute('class'),
                                overflowY: style.overflowY, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight });
                            if (r.width < 44 || r.height < 44 || r.left < -1 || r.right > width + 1 || (!el.disabled && !receivesPointer)
                                || (el.tagName === 'BUTTON' && el.scrollWidth > el.clientWidth + 1)
                                || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1)) findings.push(`${state}: control size/bounds/reachability ${selector}`);
                        });
                    };
                    visit();
                    cy.wrap(null).should(() => expect(stadiumReads).to.be.greaterThan(0));
                    cy.get('#stadium-guide-select').should('be.disabled').and('have.attr', 'aria-busy', 'true');
                    snapshot('stadiums-loading');
                    control('#stadium-guide-select', 'stadiums-loading');
                    cy.then(() => releaseStadium());
                    cy.contains(`${root} span`, '구장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.', { timeout: 10000 }).should('be.visible');
                    snapshot('stadiums-error');
                    cy.contains(`${root} button`, /^재시도$/).then(($el) => $el.attr('data-qa-retry', 'stadiums'));
                    control('[data-qa-retry="stadiums"]', 'stadiums-error');
                    cy.then(() => { stadiumMode = 'empty'; });
                    cy.get('[data-qa-retry="stadiums"]').click();
                    cy.get('#stadium-guide-select').should('be.disabled').and('contain.text', '등록된 구장이 없습니다.');
                    snapshot('stadiums-empty');
                    cy.then(() => { stadiumMode = 'data'; }); visit();
                    cy.wrap(null).should(() => expect(placeReads).to.be.greaterThan(0));
                    cy.get(`${panel} .stadium-guide-loading-block`).should('exist');
                    snapshot('places-loading');
                    control(search, 'places-loading'); control(sort, 'places-loading');
                    cy.then(() => releasePlace());
                    cy.contains(`${panel} span`, '장소 목록을 불러오지 못했습니다.', { timeout: 10000 }).should('be.visible');
                    snapshot('places-error');
                    cy.contains(`${panel} button`, '목록 다시 시도').then(($el) => $el.attr('data-qa-retry', 'places'));
                    control('[data-qa-retry="places"]', 'places-error');
                    cy.then(() => { placeMode = 'empty'; });
                    cy.get('[data-qa-retry="places"]').click();
                    cy.contains(panel, '해당 카테고리에 등록된 장소가 없습니다.').should('be.visible');
                    snapshot('places-empty');
                    cy.then(() => { placeMode = 'data'; }); visit();
                    cy.get(card).should('be.visible').and('have.attr', 'data-expanded', 'false');
                    snapshot('places-data');
                    control(search, 'places-data'); control(sort, 'places-data'); control(`${card} [role="button"]`, 'places-data');
                    cy.get(`${card} [role="button"]`).focus(); cy.press(Cypress.Keyboard.Keys.ENTER);
                    cy.get(card).should('have.attr', 'data-expanded', 'true');
                    for (const text of ['가상 상세 주소', '좌표 정보가 없어 길찾기를 제공할 수 없습니다.']) {
                        cy.contains(`${card} p`, text).should('exist').then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.contains(`${card} p`, text).then(($el) => {
                            const r = $el[0].getBoundingClientRect();
                            const visible = r.width > 0 && r.height > 0 && Cypress.dom.isVisible($el);
                            observations.push({ expandedCopy: text, visible, width: r.width, height: r.height });
                            if (!visible) findings.push(`place-expanded: essential copy not visible ${text}`);
                        });
                    }
                    cy.get(`${card} button`).should('be.disabled');
                    snapshot('place-expanded');
                    control(`${card} button`, 'place-expanded');
                    // Typed-flow evidence is distinct from input-center coverage above.
                    cy.get(search).focus().type('없는합성결과');
                    cy.get(panel).should('have.attr', 'data-result-count', '0');
                    cy.contains(panel, "'없는합성결과'에 해당하는 장소가 없습니다.").should('be.visible');
                    snapshot('search-zero');
                    cy.get(search).clear();
                    cy.get(card).should('exist');
                    cy.get(sort).select('name');
                    cy.get(panel).should('have.attr', 'data-sort-order', 'name');
                    cy.then(() => {
                        expect(unknownWrites).to.equal(0);
                        observations.push({ flow: 'both-retries-and-search-recovered', stadiumReads, placeReads, unknownWrites });
                    });
                    cy.then(persist);
                    cy.then(() => expect(findings, 'stadium visual findings').to.deep.equal([]));
                });
            }
        }
    }
});
