/// <reference types="cypress" />

// Fictional participants and scores for UI-only checks, not real user data.
const entries = ['합성가', '합성나', '합성다'].map((userName, index) => ({
    rank: index + 1, handle: `synthetic-board-${index}`, userName, level: 3,
    score: 12500 - index * 1000, streak: 8 - index * 3, rankTitle: 'ROOKIE',
    profileImageUrl: index === 0 ? '/synthetic-leaderboard-avatar-missing.png' : null,
}));

describe('Guest leaderboard synthetic responsive states', () => {
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
                    let failedRequests = 0, unknownWrites = 0, privateRequests = 0;
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        if (new URL(req.url).origin !== origin.origin) req.reply({ statusCode: 204, log: false });
                    });
                    cy.intercept('**/api/**', (req) => {
                        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) unknownWrites++;
                        req.reply({ statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    });
                    cy.intercept('GET', '**/auth/mypage*', { statusCode: 401, body: { code: 'SYNTHETIC_GUEST' } });
                    cy.intercept('POST', '**/auth/reissue*', { statusCode: 401, body: { code: 'SYNTHETIC_GUEST' } });
                    cy.intercept('GET', '**/api/leaderboard/hot-streaks*', { statusCode: 200, body: [] });
                    cy.intercept('GET', '**/api/leaderboard/recent-scores*', { statusCode: 200, body: [] });
                    cy.intercept({ pathname: '/api/leaderboard/me' }, (req) => {
                        privateRequests++;
                        req.reply({ statusCode: 401, body: { code: 'SYNTHETIC_GUEST' } });
                    });
                    cy.intercept('GET', '**/synthetic-leaderboard-avatar-missing.png', { statusCode: 404, body: '' }).as('avatar');
                    cy.intercept({ method: 'GET', pathname: '/api/leaderboard' }, (req) => {
                        if (mode === 'error') {
                            failedRequests++;
                            return req.reply({ statusCode: 503, body: { code: 'SYNTHETIC_BOARD_UNAVAILABLE' } });
                        }
                        const body = { content: mode === 'data' ? entries : [], totalElements: mode === 'data' ? 3 : 0, totalPages: mode === 'data' ? 1 : 0 };
                        if (mode === 'empty') return gate.then(() => req.reply({ statusCode: 200, body }));
                        req.reply({ statusCode: 200, body });
                    }).as('board');
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    const visit = () => cy.visit('/leaderboard', { onBeforeLoad(win) {
                        win.localStorage.clear();
                        win.sessionStorage.clear();
                        win.localStorage.setItem('kbo-theme', theme);
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.fontSize = `${font}px`;
                        win.document.documentElement.style.scrollBehavior = 'auto';
                    } });
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/leaderboard-guest-${id}.json`, { width, font, theme, issues, checkpoints });
                    const snapshot = (state: string) => {
                        cy.document().then((doc) => doc.fonts.ready);
                        cy.get('[data-testid="leaderboard-page-runtime"]').then(($root) => {
                            const root = $root[0], doc = root.ownerDocument, win = doc.defaultView!;
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                            if (doc.documentElement.scrollWidth > width + 1) issues.push(`${state}: document overflow`);
                            const headerText = ['RANK', 'PLAYER', 'SCORE', ...(width > 640 ? ['STREAK'] : [])].map((label) => {
                                const node = Array.from(root.querySelectorAll<HTMLElement>('.retro-leaderboard-header > span')).find((el) => el.textContent?.trim() === label);
                                const range = doc.createRange();
                                if (node) range.selectNodeContents(node);
                                const rects = node ? Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0) : [];
                                if (!rects.length) issues.push(`${state}: header text not rendered ${label}`);
                                if (node && win.getComputedStyle(node).visibility !== 'visible') issues.push(`${state}: header text hidden ${label}`);
                                for (const rect of rects) {
                                    if (rect.left < -1 || rect.right > width + 1) issues.push(`${state}: header text outside viewport ${label}`);
                                    for (let ancestor: HTMLElement | null = node ?? null; ancestor && root.contains(ancestor); ancestor = ancestor.parentElement) {
                                        const style = win.getComputedStyle(ancestor), box = ancestor.getBoundingClientRect();
                                        const left = box.left + ancestor.clientLeft, top = box.top + ancestor.clientTop;
                                        if ((['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX) && (rect.left < left - 1 || rect.right > left + ancestor.clientWidth + 1))
                                            || (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY) && (rect.top < top - 1 || rect.bottom > top + ancestor.clientHeight + 1))) issues.push(`${state}: header text clipped by ancestor ${label}`);
                                    }
                                }
                                return { label, cellWidth: node?.clientWidth ?? 0, rects: rects.map(({ left, right, top, bottom }) => ({ left, right, top, bottom })) };
                            });
                            for (let a = 0; a < headerText.length; a++) {
                                for (let b = a + 1; b < headerText.length; b++) {
                                    if (headerText[a].rects.some((first) => headerText[b].rects.some((second) => Math.min(first.right, second.right) - Math.max(first.left, second.left) > 1
                                        && Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top) > 1))) issues.push(`${state}: header text overlaps ${headerText[a].label}/${headerText[b].label}`);
                                }
                            }
                            const copy = Array.from(root.querySelectorAll<HTMLElement>('h1,h2,p,.retro-leaderboard-loading,.retro-leaderboard-empty,.retro-leaderboard-name,.retro-leaderboard-score-cell,.retro-leaderboard-header > span,[data-testid="retro-leaderboard-rules-overlay"] th,[data-testid="retro-leaderboard-rules-overlay"] td')).filter((el) => el.getClientRects().length && win.getComputedStyle(el).visibility !== 'hidden').map((el) => {
                                const rect = el.getBoundingClientRect(), style = win.getComputedStyle(el);
                                if (!rect.width && !rect.height) return null;
                                // Header text may visibly overflow its grid track; its Range bounds above are authoritative for this check.
                                if (!el.matches('.retro-leaderboard-header > span') && (rect.width <= 0 || rect.height <= 0 || rect.left < -1 || rect.right > width + 1 || el.scrollWidth > el.clientWidth + 1 || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1))) issues.push(`${state}: copy bounds/clipping ${el.textContent?.slice(0, 45)}`);
                                return { text: el.textContent, left: rect.left, right: rect.right, width: rect.width, height: rect.height,
                                    fontSize: style.fontSize, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight };
                            }).filter(Boolean);
                            checkpoints.push({ state, documentWidth: doc.documentElement.scrollWidth, copy, headerText });
                            win.scrollTo(0, 0);
                        });
                        cy.screenshot(`leaderboard-guest-${id}-${state}-top`, { capture: 'viewport' });
                        cy.window().then((win) => win.scrollTo(0, win.document.documentElement.scrollHeight));
                        cy.screenshot(`leaderboard-guest-${id}-${state}-bottom`, { capture: 'viewport' });
                        if (state === 'request-failed' || state === 'cached-refetch-failed') {
                            cy.get('[data-testid="leaderboard-error"]').then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                            cy.screenshot(`leaderboard-guest-${id}-${state}-notice`, { capture: 'viewport' });
                        }
                        cy.then(persist);
                    };
                    const control = (selector: string, label: string) => {
                        cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(selector).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, rect = el.getBoundingClientRect(), style = doc.defaultView!.getComputedStyle(el);
                            const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                            const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                            checkpoints.push({ control: label, width: rect.width, height: rect.height, left: rect.left, right: rect.right, receivesPointer });
                            if (rect.width < 44 || rect.height < 44 || rect.left < -1 || rect.right > width + 1 || el.scrollWidth > el.clientWidth + 1 || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1) || !receivesPointer) issues.push(`${label}: sizing/clipping/reachability`);
                        });
                    };
                    const refresh = '.retro-leaderboard-action-button:nth-child(1)';
                    const rules = '.retro-leaderboard-action-button:nth-child(2)';
                    visit();
                    cy.get('.retro-leaderboard-loading').should('be.visible');
                    snapshot('loading');
                    cy.then(() => release());
                    cy.wait('@board');
                    cy.get('.retro-leaderboard-empty').should('be.visible').and('contain.text', '데이터가 없습니다');
                    snapshot('empty');
                    cy.then(() => { mode = 'data'; });
                    visit();
                    cy.get('.retro-leaderboard-row').should('have.length', 3).each(($row, index) => {
                        cy.wrap($row).should('be.visible').and('contain.text', entries[index].userName);
                    });
                    cy.get('.retro-leaderboard-row').first().then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                    cy.wait('@avatar');
                    cy.get('.retro-leaderboard-row').first().find('img').should('not.exist');
                    cy.get('.retro-leaderboard-row').first().find('[data-testid="profile-avatar-fallback"]').should('be.visible').and('contain.text', '합');
                    snapshot('data');
                    cy.get('.retro-leaderboard-row').first().then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                    cy.screenshot(`leaderboard-guest-${id}-data-row`, { capture: 'viewport' });
                    control(refresh, 'refresh');
                    control(rules, 'rules');
                    control('.retro-leaderboard-action-button:nth-child(3)', 'predict');
                    cy.get(refresh).focus();
                    cy.press(Cypress.Keyboard.Keys.TAB);
                    cy.focused().should('contain.text', '규칙 확인').then(($el) => {
                        const el = $el[0], rect = el.getBoundingClientRect(), hit = el.ownerDocument.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                        const visible = el.matches(':focus-visible') && (hit === el || Boolean(hit && el.contains(hit)));
                        checkpoints.push({ focus: 'refresh-to-rules', visible });
                        if (!visible) issues.push('native Tab rules focus occluded');
                    });
                    cy.screenshot(`leaderboard-guest-${id}-rules-tab`, { capture: 'viewport' });
                    cy.get(rules).click();
                    cy.get('[data-testid="retro-leaderboard-rules-overlay"]').should('be.visible').and('contain.text', '점수 산정 규칙');
                    snapshot('rules');
                    control('[data-testid="retro-leaderboard-rules-close"]', 'rules-close');
                    cy.get('[data-testid="retro-leaderboard-rules-close"]').click();
                    cy.get('[data-testid="retro-leaderboard-rules-overlay"]').should('not.exist');
                    cy.then(() => { mode = 'error'; });
                    visit();
                    cy.get('.retro-leaderboard-loading').should('not.exist');
                    cy.get('[data-testid="leaderboard-error"]', { timeout: 20000 })
                        .should('be.visible').and('have.attr', 'role', 'alert')
                        .and('contain.text', '순위 정보를 불러오지 못했습니다.')
                        .and('contain.text', '새로고침');
                    cy.get('.retro-leaderboard-empty').should('not.exist');
                    cy.get('[data-testid="leaderboard-page-runtime"]').then(($root) => {
                        expect(failedRequests).to.be.greaterThan(0);
                        const root = $root[0], win = root.ownerDocument.defaultView!;
                        const errorMarkers = Array.from(root.querySelectorAll<HTMLElement>('[role="alert"],[data-testid*="error"]')).filter((el) => el.getClientRects().length && win.getComputedStyle(el).visibility === 'visible').length;
                        const errorCopy = /불러오지 못|불러올 수 없|조회.*실패|연결.*불안정|오류가 발생/.test(root.innerText);
                        const emptyShown = Boolean(root.querySelector('.retro-leaderboard-empty')?.getClientRects().length);
                        checkpoints.push({ observation: 'request-failed-presentation', failedRequests, errorMarkers, errorCopy, emptyShown });
                        if (emptyShown || !errorMarkers || !errorCopy) issues.push('request-failed: missing distinct in-page error state');
                    });
                    snapshot('request-failed');
                    cy.then(() => { mode = 'data'; });
                    cy.get(refresh).click();
                    cy.get('.retro-leaderboard-row').should('have.length', 3).each(($row, index) => {
                        cy.wrap($row).should('be.visible').and('contain.text', entries[index].userName);
                    });
                    cy.get('[data-testid="leaderboard-error"]').should('not.exist');
                    snapshot('recovered');
                    cy.then(() => { mode = 'error'; });
                    cy.get(refresh).click();
                    cy.get('[data-testid="leaderboard-error"]', { timeout: 20000 }).should('be.visible');
                    cy.get('.retro-leaderboard-empty').should('not.exist');
                    cy.get('.retro-leaderboard-row').should('have.length', 3).each(($row, index) => {
                        cy.wrap($row).should('be.visible');
                        cy.wrap($row).find('.retro-leaderboard-name').should('be.visible').and('have.text', entries[index].userName);
                        cy.wrap($row).find('.retro-leaderboard-score-cell').should('be.visible').and('have.text', entries[index].score.toLocaleString());
                    });
                    snapshot('cached-refetch-failed');
                    cy.then(() => { mode = 'data'; });
                    cy.get(refresh).click();
                    cy.get('[data-testid="leaderboard-error"]').should('not.exist');
                    cy.get('.retro-leaderboard-row').should('have.length', 3);
                    snapshot('cached-recovered');
                    if (width === 320 && font === 16 && theme === 'light') {
                        cy.intercept('GET', '**/api/leaderboard/hot-streaks*', { statusCode: 503, body: { code: 'SYNTHETIC_AUX_UNAVAILABLE' } }).as('auxHotFailure');
                        cy.intercept('GET', '**/api/leaderboard/recent-scores*', { statusCode: 503, body: { code: 'SYNTHETIC_AUX_UNAVAILABLE' } }).as('auxRecentFailure');
                        visit();
                        cy.wait(['@auxHotFailure', '@auxRecentFailure']);
                        cy.wait(['@auxHotFailure', '@auxRecentFailure']);
                        cy.get('.retro-leaderboard-row').should('have.length', 3);
                        // No public terminal auxiliary-error marker exists; observe after two render frames, not just HTTP completion.
                        cy.window().then((win) => new Cypress.Promise<void>((resolve) => {
                            win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()));
                        }));
                        cy.get('[data-testid="leaderboard-error"]').should('not.exist');
                        snapshot('auxiliary-errors-only');
                    }
                    cy.then(() => { expect(unknownWrites).to.equal(0); expect(privateRequests, 'guest does not fetch my rank').to.equal(0); });
                    cy.then(persist);
                    cy.then(() => expect(issues, 'guest leaderboard findings').to.deep.equal([]));
                });
            }
        }
    }
});
