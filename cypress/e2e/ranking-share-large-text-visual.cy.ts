/// <reference types="cypress" />

// Fictional prediction order/results. IDs are the checked-in prediction-store
// identifiers, not externally obtained or claimed actual baseball results.
const teamIds = ['samsung', 'lg', 'doosan', 'kt', 'ssg', 'kiwoom', 'hanwha', 'nc', 'lotte', 'kia'];
const shareId = '00000000-0000-4000-8000-000000009251';
const year = 2099;
const path = `/predictions/ranking/share/${shareId}/${year}`;
const prediction = { id: 99251, shareId, seasonYear: year, teamIdsInOrder: teamIds,
    createdAt: '2099-05-01T00:00:00Z', exactMatchCount: null, settledAt: null };
const settled = { ...prediction, settledAt: '2099-11-01T00:00:00Z', exactMatchCount: 5,
    teamDetails: teamIds.map((teamId, index) => ({ teamId, teamName: `합성 결과 팀 ${index + 1}`,
        currentRank: index < 5 ? index + 1 : index === 9 ? 6 : index + 2, lastSeasonRank: null })) };

describe('Shared ranking synthetic loading/data/error large-text matrix', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`;
                    const origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    expect([...settled.teamDetails.map((team) => team.currentRank)].sort((a, b) => a - b)).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
                    expect(settled.teamDetails.filter((team, index) => team.currentRank === index + 1)).to.have.length(5);
                    const issues: string[] = [];
                    const checkpoints: Array<Record<string, unknown>> = [];
                    let mode: 'pending' | 'settled' | '404' | '503' = 'pending';
                    let release!: () => void;
                    const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
                    let writes = 0;
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        if (new URL(req.url).origin !== origin.origin) req.reply({ statusCode: 204, log: false });
                    });
                    cy.intercept('**/api/**', (req) => {
                        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) writes++;
                        req.reply({ statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    });
                    cy.intercept('GET', '**/auth/mypage*', { statusCode: 401, body: { code: 'SYNTHETIC_GUEST' } });
                    cy.intercept('POST', '**/auth/reissue*', { statusCode: 401, body: { code: 'SYNTHETIC_GUEST' } });
                    cy.intercept('GET', `**/api/predictions/ranking/share/${shareId}/${year}`, (req) => {
                        if (mode === 'pending') return gate.then(() => req.reply({ statusCode: 200, body: prediction }));
                        if (mode === 'settled') return req.reply({ statusCode: 200, body: settled });
                        req.reply(mode === '404'
                            ? { statusCode: 404, body: { code: 'RANKING_PREDICTION_SHARE_NOT_FOUND', message: '공유된 시즌 순위 예측을 찾을 수 없습니다.' } }
                            : { statusCode: 503, body: { code: 'SYNTHETIC_UNAVAILABLE' } });
                    }).as('share');
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    const visit = () => cy.visit(path, { onBeforeLoad(win) {
                        win.localStorage.clear();
                        win.sessionStorage.clear();
                        win.localStorage.setItem('kbo-theme', theme);
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.fontSize = `${font}px`;
                        win.document.documentElement.style.scrollBehavior = 'auto';
                    } });
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/ranking-share-${id}.json`, { width, font, theme, issues, checkpoints });
                    const snapshot = (state: string) => {
                        cy.document().then((doc) => doc.fonts.ready);
                        cy.get('main').then(($root) => {
                            const root = $root[0], doc = root.ownerDocument, win = doc.defaultView!;
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                            if (doc.documentElement.scrollWidth > width + 1) issues.push(`${state}: document overflow`);
                            const copy = Array.from(root.querySelectorAll<HTMLElement>('h1,h2,p,[role="alert"],[data-testid^="ranking-row-"] span,[data-testid^="ranking-result-row-"] span,[data-testid="ranking-result-score"]')).filter((el) => el.getClientRects().length && win.getComputedStyle(el).visibility !== 'hidden').map((el) => {
                                const rect = el.getBoundingClientRect(), style = win.getComputedStyle(el);
                                if (!rect.width && !rect.height) return null;
                                if (rect.width <= 0 || rect.height <= 0 || rect.left < -1 || rect.right > width + 1 || el.scrollWidth > el.clientWidth + 1 || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1)) issues.push(`${state}: copy bounds/clipping ${el.textContent?.slice(0, 45)}`);
                                return { text: el.textContent, left: rect.left, right: rect.right, width: rect.width, height: rect.height,
                                    clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight };
                            }).filter(Boolean);
                            checkpoints.push({ state, documentWidth: doc.documentElement.scrollWidth, copy });
                            win.scrollTo(0, 0);
                        });
                        cy.screenshot(`ranking-share-${id}-${state}-top`, { capture: 'viewport' });
                        cy.window().then((win) => win.scrollTo(0, win.document.documentElement.scrollHeight));
                        cy.screenshot(`ranking-share-${id}-${state}-bottom`, { capture: 'viewport' });
                        cy.then(persist);
                    };
                    const action = (state: string) => {
                        cy.contains('main a', '나도 예측하기').should('have.attr', 'href', '/prediction').then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.contains('main a', '나도 예측하기').then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, rect = el.getBoundingClientRect();
                            const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                            const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                            checkpoints.push({ action: state, width: rect.width, height: rect.height, left: rect.left, right: rect.right, receivesPointer });
                            if (rect.width < 44 || rect.height < 44 || rect.left < -1 || rect.right > width + 1 || el.scrollWidth > el.clientWidth + 1 || !receivesPointer) issues.push(`${state}: CTA sizing/reachability`);
                        });
                    };
                    visit();
                    cy.contains('main p', '로딩 중...').should('be.visible');
                    snapshot('loading');
                    cy.then(() => release());
                    cy.wait('@share');
                    cy.get('main h1').should('be.visible').and('contain.text', `${year} KBO 시즌 순위 예측`);
                    cy.get('[data-testid^="ranking-row-"]').should('have.length', 10).each(($row, index) => {
                        cy.wrap($row).should('be.visible');
                        expect($row.attr('data-team-id')).to.equal(teamIds[index]);
                        expect($row.attr('draggable')).to.equal('false');
                    });
                    cy.get('[data-testid^="ranking-move-"],[data-testid^="ranking-remove-"]').should('not.exist');
                    snapshot('unsettled');
                    cy.get('[data-testid="ranking-row-hanwha"]').then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                    cy.screenshot(`ranking-share-${id}-unsettled-row`, { capture: 'viewport' });
                    action('unsettled');
                    cy.then(() => { mode = 'settled'; });
                    visit();
                    cy.wait('@share');
                    cy.get('[data-testid="ranking-result-panel"]').should('be.visible');
                    cy.get('[data-testid="ranking-result-score"]').should('contain.text', '10개 중 5개 적중');
                    cy.get('[data-testid^="ranking-result-row-"]').should('have.length', 10).each(($row, index) => {
                        cy.wrap($row).should('be.visible');
                        expect($row.text()).to.include(settled.teamDetails[index].teamName);
                    });
                    snapshot('settled');
                    cy.get('[data-testid="ranking-result-row-kiwoom"]').then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                    cy.screenshot(`ranking-share-${id}-settled-row`, { capture: 'viewport' });
                    action('settled');
                    for (const errorMode of ['404', '503'] as const) {
                        cy.then(() => { mode = errorMode; });
                        visit();
                        cy.wait('@share');
                        cy.get('[data-testid="ranking-share-error"]').should('be.visible').and('contain.text', errorMode === '404'
                            ? '공유된 시즌 순위 예측을 찾을 수 없습니다.'
                            : '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.');
                        cy.get('[data-testid^="ranking-row-"],[data-testid="ranking-result-panel"]').should('not.exist');
                        snapshot(`error-${errorMode}`);
                        action(`error-${errorMode}`);
                    }
                    cy.then(() => expect(writes, 'no unmocked mutation requests').to.equal(0));
                    cy.then(persist);
                    cy.then(() => expect(issues, 'ranking-share layout findings').to.deep.equal([]));
                });
            }
        }
    }
});
