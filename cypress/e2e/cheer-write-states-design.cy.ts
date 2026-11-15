/// <reference types="cypress" />

const noScrollSelectOptions: Partial<Cypress.SelectOptions> & { scrollBehavior: false } = { scrollBehavior: false };

import { seedCypressAuthState } from '../support/auth';

describe('Cheer write pre-publication synthetic design baseline', () => {
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width}px / ${font}px / ${theme}`, () => {
            const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl')));
            expect(origin.hostname).to.equal('127.0.0.1');
            const modal = '[data-testid="cheer-write-modal"]', content = '[data-testid="cheer-write-content"]';
            const share = '[data-testid="cheer-write-share-mode"]', submit = '[data-testid="cheer-write-submit"]';
            const picker = '[data-testid="lazy-emoji-picker"]';
            const profile = { id: 97001, email: 'write@example.invalid', name: '합성 작성자', handle: 'synthetic-writer',
                favoriteTeam: null, role: 'ROLE_USER', hasPassword: true, profileImageUrl: null };
            const page = { content: [], totalElements: 0, totalPages: 0, last: true, size: 20, number: 0 };
            let writes = 0, foreignRequestsBlocked = 0, guest = false;
            const blockedMutations: Array<{ method: string; path: string; origin: 'local' | 'foreign' }> = [];
            const findings: string[] = [], observations: Array<Record<string, unknown>> = [];
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/cheer-write-${id}.json`, { width, font, theme, writes, blockedMutations, foreignRequestsBlocked, findings, observations });
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url);
                if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                    blockedMutations.push({ method: req.method, path: url.pathname, origin: url.origin === origin.origin ? 'local' : 'foreign' });
                    writes++;
                }
                if (url.origin !== origin.origin) {
                    foreignRequestsBlocked++; return req.reply({ forceNetworkError: true, log: false });
                }
                if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                    return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                }
                if (!['/cheer/write', '/login'].includes(url.pathname) && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                    && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
            });
            cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
            cy.intercept('**/auth/**', { statusCode: 401, body: {} });
            cy.intercept('GET', '**/auth/mypage*', (req) => req.reply(guest
                ? { statusCode: 401, body: {} } : { statusCode: 200, body: { success: true, data: profile } }));
            cy.intercept('GET', '**/api/cheer/posts*', { statusCode: 200, body: page });
            cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
            cy.intercept('GET', '**/api/dm/rooms/my', { statusCode: 200, body: { success: true, data: [] } });
            cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
            cy.viewport(width, width === 1280 ? 900 : 844);
            const visit = (asGuest = false) => cy.visit('/cheer/write', { onBeforeLoad(win) {
                guest = asGuest; win.localStorage.clear(); win.sessionStorage.clear();
                if (!asGuest) seedCypressAuthState(win, profile, undefined, { theme });
                else {
                    win.document.cookie = 'Authorization=; max-age=0; path=/';
                    win.localStorage.setItem('kbo-theme', theme); win.localStorage.setItem('bega_has_visited', 'true');
                    win.localStorage.setItem('bega_dont_show_guide', 'true');
                }
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            // This portalled dialog has its own scroll container; do not align to the page header.
            const align = (selector: string) => cy.get(selector).first().then(($el) => $el[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
            const capture = (state: string, selector?: string) => {
                if (selector) align(selector);
                cy.get(modal).then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                    const rect = el.getBoundingClientRect();
                    observations.push({ state, text: el.innerText.replace(/\s+/g, ' ').trim(), dialog: rect.toJSON() });
                    if (rect.left < -1 || rect.right > width + 1 || rect.top < -1 || rect.bottom > win.innerHeight + 1) findings.push(`${state}: dialog outside viewport`);
                    if (Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > doc.documentElement.clientWidth + 1) findings.push(`${state}: document overflow`);
                });
                cy.screenshot(`cheer-write-${id}-${state}`, { capture: 'viewport' }); cy.then(persist);
            };
            const measure = (state: string, selector: string) => cy.get(selector).each(($el) => {
                const el = $el[0], rect = el.getBoundingClientRect(), name = el.getAttribute('aria-label') || el.getAttribute('data-testid') || el.id || el.textContent?.trim() || 'unnamed';
                observations.push({ state, control: name, width: rect.width, height: rect.height });
                if (rect.width < 43.99 || rect.height < 43.99) findings.push(`${state}/${name}: below44px`);
            });
            const fill = (selector: string, value: string) => { align(selector); cy.get(selector).clear({ scrollBehavior: false }).type(value, { scrollBehavior: false }); };
            visit(); cy.get(modal, { timeout: 20000 }).should('exist'); cy.get(submit).should('be.disabled');
            cy.get(modal).then(($el) => {
                const doc = $el[0].ownerDocument;
                observations.push({ state: 'opening-focus', contained: $el[0].contains(doc.activeElement), target: doc.activeElement?.getAttribute('data-testid') });
            });
            capture('empty'); measure('empty', `${modal} button, ${share}`);
            fill(content, '등록하지 않는 합성 응원글 작성 검증입니다.'); cy.get(submit).should('be.enabled'); capture('internal-ready', content);
            align(share); cy.get(share).select('INTERNAL_QUOTE', noScrollSelectOptions); capture('internal-quote', share);
            cy.get(share).select('EXTERNAL_LINK', noScrollSelectOptions); cy.get('#cheer-write-source-url').should('exist'); capture('external-empty', '#cheer-write-source-url');
            const fields = {
                '#cheer-write-source-url': 'https://synthetic-source.invalid/layout', '#cheer-write-source-title': '합성 출처 제목',
                '#cheer-write-source-author': '합성 작성자', '#cheer-write-source-license': '합성 라이선스',
                '#cheer-write-source-license-url': 'https://synthetic-license.invalid/layout',
                '#cheer-write-source-changed-note': '합성 화면 검증', '#cheer-write-source-snapshot-type': 'SYNTHETIC_ONLY',
            };
            for (const [selector, value] of Object.entries(fields)) fill(selector, value);
            measure('external-fields', `${modal} input:not([type="file"]), ${share}`); capture('external-filled', '#cheer-write-source-url');
            for (const mode of ['EXTERNAL_EMBED', 'EXTERNAL_SUMMARY', 'EXTERNAL_COPY']) {
                align(share); cy.get(share).select(mode, noScrollSelectOptions); cy.get('#cheer-write-source-url').should('have.value', fields['#cheer-write-source-url']);
                capture(mode.toLowerCase(), '#cheer-write-source-url');
            }
            align(share); cy.get(share).select('INTERNAL_REPOST', noScrollSelectOptions); cy.get('#cheer-write-source-url').should('not.exist');
            cy.get(`${modal} input[type="file"]`).selectFile([
                { contents: Cypress.Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=', 'base64'), fileName: 'synthetic-valid.png', mimeType: 'image/png' },
                { contents: Cypress.Buffer.from('synthetic-corrupt-image-not-real-content'), fileName: 'synthetic-broken.png', mimeType: 'image/png' },
            ], { force: true });
            cy.get(`${modal} img[alt="preview"]`).should('have.length', 2);
            align(`${modal} img[alt="preview"]`);
            cy.get(`${modal} img[alt="preview"]`).eq(0).should(($img) => expect(($img[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0));
            cy.get(`${modal} img[alt="preview"]`).eq(1).should(($img) => {
                expect(($img[0] as HTMLImageElement).complete).to.equal(true); expect(($img[0] as HTMLImageElement).naturalWidth).to.equal(0);
            });
            capture('previews', `${modal} img[alt="preview"]`);
            cy.get(`${modal} img[alt="preview"]`).each(($img) => {
                const button = $img[0].parentElement!.querySelector('button')!;
                const rect = button.getBoundingClientRect();
                observations.push({ state: 'preview-remove', width: rect.width, height: rect.height, name: button.getAttribute('aria-label') || button.textContent?.trim() });
                if (rect.width < 43.99 || rect.height < 43.99) findings.push('preview remove below44px');
            });
            // Observe local DOM removal only, not proof of Object URL revocation.
            cy.get(`${modal} img[alt="preview"]`).eq(1).parent().find('button').click();
            cy.get(`${modal} img[alt="preview"]`).should('have.length', 1); capture('preview-removed', `${modal} img[alt="preview"]`);
            align('[data-testid="cheer-write-emoji"]'); cy.get('[data-testid="cheer-write-emoji"]').click({ scrollBehavior: false });
            cy.get(`${picker} [data-testid="lazy-emoji-picker-search"]`).should('exist');
            // No opening animation is declared; allow two render frames before the
            // bounded geometry/hit observation, without asserting clipped UI away.
            cy.window().then((win) => new Cypress.Promise<void>((resolve) => {
                win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()));
            }));
            cy.get(picker).then(($el) => {
                const el = $el[0], rect = el.getBoundingClientRect(), doc = el.ownerDocument;
                const search = el.querySelector('[data-testid="lazy-emoji-picker-search"]')!, sr = search.getBoundingClientRect();
                const hit = doc.elementFromPoint(sr.left + sr.width / 2, sr.top + sr.height / 2);
                const reachable = Boolean(hit && (hit === search || search.contains(hit)));
                observations.push({ state: 'emoji-popup', rect: rect.toJSON(), searchReachable: reachable });
                if (!reachable) findings.push('emoji search center obscured or outside viewport');
                if (rect.left < -1 || rect.right > width + 1) findings.push('emoji popup extends outside viewport horizontally');
            }); capture('emoji-open');
            cy.get('[data-testid="cheer-write-emoji"]').click(); cy.get(picker).should('not.exist');
            align(content); cy.get(content).click({ scrollBehavior: false }); cy.press(Cypress.Keyboard.Keys.TAB);
            cy.get(modal).then(($el) => {
                const doc = $el[0].ownerDocument, active = doc.activeElement as HTMLElement, rect = active.getBoundingClientRect();
                const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                const contained = $el[0].contains(active), reachable = Boolean(hit && (hit === active || active.contains(hit)));
                observations.push({ state: 'native-tab-after-editor', contained, reachable, target: active.getAttribute('data-testid') || active.tagName });
                if (!contained || !reachable) findings.push('native Tab target outside dialog or obscured');
            }); capture('native-tab');
            cy.get('body').type('{esc}'); cy.get(modal).should('not.exist');
            cy.window().then((win) => observations.push({ state: 'after-close', overflowY: win.getComputedStyle(win.document.body).overflowY }));
            cy.screenshot(`cheer-write-${id}-closed`, { capture: 'viewport' });
            visit(true); cy.location('pathname').should('equal', '/login'); cy.location('search').should('equal', '?redirect=%2Fcheer%2Fwrite');
            cy.get(modal).should('not.exist'); cy.screenshot(`cheer-write-${id}-guest-redirect`, { capture: 'viewport' });
            cy.then(() => { observations.push({ finished: true }); }); cy.then(persist);
            cy.then(() => {
                // Background telemetry/auth attempts are recorded and blocked too.
                // No post creation/image upload/delete attempt may be initiated.
                expect(blockedMutations.filter(({ path }) => /\/cheer\/posts(?:\/|$)|\/images(?:\/|$)|\/uploads?(?:\/|$)/.test(path))).to.deep.equal([]);
            });
            cy.then(() => expect(findings, 'Cheer write design findings').to.deep.equal([]));
        });
    }
});
