/// <reference types="cypress" />

// Explicitly fictional future movements for UI-only QA, not baseball facts.
const movements = [
    { id: 99301, date: '2099-11-21', section: 'FA', team: 'HH', player: '합성선수가',
        summary: '합성 계약 요약입니다.', remarks: '합성 원문 메모입니다.', contractTerm: '가상 2년',
        contractValue: '가상 10억원', optionDetails: '가상 옵션', sourceLabel: '로컬 합성 검증 자료',
        sourceUrl: null, announcedAt: '2099-11-21T09:00:00Z', isBigEvent: true, estimatedAmount: 1000000000 },
    { id: 99302, date: '2099-11-20', section: 'TRADE', team: 'LG', player: '합성선수나',
        summary: '합성 교환 요약입니다.', remarks: '합성 교환 메모입니다.', counterpartyTeam: 'HH',
        counterpartyDetails: '가상 반대급부', isBigEvent: false, estimatedAmount: 0 },
];

describe('Offseason list synthetic guest state matrix', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`;
                    const origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    const issues: string[] = [];
                    const checkpoints: Array<Record<string, unknown>> = [];
                    let mode: 'empty' | 'data' | 'error' = 'empty';
                    let release!: () => void;
                    const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
                    let unknownWrites = 0;
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        if (new URL(req.url).origin !== origin.origin) req.reply({ statusCode: 204, log: false });
                    });
                    cy.intercept('**/api/**', (req) => {
                        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) unknownWrites++;
                        req.reply({ statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    });
                    cy.intercept('GET', '**/auth/mypage*', { statusCode: 401, body: { code: 'SYNTHETIC_GUEST' } });
                    cy.intercept('POST', '**/auth/reissue*', { statusCode: 401, body: { code: 'SYNTHETIC_GUEST' } });
                    cy.intercept('GET', '**/api/kbo/offseason/movements*', (req) => {
                        if (mode === 'error') return req.reply({ statusCode: 503, body: { code: 'SYNTHETIC_UNAVAILABLE' } });
                        if (mode === 'empty') return gate.then(() => req.reply({ statusCode: 200, body: [] }));
                        req.reply({ statusCode: 200, body: movements });
                    }).as('movements');
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    const visit = () => cy.visit('/offseason/list', { onBeforeLoad(win) {
                        win.localStorage.clear();
                        win.sessionStorage.clear();
                        win.localStorage.setItem('kbo-theme', theme);
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.fontSize = `${font}px`;
                        win.document.documentElement.style.scrollBehavior = 'auto';
                    } });
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/offseason-list-${id}.json`, { width, font, theme, issues, checkpoints });
                    const snapshot = (state: string, selector = '[data-testid="offseason-list-runtime"]') => {
                        const detail = selector.includes('movement-detail');
                        if (detail) cy.get(`${selector} > .overflow-y-auto`).then(($body) => {
                            const body = $body[0];
                            body.scrollTop = 0;
                            checkpoints.push({ detailScroll: 'top', scrollTop: body.scrollTop, clientHeight: body.clientHeight, scrollHeight: body.scrollHeight });
                        });
                        cy.document().then((doc) => doc.fonts.ready);
                        cy.get(selector).then(($root) => {
                            const root = $root[0], doc = root.ownerDocument, win = doc.defaultView!;
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                            if (doc.documentElement.scrollWidth > width + 1) issues.push(`${state}: document overflow`);
                            const copy = Array.from(root.querySelectorAll<HTMLElement>('h1,h2,h3,p,label,[data-testid^="offseason-table-row-"] span.text-base,.text-15.leading-7')).filter((el) => el.getClientRects().length && win.getComputedStyle(el).visibility !== 'hidden').map((el) => {
                                const rect = el.getBoundingClientRect(), style = win.getComputedStyle(el);
                                if (!rect.width && !rect.height) return null;
                                let scrollableTable = false;
                                const desktopTable = width >= 768 ? el.closest('[data-testid="offseason-desktop-table"]') : null;
                                for (let parent = el.parentElement; parent && root.contains(parent); parent = parent.parentElement) {
                                    if (desktopTable && (parent.contains(desktopTable) || desktopTable.contains(parent)) && parent.classList.contains('overflow-x-auto')
                                        && ['auto', 'scroll'].includes(win.getComputedStyle(parent).overflowX) && parent.scrollWidth > parent.clientWidth + 1) scrollableTable = true;
                                }
                                if (rect.width <= 0 || rect.height <= 0 || (!scrollableTable && (rect.left < -1 || rect.right > width + 1)) || el.scrollWidth > el.clientWidth + 1 || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1)) issues.push(`${state}: copy bounds/clipping ${el.textContent?.slice(0, 45)}`);
                                return { text: el.textContent, width: rect.width, height: rect.height, left: rect.left, right: rect.right,
                                    clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, scrollableTable };
                            }).filter(Boolean);
                            checkpoints.push({ state, documentWidth: doc.documentElement.scrollWidth, copy });
                            if (!detail) win.scrollTo(0, 0);
                        });
                        cy.screenshot(`offseason-list-${id}-${state}-top`, { capture: 'viewport' });
                        if (!detail) cy.window().then((win) => win.scrollTo(0, win.document.documentElement.scrollHeight));
                        else cy.get(`${selector} > .overflow-y-auto`).then(($body) => {
                            const body = $body[0];
                            body.scrollTop = body.scrollHeight;
                            expect(body.scrollTop + body.clientHeight).to.be.at.least(body.scrollHeight - 1);
                            checkpoints.push({ detailScroll: 'bottom', scrollTop: body.scrollTop, clientHeight: body.clientHeight, scrollHeight: body.scrollHeight });
                        });
                        cy.screenshot(`offseason-list-${id}-${state}-bottom`, { capture: 'viewport' });
                        cy.then(persist);
                    };
                    const settleScroll = () => cy.window().then((win) => new Cypress.Promise<void>((resolve) => {
                        win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()));
                    }));
                    const control = (selector: string, label: string) => {
                        cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        settleScroll();
                        cy.get(selector).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, rect = el.getBoundingClientRect();
                            const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                            const panel = width >= 768 ? doc.querySelector<HTMLElement>('[data-testid="offseason-list-runtime"] [class~="lg:sticky"]') : null;
                            // Centering can put a reachable target behind this route's sticky filter panel.
                            // Recover through normal scrolling only when that exact panel is the measured occluder.
                            if (panel && hit && panel.contains(hit) && !panel.contains(el)) {
                                checkpoints.push({ scrollRecovery: label, centeredTop: rect.top, panelBottom: panel.getBoundingClientRect().bottom });
                                doc.defaultView!.scrollBy({ top: rect.top - panel.getBoundingClientRect().bottom - 16, behavior: 'instant' });
                            }
                        });
                        settleScroll();
                        cy.get(selector).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, rect = el.getBoundingClientRect(), style = doc.defaultView!.getComputedStyle(el);
                            const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                            const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                            checkpoints.push({ control: label, width: rect.width, height: rect.height, left: rect.left, right: rect.right, receivesPointer });
                            if (rect.width < 44 || rect.height < 44 || rect.left < -1 || rect.right > width + 1 || (!['INPUT', 'SELECT'].includes(el.tagName) && el.scrollWidth > el.clientWidth + 1) || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1) || !receivesPointer) issues.push(`${label}: sizing/clipping/reachability`);
                        });
                    };
                    const search = '[data-testid="offseason-list-search"]';
                    const row = (movementId: number) => `[data-testid="offseason-${width < 768 ? 'mobile-card' : 'table-row'}-${movementId}"]`;
                    const retry = '[data-testid="offseason-list-content-runtime"] button:contains("다시 시도")';
                    visit();
                    cy.get('[data-testid="offseason-list-runtime"] .animate-pulse').should('exist');
                    snapshot('loading');
                    cy.then(() => release());
                    cy.wait('@movements');
                    cy.contains('h3', '조건에 맞는 이동이 없습니다.').should('be.visible');
                    snapshot('empty');
                    cy.then(() => { mode = 'data'; });
                    visit();
                    cy.get(row(99301)).should('be.visible').and('contain.text', '합성선수가');
                    cy.get(row(99302)).should('be.visible').and('contain.text', '합성선수나');
                    snapshot('data');
                    control(search, 'search');
                    cy.get('[data-testid="offseason-list-back"]').focus();
                    cy.press(Cypress.Keyboard.Keys.TAB);
                    cy.focused().should('have.attr', 'data-testid', 'offseason-list-search');
                    cy.get(search).type('일치없음').should('have.value', '일치없음');
                    cy.contains('h3', '조건에 맞는 이동이 없습니다.').should('be.visible');
                    snapshot('filtered-empty');
                    const emptyReset = '[data-testid="offseason-list-content-runtime"] button:contains("필터 초기화")';
                    control(emptyReset, 'empty-reset');
                    // Enter activation differs between blank-page and app buttons in this runner.
                    // Use normal clicks for state transitions; native Tab/row keydown checks remain separate.
                    cy.get(emptyReset).click();
                    cy.get(search).should('have.value', '');
                    control('[data-testid="offseason-section-FA"]', 'section-FA');
                    cy.get('[data-testid="offseason-section-FA"]').click();
                    cy.get('[data-testid="offseason-section-FA"]').should('have.attr', 'aria-pressed', 'true');
                    cy.get(row(99301)).should('exist');
                    cy.get(row(99302)).should('not.exist');
                    snapshot('section-filter');
                    control('[data-testid="offseason-filter-reset"]', 'filter-reset');
                    cy.get('[data-testid="offseason-filter-reset"]').click();
                    cy.get(row(99302)).should('exist');
                    control('[data-testid="offseason-sort-latest"]', 'sort-latest');
                    control('[data-testid="offseason-sort-amount"]', 'sort-amount');
                    control('[data-testid="offseason-sort-headline"]', 'sort-headline');
                    cy.get(row(99301)).focus();
                    cy.press(Cypress.Keyboard.Keys.ENTER);
                    cy.get('[data-testid="offseason-movement-detail"]').should('be.visible').and('contain.text', '합성선수가');
                    snapshot('detail', '[data-testid="offseason-movement-detail"]');
                    control('[data-testid="offseason-movement-detail"] button[aria-label="닫기"]', 'detail-header-close');
                    control('[data-testid="offseason-movement-detail"] button:not([aria-label])', 'detail-body-close');
                    cy.press(Cypress.Keyboard.Keys.ESC);
                    cy.get('[data-testid="offseason-movement-detail"]').should('not.exist');
                    cy.then(() => { mode = 'error'; });
                    visit();
                    cy.contains('h3', '이적 현황을 가져오지 못했습니다.', { timeout: 20000 }).should('be.visible');
                    cy.contains('서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.').should('be.visible');
                    snapshot('error');
                    control(retry, 'retry');
                    cy.then(() => { mode = 'data'; });
                    cy.get(retry).click();
                    cy.get(row(99301)).should('be.visible').and('contain.text', '합성선수가');
                    cy.get(row(99302)).should('be.visible').and('contain.text', '합성선수나');
                    snapshot('recovered');
                    cy.then(() => { expect(unknownWrites).to.equal(0); checkpoints.push({ guard: 'no-unmocked-api-writes', unknownWrites }); });
                    cy.then(persist);
                    cy.then(() => expect(issues, 'offseason list findings').to.deep.equal([]));
                });
            }
        }
    }
});
