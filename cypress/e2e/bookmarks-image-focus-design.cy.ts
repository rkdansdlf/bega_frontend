/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

// Complements, not repeats, the existing loading/error/empty/populated matrix.
describe('Bookmarks image and closed-swipe keyboard evidence', () => {
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width}px / ${font}px / ${theme}`, () => {
            const origin = new URL(String(Cypress.config('baseUrl'))), id = `${width}-${font}-${theme}`;
            expect(origin.hostname).to.equal('127.0.0.1');
            const root = '[data-testid="cheer-bookmarks"]', card = '[data-testid="cheer-post-card"]';
            const profile = { id: 98001, email: 'bookmark@example.invalid', name: '합성 방문자', handle: 'synthetic-bookmark',
                favoriteTeam: null, role: 'ROLE_USER', hasPassword: true, profileImageUrl: null };
            let mutationsBlocked = 0, foreignBlocked = 0;
            const observations: Array<Record<string, unknown>> = [], findings: string[] = [];
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/bookmarks-${id}.json`, { width, font, theme, mutationsBlocked, foreignBlocked, findings, observations });
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url);
                if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) mutationsBlocked++;
                if (url.origin !== origin.origin) { foreignBlocked++; return req.reply({ forceNetworkError: true, log: false }); }
                if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                if (url.pathname !== '/cheer/bookmarks' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                    && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
            });
            cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
            cy.intercept('**/auth/**', { statusCode: 503, body: {} });
            cy.intercept('GET', '**/auth/mypage*', { statusCode: 200, body: { success: true, data: profile } });
            cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
            cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
            cy.intercept('GET', '**/synthetic-bookmark-good.svg', { statusCode: 200, headers: { 'content-type': 'image/svg+xml' },
                body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="100"><rect width="120" height="100" fill="#166534"/></svg>' });
            cy.intercept('GET', '**/synthetic-bookmark-missing.svg', { statusCode: 404, body: '' });
            cy.intercept('GET', '**/api/cheer/bookmarks*', { statusCode: 200, body: {
                content: [1, 2].map((n) => ({ id: 98010 + n, authorId: 98099, author: `합성 작성자 ${n}`, authorHandle: `synthetic-author-${n}`,
                    content: `실제 게시글이 아닌 합성 북마크 ${n}입니다.`, teamId: 'DB', team: 'DB', postType: 'NORMAL',
                    createdAt: '2099-01-01T00:00:00.000Z', isOwner: false, bookmarked: true, bookmarkCount: 1, commentCount: 0,
                    likeCount: 0, repostCount: 0, views: 1, imageUrls: n === 1 ? [`${origin.origin}/synthetic-bookmark-good.svg`, `${origin.origin}/synthetic-bookmark-missing.svg`] : [] })),
                number: 0, size: 20, totalElements: 2, totalPages: 1, last: true,
            } }).as('bookmarks');
            cy.viewport(width, width === 1280 ? 900 : 844);
            cy.visit('/cheer/bookmarks', { onBeforeLoad(win) {
                win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, profile, undefined, { theme });
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            const align = (selector: string) => cy.get(selector).first().then(($el) => {
                const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                const bottom = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect().bottom ?? 80;
                win.scrollBy({ top: el.getBoundingClientRect().top - bottom - 16, behavior: 'instant' });
            });
            const capture = (state: string, selector?: string) => {
                if (selector) align(selector);
                cy.document().then((doc) => {
                    expect(doc.defaultView!.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                    observations.push({ state, documentWidth: doc.documentElement.scrollWidth, bodyWidth: doc.body.scrollWidth });
                });
                cy.screenshot(`bookmarks-${id}-${state}`, { capture: 'viewport' }); cy.then(persist);
            };
            cy.wait('@bookmarks'); cy.get(card, { timeout: 20000 }).should('have.length', 2); capture('populated', `${root} h1`);
            cy.document().then((doc) => doc.fonts.ready);
            align(`${card} img[alt="게시 이미지 1"]`);
            cy.window().then((win) => new Cypress.Promise<void>((resolve) => {
                win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()));
            }));
            cy.get(`${card} img[alt="게시 이미지 1"]`).first().then(($img) => {
                const img = $img[0] as HTMLImageElement;
                return Cypress.Promise.race([
                    img.decode().then(() => 'decoded', () => 'decode-failed'),
                    new Cypress.Promise<string>((resolve) => img.ownerDocument.defaultView!.setTimeout(() => resolve('not-settled-within-2000ms'), 2000)),
                ]).then((decodeStatus) => { observations.push({ state: 'image-readiness', decodeStatus }); });
            });
            cy.get(`${card} img[alt="게시 이미지 1"]`).first().then(($img) => {
                const rect = $img[0].getBoundingClientRect(); observations.push({ state: 'image-host', width: rect.width, height: rect.height });
                if (rect.width <= 0 || rect.height <= 0) {
                    observations.push({ state: 'image-evidence-blocked-by-collapsed-host' });
                    findings.push('image evidence unavailable: zero host after bounded readiness');
                    return;
                }
                align(`${card} img[alt="게시 이미지 1"]`);
                cy.get(`${card} img[alt="게시 이미지 1"]`).first().should(($el) => expect(($el[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0));
                cy.get('[role="img"][aria-label="게시 이미지 2을 불러올 수 없습니다"]').should('be.visible');
                capture('decoded-and-failed-thumbnail', `${card} img[alt="게시 이미지 1"]`);
            });
            // Programmatic focus is only a bounded starting point on the real preceding
            // focusable control; the transition into the closed swipe row is native Tab.
            cy.get('button[aria-label="북마크 해제"]').first().then(($hidden) => {
                const hidden = $hidden[0], doc = hidden.ownerDocument;
                const elements = Array.from(doc.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
                    .filter((el) => el.tabIndex >= 0 && !el.matches(':disabled') && !el.closest('[inert]') && Cypress.dom.isVisible(el))
                    .sort((a, b) => {
                        if (a.tabIndex > 0 && b.tabIndex > 0) return a.tabIndex - b.tabIndex;
                        if (a.tabIndex > 0) return -1;
                        if (b.tabIndex > 0) return 1;
                        return 0;
                    });
                const index = elements.indexOf(hidden);
                // A covered button may not be classed visible; use DOM position to
                // find a visible predecessor without focusing the hidden button itself.
                const predecessor = index > 0 ? elements[index - 1] : elements.filter((el) => Boolean(el.compareDocumentPosition(hidden) & Node.DOCUMENT_POSITION_FOLLOWING)).at(-1);
                expect(predecessor, 'visible predecessor exists').to.exist;
                predecessor!.focus();
                expect(doc.activeElement, 'starting control actually focused').to.equal(predecessor);
                observations.push({ state: 'keyboard-start', predecessor: predecessor!.getAttribute('aria-label') || predecessor!.textContent?.trim() });
            });
            cy.press(Cypress.Keyboard.Keys.TAB);
            cy.get('button[aria-label="북마크 해제"]').first().then(($hidden) => {
                const hidden = $hidden[0], doc = hidden.ownerDocument, win = doc.defaultView!, rect = hidden.getBoundingClientRect();
                expect(doc.activeElement, 'native transition reaches current sequential swipe action').to.equal(hidden);
                const headerBottom = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect().bottom ?? 0;
                const docks = Array.from(doc.querySelectorAll<HTMLElement>('[data-testid="cheer-mobile-bottom-nav"],[data-testid="auth-mobile-bottom-nav"],[data-testid="public-mobile-bottom-nav"]')).filter((el) => Cypress.dom.isVisible(el));
                const dockTop = Math.min(win.innerHeight, ...docks.map((el) => el.getBoundingClientRect().top));
                const top = Math.max(rect.top, headerBottom + 8), bottom = Math.min(rect.bottom, dockTop - 8);
                const x = Math.min(Math.max(rect.left + rect.width / 2, 1), win.innerWidth - 1), y = (top + bottom) / 2;
                const hit = top < bottom ? doc.elementFromPoint(x, y) : null;
                const focused = doc.activeElement === hidden, receivesHit = Boolean(hit && (hit === hidden || hidden.contains(hit)));
                observations.push({ state: 'closed-swipe-native-tab', focused, sampleInsideVisibleVerticalRange: top < bottom, receivesHit,
                    hitTestId: hit?.closest('[data-testid]')?.getAttribute('data-testid'), width: rect.width, height: rect.height,
                    foregroundTransform: win.getComputedStyle(hidden.parentElement!.nextElementSibling!).transform });
                if (focused && top < bottom && !receivesHit) findings.push('native Tab focuses covered closed-swipe action');
            }); capture('closed-swipe-focus');
            cy.then(() => { expect(mutationsBlocked).to.equal(0); observations.push({ finished: true }); }); cy.then(persist);
            cy.then(() => expect(findings, 'bounded bookmark image/focus findings').to.deep.equal([]));
        });
    }
});
