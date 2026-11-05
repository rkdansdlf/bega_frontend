/// <reference types="cypress" />

export {};

// Clearly non-production mock records, not claims about baseball facts.
const syntheticMovements = [{ id: 99301, date: '2099-11-21', section: 'FA', team: 'HH', player: '합성선수가',
    remarks: '로컬 합성 검증 자료입니다.', isBigEvent: true, estimatedAmount: 0 }];
const syntheticAwards = [{ award: '합성 검증상', playerName: '가상 수상자', team: 'QA', stats: '로컬 UI 검증용 가상 기록' }];
const syntheticRankings = [{ rank: 1, teamId: 'QA', teamName: '합성 검증팀', wins: 0, losses: 0, draws: 0, winRate: '.000', games: 0 }];

describe('Offseason home synthetic state matrix', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    const findings: string[] = [], observations: Array<Record<string, unknown>> = [];
                    let mode: 'empty' | 'populated' | 'manual' | 'partial' | 'all-error' = 'empty';
                    let requests = 0, unknownWrites = 0, release!: () => void;
                    const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
                    const primary = '[data-testid="offseason-home-primary-runtime"]';
                    const news = '[data-testid="offseason-home-news-runtime"]';
                    const highlights = '[data-testid="offseason-home-highlights-runtime"]';
                    const manual = '[data-testid="offseason-manual-data-required"]';
                    const back = '[data-testid="offseason-home-back"]', list = '[data-testid="offseason-home-list-link"]';
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        if (new URL(req.url).origin !== origin.origin) req.reply({ statusCode: 204, log: false });
                    });
                    cy.intercept('**/api/**', (req) => {
                        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) unknownWrites++;
                        req.reply({ statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    });
                    cy.intercept('GET', '**/auth/mypage*', { statusCode: 401, body: {} });
                    cy.intercept('POST', '**/auth/reissue*', { statusCode: 401, body: {} });
                    for (const endpoint of ['movements', 'metadata', 'rankings'] as const) {
                        const url = endpoint === 'rankings' ? '**/api/kbo/rankings/2025*' : `**/api/kbo/offseason/${endpoint}*`;
                        cy.intercept('GET', url, (req) => {
                            requests++;
                            if (endpoint === 'metadata') expect(new URL(req.url).searchParams.get('year')).to.equal('2025');
                            const respond = (statusCode: number, body: unknown) => {
                                observations.push({ response: true, mode, endpoint, statusCode });
                                req.reply({ statusCode, body });
                            };
                            const reply = () => {
                                if (mode === 'manual' && endpoint === 'metadata') return respond(409, {
                                    success: false, code: 'MANUAL_BASEBALL_DATA_REQUIRED',
                                    message: '검증된 내부 자료가 필요합니다.', data: { scope: 'kbo.offseason.metadata', missingItems: [], blocking: true },
                                });
                                if (mode === 'all-error' || (mode === 'partial' && endpoint !== 'movements')) {
                                    return respond(503, { code: 'SYNTHETIC_UNAVAILABLE' });
                                }
                                const populated = mode === 'populated' || mode === 'partial';
                                const body = endpoint === 'movements' ? (populated ? syntheticMovements : [])
                                    : endpoint === 'metadata' ? { awards: populated ? syntheticAwards : [] }
                                    : { rankingSeasonYear: 2025, rankingSourceMessage: '로컬 합성 검증', isOffSeason: true,
                                        rankings: populated ? syntheticRankings : [] };
                                respond(200, body);
                            };
                            return mode === 'empty' ? gate.then(reply) : reply();
                        });
                    }
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    const visit = () => cy.visit('/offseason', { onBeforeLoad(win) {
                        win.localStorage.clear(); win.sessionStorage.clear();
                        win.localStorage.setItem('kbo-theme', theme);
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.fontSize = `${font}px`;
                        win.document.documentElement.style.scrollBehavior = 'auto';
                    } });
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/offseason-home-${id}.json`, { width, font, theme, findings, observations });
                    const snapshot = (state: string) => {
                        cy.document().then((doc) => doc.fonts.ready);
                        if (width < 768) cy.get('[data-testid="public-mobile-bottom-nav"]').should('be.visible');
                        cy.get(primary).should('be.visible');
                        cy.get(`${primary} > section h2`).should('be.visible').and('contain.text', '스토브리그 하이라이트');
                        cy.get(primary).then(($root) => {
                            const root = $root[0], doc = root.ownerDocument, win = doc.defaultView!;
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                            const documentWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth);
                            if (documentWidth > width + 1) findings.push(`${state}: document overflow`);
                            const copy = Array.from(root.querySelectorAll<HTMLElement>('h2,h3,h4,p')).filter((el) => el.getClientRects().length).map((el) => {
                                const r = el.getBoundingClientRect(), s = win.getComputedStyle(el);
                                const previewClamp = el.classList.contains('line-clamp-2');
                                if (r.width <= 0 || r.height <= 0 || r.left < -1 || r.right > width + 1 || el.scrollWidth > el.clientWidth + 1
                                    || (!previewClamp && ['hidden', 'clip'].includes(s.overflowY) && el.scrollHeight > el.clientHeight + 1)) findings.push(`${state}: copy bounds/clipping ${el.textContent?.slice(0, 45)}`);
                                return { text: el.textContent, width: r.width, height: r.height, left: r.left, right: r.right,
                                    clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, clientHeight: el.clientHeight,
                                    scrollHeight: el.scrollHeight, overflowY: s.overflowY, previewClamp };
                            });
                            observations.push({ state, documentWidth, copy, manualPanel: Boolean(doc.querySelector(manual)),
                                highlights: Boolean(doc.querySelector(highlights)), loadingCards: doc.querySelectorAll(`${news} .animate-pulse`).length });
                            win.scrollTo({ top: 0, behavior: 'instant' });
                        });
                        cy.screenshot(`offseason-home-${id}-${state}-top`, { capture: 'viewport' });
                        cy.get(`${primary} > section h2`).then(($el) => {
                            const heading = $el[0], doc = heading.ownerDocument, intro = heading.nextElementSibling!;
                            const dock = doc.querySelector<HTMLElement>('[data-testid="public-mobile-bottom-nav"]');
                            if (dock && dock.getBoundingClientRect().height > 0) {
                                const bottom = intro.getBoundingClientRect().bottom, dockTop = dock.getBoundingClientRect().top;
                                observations.push({ firstFold: state, introBottom: bottom, dockTop });
                                if (bottom > dockTop - 8) findings.push(`${state}: first-fold hero/dock clearance`);
                            }
                        });
                        cy.get(state === 'manual' ? manual : news).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.screenshot(`offseason-home-${id}-${state}-content`, { capture: 'viewport' });
                        cy.window().then((win) => win.scrollTo({ top: win.document.documentElement.scrollHeight, behavior: 'instant' }));
                        cy.screenshot(`offseason-home-${id}-${state}-bottom`, { capture: 'viewport' });
                        cy.then(persist);
                    };
                    const control = (selector: string, state: string) => {
                        cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(selector).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, r = el.getBoundingClientRect();
                            const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                            const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                            observations.push({ control: el.getAttribute('data-testid'), state, width: r.width, height: r.height, receivesPointer });
                            if (r.width < 44 || r.height < 44 || r.left < -1 || r.right > width + 1 || !receivesPointer || el.scrollWidth > el.clientWidth + 1) findings.push(`${state}: control size/bounds/reachability`);
                        });
                    };
                    visit();
                    cy.wrap(null).should(() => expect(requests, 'all three local requests reached held responses').to.equal(3));
                    cy.get(`${news} .animate-pulse`).should('have.length', 4);
                    cy.get(highlights).should('exist');
                    snapshot('loading');
                    control(back, 'loading'); control(list, 'loading');
                    cy.then(() => release());
                    cy.contains(`${news} p`, '아직 등록된 주요 이적 소식이 없습니다.').should('be.visible');
                    cy.get(`${news} .animate-pulse`).should('not.exist');
                    snapshot('empty');
                    control(back, 'empty'); control(list, 'empty');
                    for (const state of ['populated', 'manual', 'partial', 'all-error'] as const) {
                        cy.then(() => { mode = state; }); visit();
                        if (state === 'populated' || state === 'partial') cy.contains(`${news} p`, '합성선수가').should('be.visible');
                        else cy.contains(`${news} p`, '아직 등록된 주요 이적 소식이 없습니다.').should('be.visible');
                        if (state === 'manual') {
                            cy.get(manual).should('be.visible').and('have.attr', 'role', 'status');
                            cy.get(`${manual} h3`).should('be.visible').and('contain.text', '요청한 시즌 결과는 아직 준비되지 않았습니다.');
                            cy.get(`${manual} p`).should('be.visible').and('contain.text', '운영자가 검증된 내부 자료를 제공하면 다시 표시됩니다.');
                            cy.get(highlights).should('not.exist');
                        } else cy.get(highlights).should('exist');
                        if (state === 'partial' || state === 'all-error') {
                            cy.get(manual).should('not.exist');
                            cy.contains(`${highlights} p`, '가상 수상자').should('not.exist');
                            cy.contains(`${highlights} table`, '합성 검증팀').should('not.exist');
                        }
                        if (state === 'populated') {
                            cy.contains(`${highlights} p`, '가상 수상자').should('be.visible');
                            cy.contains(`${highlights} table`, '합성 검증팀').should('exist');
                        }
                        snapshot(state);
                        control(back, state); control(list, state);
                    }
                    cy.get(back).focus(); cy.press(Cypress.Keyboard.Keys.TAB);
                    cy.focused().should('have.attr', 'data-testid', 'offseason-home-list-link').then(($el) => {
                        expect($el[0].matches(':focus-visible')).to.equal(true);
                        observations.push({ focus: 'native-tab-back-to-list', focusVisible: true });
                    });
                    cy.get(list).click();
                    cy.location('pathname').should('equal', '/offseason/list');
                    cy.then(() => {
                        expect(unknownWrites).to.equal(0);
                        const texts = (state: string) => (observations.find((x) => x.state === state && x.copy)?.copy as Array<{ text: string }>).map((x) => x.text);
                        observations.push({ comparison: 'empty-vs-all-error-selected-copy', identical: JSON.stringify(texts('empty')) === JSON.stringify(texts('all-error')) });
                        observations.push({ navigation: 'list', requests, unknownWrites });
                    });
                    cy.then(persist);
                    cy.then(() => expect(findings, 'offseason-home visual findings').to.deep.equal([]));
                });
            }
        }
    }
});
