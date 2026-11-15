/// <reference types="cypress" />

describe('Home clean-guest manual/error/empty presentation', () => {
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width}px / ${font}px / ${theme}`, () => {
            const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const panel = '[data-testid="home-match-priority-panel"]', recovery = '[data-testid="home-global-recovery"]';
            const date = '2099-06-01';
            let phase: 'manual' | 'failure' | 'empty' = 'manual', release!: () => void, foreignBlocked = 0, authReads = 0;
            const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
            const mutations: Array<{ method: string; path: string }> = [], responses: Array<Record<string, unknown>> = [], findings: string[] = [], observations: Array<Record<string, unknown>> = [];
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/home-guest-${id}.json`, { width, font, theme, phase, foreignBlocked, authReads, mutations, responses, findings, observations });
            const manual = { scope: 'home.schedule', missingItems: [{ key: 'game_date', label: 'SYNTHETIC_OPERATOR_ONLY', reason: '합성 누락 상태', expected_format: 'YYYY-MM-DD' }], operatorMessage: 'SYNTHETIC_OPERATOR_ONLY', blocking: true };
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url), mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
                if (mutation) mutations.push({ method: req.method, path: url.pathname });
                if (url.origin !== origin) { foreignBlocked++; return req.reply({ forceNetworkError: true, log: false }); }
                if (mutation) return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                if (url.pathname !== '/home' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                    && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
            });
            cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
            cy.intercept('**/auth/**', { statusCode: 401, body: {} });
            cy.intercept('GET', '**/api/auth/mypage*', (req) => { authReads++; req.reply({ statusCode: 401, body: {} }); });
            cy.intercept('GET', '**/api/home/bootstrap*', (req) => {
                const current = phase, requestedDate = new URL(req.url).searchParams.get('date'); req.alias = `home-${current}`;
                const reply = () => {
                    const status = current === 'manual' ? 409 : current === 'failure' ? 503 : 200;
                    responses.push({ phase: current, status, date: requestedDate });
                    req.reply({ statusCode: status, body: current === 'manual'
                        ? { code: 'MANUAL_BASEBALL_DATA_REQUIRED', message: '운영자가 데이터를 제공하면 다시 확인할 수 있습니다.', data: manual }
                        : current === 'failure' ? { code: 'SYNTHETIC_UNAVAILABLE', message: '합성 연결 실패입니다.' }
                            : { selectedDate: date,
                                // Future routing-only markers, not a real season/schedule.
                                leagueStartDates: { regularSeasonStart: '2099-01-01', postseasonStart: null, koreanSeriesStart: null },
                                navigation: { hasPrev: false, hasNext: false, prevGameDate: null, nextGameDate: null },
                                games: [], scheduledGamesWindow: [], loadState: { isFallback: false, timedOut: false, timedOutSections: [], failedSections: [] } } });
                };
                return current === 'manual' ? gate.then(reply) : reply();
            });
            cy.intercept('GET', '**/api/home/widgets*', { statusCode: 200, body: { hotCheerPosts: [], featuredMates: [],
                rankingSnapshot: { rankingSeasonYear: 2099, rankingSourceMessage: '합성 빈 위젯', isOffSeason: false, rankings: [] } } });
            cy.viewport(width, width === 1280 ? 900 : 844);
            cy.visit(`/home?date=${date}&tab=regular`, { onBeforeLoad(win) {
                win.localStorage.clear(); win.sessionStorage.clear(); win.document.cookie = 'Authorization=; max-age=0; path=/';
                win.localStorage.setItem('kbo-theme', theme); win.localStorage.setItem('bega_has_visited', 'true'); win.localStorage.setItem('bega_dont_show_guide', 'true');
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            const align = (el: HTMLElement) => {
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                const bottom = el.ownerDocument.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect().bottom ?? 80;
                el.ownerDocument.defaultView!.scrollBy({ top: el.getBoundingClientRect().top - bottom - 16, behavior: 'instant' });
            };
            const capture = (state: string, selector: string) => {
                cy.document().then((doc) => doc.fonts.ready);
                cy.get(selector).first().then(($el) => {
                    align($el[0]); const doc = $el[0].ownerDocument, win = doc.defaultView!;
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                    expect(win.matchMedia('(min-width: 1024px)').matches).to.equal(width >= 1024);
                    expect(doc.cookie.includes('Authorization=')).to.equal(false);
                    expect(doc.body.innerText).not.to.include('SYNTHETIC_OPERATOR_ONLY');
                    observations.push({ state, path: win.location.pathname, search: win.location.search, text: $el[0].innerText,
                        documentWidth: doc.documentElement.scrollWidth, bodyWidth: doc.body.scrollWidth });
                    if (Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > doc.documentElement.clientWidth + 1) findings.push(`${state}: document overflow`);
                }); cy.screenshot(`home-guest-${id}-${state}`, { capture: 'viewport' }); cy.then(persist);
            };
            const measure = (state: string, selector: string) => cy.get(selector).each(($el) => {
                const el = $el[0], r = el.getBoundingClientRect(); observations.push({ state, control: el.textContent?.trim(), width: r.width, height: r.height });
                if (r.width < 43.99 || r.height < 43.99) findings.push(`${state}: control below44px`);
            });
            const measureWord = (state: string, selector: string, index: number, word: string) => cy.get(selector).eq(index).then(($el) => {
                const el = $el[0], doc = el.ownerDocument, node = el.firstChild!;
                const start = node.textContent!.indexOf(word); expect(start).to.be.at.least(0);
                const range = doc.createRange(); range.setStart(node, start); range.setEnd(node, start + word.length);
                const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
                observations.push({ state, word, lines: rects.length, paragraphWidth: el.getBoundingClientRect().width,
                    paragraphHeight: el.getBoundingClientRect().height });
                if (rects.length !== 1) findings.push(`${state}: ${word} split across ${rects.length} lines`);
            });
            cy.get(panel, { timeout: 20000 }).should('exist'); cy.get(`${panel} .animate-pulse`).should('exist'); capture('held-loading', panel);
            cy.then(() => release()); cy.wait('@home-manual').its('response.statusCode').should('equal', 409);
            cy.get(panel).should('contain.text', '야구 데이터 준비가 필요합니다'); cy.get(recovery).should('not.exist');
            capture('manual-data-required', panel); measure('manual-retry', `${panel} button`);
            measureWord('manual-description', `${panel} p`, 1, '있습니다.');
            cy.then(() => { phase = 'failure'; }); cy.get(`${panel} button`).then(($el) => align($el[0])); cy.get(`${panel} button`).click({ scrollBehavior: false });
            cy.get(recovery, { timeout: 20000 }).should('contain.text', '서비스 연결을 확인하지 못했습니다');
            cy.get(panel).should('contain.text', '경기 일정을 불러오지 못했습니다');
            capture('generic-connection-error', recovery); measure('global-retry', `${recovery} button`);
            measureWord('recovery-heading', `${recovery} p`, 0, '서비스');
            cy.then(() => { phase = 'empty'; }); cy.get(`${recovery} button`).then(($el) => align($el[0])); cy.get(`${recovery} button`).click({ scrollBehavior: false });
            cy.wait('@home-empty'); cy.get(recovery).should('not.exist'); cy.get(panel).should('contain.text', '경기가 없는 날입니다.');
            capture('healthy-empty-retry', panel);
            cy.get('[data-testid="home-date-prev"],[data-testid="home-date-next"]').should('be.disabled');
            cy.then(() => {
                expect(responses.every((response) => response.date === date)).to.equal(true);
                expect(authReads).to.equal(0); expect(mutations).to.deep.equal([]); observations.push({ finished: true });
            }); cy.then(persist); cy.then(() => expect(findings, 'Home guest design findings').to.deep.equal([]));
        });
    }
});
