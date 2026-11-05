/// <reference types="cypress" />

// Only fictional IDs, empty schedules and explicit manual-data/error contracts.
// No real game records, generated baseball facts, provider calls or votes.
describe('Prediction exact match-route guest state evidence', () => {
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width}px / ${font}px / ${theme}`, () => {
            const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl')));
            expect(origin.hostname).to.equal('127.0.0.1');
            const gameId = 'SYNTHETIC-NODATA', date = '2099-06-01', errorCard = '[data-testid="prediction-empty-state"]';
            let phase: 'manual' | 'failure' | 'empty' = 'manual', foreignBlocked = 0, release!: () => void;
            const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
            const blockedMutations: Array<{ method: string; path: string }> = [], requests: Array<Record<string, unknown>> = [];
            const findings: string[] = [], observations: Array<Record<string, unknown>> = [];
            const navigation = (day: string) => ({ date: day, games: [], prevDate: null, nextDate: null, hasPrev: false, hasNext: false });
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/prediction-match-${id}.json`, {
                width, font, theme, phase, foreignBlocked, blockedMutations, requests, observations, findings,
            });
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url), mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
                if (mutation) blockedMutations.push({ method: req.method, path: url.pathname });
                if (url.origin !== origin.origin) { foreignBlocked++; return req.reply({ forceNetworkError: true, log: false }); }
                if (mutation) return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                if (!url.pathname.startsWith('/prediction') && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                    && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
            });
            cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
            cy.intercept('**/auth/**', { statusCode: 401, body: {} });
            cy.intercept('GET', '**/api/auth/mypage*', { statusCode: 401, body: {} });
            cy.intercept('GET', '**/api/predictions/bootstrap*', (req) => {
                const currentPhase = phase, url = new URL(req.url); req.alias = `bootstrap-${currentPhase}`;
                const reply = () => {
                    const status = currentPhase === 'empty' ? 200 : 503;
                    requests.push({ kind: 'bootstrap', phase: currentPhase, status, gameId: url.searchParams.get('gameId'), date: url.searchParams.get('date') });
                    req.reply({ statusCode: status, body: currentPhase === 'manual'
                        ? { code: 'MANUAL_BASEBALL_DATA_REQUIRED', message: '운영자 제공 야구 데이터가 필요합니다.' }
                        : currentPhase === 'failure' ? { code: 'SYNTHETIC_UNAVAILABLE', message: '합성 조회 실패입니다.' }
                            : { schedule: navigation(date), selectedGameId: null, selectedGameFound: false, detail: null, voteStatus: null } });
                };
                return currentPhase === 'manual' ? gate.then(reply) : reply();
            });
            cy.intercept('GET', '**/api/matches/day*', (req) => {
                const day = new URL(req.url).searchParams.get('date') || date;
                requests.push({ kind: 'day', phase, date: day, status: 200 }); req.reply({ statusCode: 200, body: navigation(day) });
            }).as('emptyDay');
            cy.intercept('GET', '**/api/matches/bounds*', { statusCode: 200, body: { hasData: false, earliestGameDate: null, latestGameDate: null } });
            cy.viewport(width, width === 1280 ? 900 : 844);
            const visit = (path: string) => cy.visit(path, { onBeforeLoad(win) {
                win.localStorage.clear(); win.sessionStorage.clear(); win.document.cookie = 'Authorization=; max-age=0; path=/';
                win.localStorage.setItem('kbo-theme', theme); win.localStorage.setItem('bega_has_visited', 'true'); win.localStorage.setItem('bega_dont_show_guide', 'true');
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            const align = (selector: string, headingText?: string) => (headingText ? cy.contains(selector, headingText) : cy.get(selector).first()).then(($el) => {
                const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                const bottom = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect().bottom ?? 80;
                win.scrollBy({ top: el.getBoundingClientRect().top - bottom - 16, behavior: 'instant' });
            });
            const capture = (state: string, selector: string, headingText?: string) => {
                align(selector, headingText);
                (headingText ? cy.contains(selector, headingText) : cy.get(selector).first()).then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                    expect(win.matchMedia('(min-width: 1024px)').matches).to.equal(width >= 1024);
                    const auth = JSON.parse(win.localStorage.getItem('auth-storage') || '{}'); expect(auth.state?.isLoggedIn).not.to.equal(true);
                    observations.push({ state, path: win.location.pathname, search: win.location.search, text: doc.body.innerText.replace(/\s+/g, ' ').trim(),
                        documentWidth: doc.documentElement.scrollWidth, bodyWidth: doc.body.scrollWidth });
                    if (Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > doc.documentElement.clientWidth + 1) findings.push(`${state}: document overflow`);
                    if (state === 'manual-data-required') {
                        const heading = el.querySelector('h3')!, node = heading.firstChild!;
                        expect(heading.textContent).to.equal('야구 데이터 준비가 필요합니다');
                        const range = doc.createRange(), word = '필요합니다';
                        const start = heading.textContent!.indexOf(word);
                        range.setStart(node, start); range.setEnd(node, start + word.length);
                        const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
                        observations.push({ state, finalWord: word, finalWordLines: rects.length,
                            wordBreak: win.getComputedStyle(heading).wordBreak });
                        if (rects.length !== 1) findings.push(`${state}: final word split across ${rects.length} lines`);
                    }
                });
                cy.screenshot(`prediction-match-${id}-${state}`, { capture: 'viewport' }); cy.then(persist);
            };
            const measure = (state: string) => cy.get(`${errorCard} button`).each(($el) => {
                const el = $el[0], rect = el.getBoundingClientRect(); observations.push({ state, control: el.textContent?.trim(), width: rect.width, height: rect.height });
                if (rect.width < 43.99 || rect.height < 43.99) findings.push(`${state}/${el.textContent?.trim()}: below44px`);
            });
            const retry = () => { align('[data-testid="prediction-empty-retry"]'); cy.get('[data-testid="prediction-empty-retry"]').click({ scrollBehavior: false }); };
            visit(`/prediction/matches/${gameId}?date=${date}`);
            cy.contains('h3', '데이터 워밍업 중...', { timeout: 20000 }).should('exist'); capture('held-loading-text', 'h3', '데이터 워밍업 중...');
            cy.then(() => release()); cy.wait('@bootstrap-manual').then(({ request, response }) => {
                expect(response?.statusCode).to.equal(503); expect(new URL(request.url).searchParams.get('gameId')).to.equal(gameId);
                expect(new URL(request.url).searchParams.get('date')).to.equal(date);
            });
            cy.get(errorCard).should('contain.text', '야구 데이터 준비가 필요합니다').and('contain.text', '운영자가 데이터를 제공하면 다시 확인할 수 있습니다.');
            cy.location('pathname').should('equal', `/prediction/matches/${gameId}`); measure('manual'); capture('manual-data-required', errorCard);
            cy.then(() => { phase = 'failure'; }); retry(); cy.wait('@bootstrap-failure').its('response.statusCode').should('equal', 503);
            cy.get(errorCard).should('contain.text', '예측 경기 데이터를 불러오지 못했습니다.').and('not.contain.text', '야구 데이터 준비가 필요합니다');
            measure('query-error'); capture('query-error', errorCard);
            cy.then(() => { phase = 'empty'; }); retry(); cy.wait('@bootstrap-empty').its('response.statusCode').should('equal', 200);
            cy.get(errorCard).should('not.exist'); cy.contains('h3', '예정된 경기 일정이 없습니다', { timeout: 20000 }).should('exist'); capture('healthy-empty-recovery', 'h3', '예정된 경기 일정이 없습니다');
            cy.get('[data-testid="prediction-other-games-link"]').should('have.attr', 'href', `/prediction?date=${date}`);
            visit(`/prediction/matches/INVALID%20FIXTURE?date=${date}`);
            // Current route adapter omits invalid path IDs from effective query input;
            // it does not promise to redirect/normalize the address itself.
            cy.contains('h3', '예정된 경기 일정이 없습니다', { timeout: 20000 }).should('exist'); capture('invalid-id-ignored-at-boundary', 'h3', '예정된 경기 일정이 없습니다');
            cy.document().then((doc) => observations.push({ state: 'invalid-id-guidance', copyPresent: doc.body.innerText.includes('gameId 형식이 유효하지 않아') }));
            cy.getCookie('Authorization').should('not.exist');
            cy.then(() => {
                expect(blockedMutations.filter(({ path }) => /\/predictions(?:\/|$)|\/ai(?:\/|$)/.test(path))).to.deep.equal([]);
                expect(requests.filter((req) => req.kind === 'bootstrap').some((req) => String(req.gameId).includes(' '))).to.equal(false);
                observations.push({ finished: true });
            }); cy.then(persist);
            cy.then(() => expect(findings, 'Prediction match-route design findings').to.deep.equal([]));
        });
    }
});
