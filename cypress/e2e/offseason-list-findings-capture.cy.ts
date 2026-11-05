/// <reference types="cypress" />

// Capture-only follow-up: fictional future entries, not baseball facts or acceptance passes.
describe('Offseason list selected finding captures', () => {
    for (const [width, font] of [[320, 32], [390, 32]] as const) {
        for (const theme of ['light', 'dark'] as const) {
            it(`${width}px / ${font}px / ${theme}`, () => {
                const origin = new URL(String(Cypress.config('baseUrl')));
                expect(origin.hostname).to.equal('127.0.0.1');
                cy.intercept({ url: '**', middleware: true }, (req) => {
                    if (new URL(req.url).origin !== origin.origin) req.reply({ statusCode: 204, log: false });
                });
                cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                cy.intercept('GET', '**/auth/mypage*', { statusCode: 401, body: {} });
                cy.intercept('POST', '**/auth/reissue*', { statusCode: 401, body: {} });
                cy.intercept('GET', '**/api/kbo/offseason/movements*', { statusCode: 200, body: [
                    { id: 99301, date: '2099-11-21', section: 'FA', team: 'HH', player: '합성선수가',
                        summary: '합성 계약 요약입니다.', remarks: '합성 원문 메모입니다.', contractTerm: '가상 2년',
                        contractValue: '가상 10억원', isBigEvent: true, estimatedAmount: 1000000000 },
                    { id: 99302, date: '2099-11-20', section: 'TRADE', team: 'LG', player: '합성선수나',
                        summary: '합성 교환 요약입니다.', remarks: '합성 교환 메모입니다.', isBigEvent: false, estimatedAmount: 0 },
                ] });
                cy.viewport(width, 844);
                cy.visit('/offseason/list', { onBeforeLoad(win) {
                    win.localStorage.clear();
                    win.sessionStorage.clear();
                    win.localStorage.setItem('kbo-theme', theme);
                    win.document.documentElement.style.fontSize = `${font}px`;
                    win.document.documentElement.classList.toggle('dark', theme === 'dark');
                } });
                cy.get('[data-testid="offseason-mobile-card-99301"]').should('exist');
                const metrics: Array<Record<string, unknown>> = [];
                const capture = (label: string, selector: Cypress.Chainable<JQuery<HTMLElement>>) => {
                    selector.then(($root) => {
                        $root[0].scrollIntoView({ block: 'center', behavior: 'instant' });
                        metrics.push({ label, copy: Array.from($root[0].querySelectorAll<HTMLElement>('p,span')).filter((el) => el.getClientRects().length).map((el) => ({
                            text: el.textContent, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth,
                            clientHeight: el.clientHeight, scrollHeight: el.scrollHeight,
                        })) });
                    });
                    cy.screenshot(`offseason-finding-${width}-${font}-${theme}-${label}`, { capture: 'viewport' });
                };
                capture('summary-stats', cy.contains('p', /^전체 이동$/).parent().parent());
                cy.get('[data-testid="offseason-list-content-runtime"]').then(($root) => $root[0].scrollIntoView({ block: 'start', behavior: 'instant' }));
                cy.get('[data-testid="offseason-insights-panel"]').should('exist');
                capture('team-summary', cy.contains('[data-testid="offseason-insights-panel"] p', /^현재 조건 기준 이동 건수$/).parent().parent());
                capture('headlines', cy.contains('[data-testid="offseason-insights-panel"] p', /^Headlines$/).parent().parent());
                cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/offseason-finding-${width}-${font}-${theme}.json`, { width, font, theme, metrics }));
            });
        }
    }
});
