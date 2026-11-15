/// <reference types="cypress" />

describe('Offseason desktop candidate isolation, synthetic only', () => {
    for (const theme of ['light', 'dark'] as const) {
        it(`1280px / 32px / ${theme}`, () => {
            const origin = new URL(String(Cypress.config('baseUrl')));
            expect(origin.hostname).to.equal('127.0.0.1');
            let unavailable = false;
            const observations: Array<Record<string, unknown>> = [];
            cy.intercept({ url: '**', middleware: true }, (req) => {
                if (new URL(req.url).origin !== origin.origin) req.reply({ statusCode: 204, log: false });
            });
            cy.intercept('**/api/**', { statusCode: 503, body: {} });
            cy.intercept('GET', '**/auth/mypage*', { statusCode: 401, body: {} });
            cy.intercept('POST', '**/auth/reissue*', { statusCode: 401, body: {} });
            cy.intercept('GET', '**/api/kbo/offseason/movements*', (req) => req.reply(unavailable
                ? { statusCode: 503, body: { code: 'SYNTHETIC_UNAVAILABLE' } }
                : { statusCode: 200, body: [
                    { id: 99301, date: '2099-11-21', section: 'FA', team: 'HH', player: '합성선수가', summary: '합성 계약 요약입니다.', isBigEvent: true, estimatedAmount: 1000000000 },
                    { id: 99302, date: '2099-11-20', section: 'TRADE', team: 'LG', player: '합성선수나', summary: '합성 교환 요약입니다.', isBigEvent: false, estimatedAmount: 0 },
                ] }));
            cy.viewport(1280, 900);
            const visit = () => cy.visit('/offseason/list', { onBeforeLoad(win) {
                win.localStorage.clear();
                win.sessionStorage.clear();
                win.localStorage.setItem('kbo-theme', theme);
                win.document.documentElement.classList.toggle('dark', theme === 'dark');
                win.document.documentElement.style.fontSize = '32px';
                win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            const settleScroll = () => cy.window().then((win) => new Cypress.Promise<void>((resolve) => {
                win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()));
            }));
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/offseason-desktop-${theme}.json`, { theme, observations });
            const targetState = (label: string, el: HTMLElement) => {
                const doc = el.ownerDocument, rect = el.getBoundingClientRect();
                const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                const panel = doc.querySelector<HTMLElement>('[class~="lg:sticky"]')!;
                const panelRect = panel.getBoundingClientRect();
                const result = { label, top: rect.top, bottom: rect.bottom, height: rect.height,
                    panelTop: panelRect.top, panelBottom: panelRect.bottom,
                    hit: hit?.tagName, hitClass: hit?.className,
                    receivesPointer: hit === el || Boolean(hit && el.contains(hit)) };
                observations.push(result);
                return result;
            };
            const recoverTarget = (selector: string, label: string) => {
                cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                settleScroll();
                cy.get(selector).then(($el) => {
                    targetState(`${label}-centered`, $el[0]);
                    const el = $el[0], win = el.ownerDocument.defaultView!;
                    const panel = el.ownerDocument.querySelector<HTMLElement>('[class~="lg:sticky"]')!;
                    win.scrollBy({ top: el.getBoundingClientRect().top - panel.getBoundingClientRect().bottom - 16, behavior: 'instant' });
                });
                settleScroll();
                cy.get(selector).then(($el) => { targetState(`${label}-below-panel`, $el[0]); });
                cy.then(persist);
                cy.screenshot(`offseason-desktop-${theme}-${label}-below-panel`, { capture: 'viewport' });
                cy.get(selector).then(($el) => {
                    const state = targetState(`${label}-verified`, $el[0]);
                    expect(state.receivesPointer, `${label} reachable after ordinary scroll`).to.equal(true);
                    expect(state.top).to.be.at.least(state.panelBottom + 8);
                    expect(state.bottom).to.be.at.most(900);
                });
            };
            visit();
            cy.get('[data-testid="offseason-table-row-99301"]').should('exist');
            cy.contains('[data-testid="offseason-desktop-table"] p', /^Deal Value$/).first().then(($el) => {
                const el = $el[0], win = el.ownerDocument.defaultView!;
                const scrolls: HTMLElement[] = [];
                for (let parent = el.parentElement; parent; parent = parent.parentElement) {
                    if (['auto', 'scroll'].includes(win.getComputedStyle(parent).overflowX) && parent.scrollWidth > parent.clientWidth + 1) scrolls.push(parent);
                }
                observations.push({ label: 'table-scroll-ancestors', ancestors: scrolls.map((p) => ({
                    className: p.className, clientWidth: p.clientWidth, scrollWidth: p.scrollWidth,
                    insideDesktopRoot: Boolean(p.closest('[data-testid="offseason-desktop-table"]')),
                })) });
                expect(scrolls.length).to.be.greaterThan(0);
                scrolls[0].scrollLeft = scrolls[0].scrollWidth;
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
            });
            cy.contains('[data-testid="offseason-desktop-table"] p', /^Deal Value$/).first().then(($el) => {
                const r = $el[0].getBoundingClientRect();
                observations.push({ label: 'deal-value-after-horizontal-scroll', left: r.left, right: r.right });
                expect(r.left).to.be.at.least(0);
                expect(r.right).to.be.at.most(1280);
            });
            cy.screenshot(`offseason-desktop-${theme}-table-right`, { capture: 'viewport' });
            cy.get('[data-testid="offseason-list-content-runtime"]').then(($el) => $el[0].scrollIntoView({ block: 'start', behavior: 'instant' }));
            cy.get('[data-testid="offseason-insight-headline-99301"]').should('exist').find('p').first().then(($el) => {
                const el = $el[0];
                el.scrollIntoView({ block: 'center', behavior: 'instant' });
                const r = el.getBoundingClientRect();
                observations.push({ label: 'headline-date', text: el.textContent, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, left: r.left, right: r.right });
                const panel = el.ownerDocument.querySelector<HTMLElement>('[class~="lg:sticky"]')!;
                el.ownerDocument.defaultView!.scrollBy({ top: r.top - panel.getBoundingClientRect().bottom - 16, behavior: 'instant' });
            });
            settleScroll();
            cy.screenshot(`offseason-desktop-${theme}-headline-date`, { capture: 'viewport' });
            cy.get('[data-testid="offseason-list-search"]').type('일치없음');
            const reset = '[data-testid="offseason-list-content-runtime"] button:contains("필터 초기화")';
            recoverTarget(reset, 'empty-reset');
            cy.get(reset).click();
            cy.get('[data-testid="offseason-list-search"]').should('have.value', '');
            cy.then(() => { unavailable = true; });
            visit();
            cy.contains('h3', '이적 현황을 가져오지 못했습니다.', { timeout: 20000 }).should('exist');
            const retry = '[data-testid="offseason-list-content-runtime"] button:contains("다시 시도")';
            recoverTarget(retry, 'error-retry');
            cy.then(() => { unavailable = false; });
            cy.get(retry).click();
            cy.get('[data-testid="offseason-table-row-99301"]').should('exist');
            cy.then(persist);
        });
    }
});
