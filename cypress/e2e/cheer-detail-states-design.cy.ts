/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

describe('Cheer detail synthetic state design baseline', () => {
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width}px / ${font}px / ${theme}`, () => {
            const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl')));
            expect(origin.hostname).to.equal('127.0.0.1');
            const root = '[data-testid="cheer-detail-route"]', article = '[data-testid="cheer-detail-article"]';
            const panel = '[data-testid="cheer-detail-comments-panel"]', lightbox = '[data-testid="image-lightbox"]';
            const profile = { id: 96000, email: 'detail@example.invalid', name: '합성 방문자', handle: 'synthetic-viewer',
                role: 'ROLE_USER', favoriteTeam: 'DB', hasPassword: true, profileImageUrl: null };
            const content = '실제 게시글이 아닌 합성 상세 화면 검증 문구입니다.';
            let writes = 0, commentsSeen = 0, commentsPhase: 'error' | 'empty' = 'error', postRecovered = false, guestMode = false;
            let releasePost!: () => void, releaseComments!: () => void;
            const postGate = new Cypress.Promise<void>((resolve) => { releasePost = resolve; });
            const commentsGate = new Cypress.Promise<void>((resolve) => { releaseComments = resolve; });
            const findings: string[] = [], observations: Array<Record<string, unknown>> = [], responses: Array<Record<string, unknown>> = [];
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/cheer-detail-${id}.json`, { width, font, theme, writes, findings, observations, responses });
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url);
                if (url.origin !== origin.origin) return req.reply({ forceNetworkError: true, log: false });
                if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                    writes++; return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                }
                if (!/^\/cheer\/9600[1-5]$/.test(url.pathname) && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                    && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
            });
            cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
            cy.intercept('**/auth/**', { statusCode: 503, body: {} });
            cy.intercept('GET', '**/auth/mypage*', (req) => req.reply(guestMode
                ? { statusCode: 401, body: {} } : { statusCode: 200, body: { success: true, data: profile } }));
            cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
            cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
            cy.intercept('GET', '**/synthetic-detail-good.svg', { statusCode: 200, headers: { 'content-type': 'image/svg+xml' },
                body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="100"><rect width="120" height="100" fill="#166534"/></svg>' });
            cy.intercept('GET', '**/synthetic-detail-missing.svg', { statusCode: 404, body: '' });
            cy.intercept('GET', /\/api\/cheer\/posts\/9600[1-5](?:\?.*)?$/, (req) => {
                const postId = Number(new URL(req.url).pathname.split('/').at(-1)); req.alias = `post-${postId}`;
                const reply = () => {
                    const status = postId === 96004 ? 404 : postId === 96003 && !postRecovered ? 503 : 200;
                    responses.push({ kind: 'post', postId, status });
                    req.reply({ statusCode: status, body: status !== 200 ? { message: 'SYNTHETIC_POST_FAILURE' } : {
                        id: postId, content, author: '합성 작성자', authorId: 96099, authorHandle: 'synthetic-author', authorTeamId: 'DB',
                        teamId: 'DB', team: 'DB', createdAt: '2099-01-01T00:00:00.000Z', postType: 'NORMAL', isOwner: false,
                        views: 12, likeCount: 3, commentCount: postId === 96002 ? 21 : 0, bookmarkCount: 1, repostCount: 0,
                        imageUrls: postId === 96001 ? [`${origin.origin}/synthetic-detail-good.svg`, `${origin.origin}/synthetic-detail-missing.svg`] : [],
                    } });
                };
                return postId === 96001 ? postGate.then(reply) : reply();
            });
            cy.intercept('GET', /\/api\/cheer\/posts\/9600[1-5]\/comments(?:\?.*)?$/, (req) => {
                const url = new URL(req.url), postId = Number(url.pathname.split('/').at(-2)), page = Number(url.searchParams.get('page') ?? 0);
                const phase = commentsPhase; commentsSeen++; req.alias = `comments-${postId}-${page}-${phase}`;
                const reply = () => {
                    const status = postId === 96001 && phase === 'error' ? 503 : 200;
                    const populated = postId === 96002;
                    const items = populated ? (page === 0 ? Array.from({ length: 20 }, (_, n) => n + 1) : [21]).map((n) => ({ id: 96100 + n, author: `합성 댓글 작성자 ${n}`,
                        authorHandle: `synthetic-comment-${n}`, content: `실제 댓글이 아닌 합성 댓글 ${n}입니다.`, createdAt: '2099-01-01T00:00:00.000Z',
                        likeCount: n, likedByMe: false, replies: [] })) : [];
                    responses.push({ kind: 'comments', postId, page, phase, status });
                    req.reply({ statusCode: status, body: status === 503 ? { message: 'SYNTHETIC_COMMENT_FAILURE' } : {
                        content: items, totalElements: populated ? 21 : 0, totalPages: populated ? 2 : 1, number: page, size: 20,
                        last: !populated || page > 0,
                    } });
                };
                return postId === 96001 && phase === 'error' ? commentsGate.then(reply) : reply();
            });
            cy.viewport(width, width === 1280 ? 900 : 844);
            const visit = (postId: number, guest = false) => cy.visit(`/cheer/${postId}`, { onBeforeLoad(win) {
                guestMode = guest;
                win.localStorage.clear(); win.sessionStorage.clear();
                if (!guest) seedCypressAuthState(win, profile, undefined, { theme });
                else {
                    win.document.cookie = 'Authorization=; max-age=0; path=/';
                    win.localStorage.setItem('kbo-theme', theme); win.localStorage.setItem('bega_has_visited', 'true');
                    win.localStorage.setItem('bega_dont_show_guide', 'true');
                }
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            const align = (selector: string) => cy.get(selector).first().then(($el) => {
                const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                const bottom = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect().bottom ?? 80;
                win.scrollBy({ top: el.getBoundingClientRect().top - bottom - 16, behavior: 'instant' });
            });
            const capture = (state: string, selector = article, realign = true) => {
                if (realign) align(selector);
                cy.get(root).then(($el) => {
                    const el = $el[0], doc = el.ownerDocument;
                    expect(doc.defaultView!.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                    observations.push({ state, text: el.innerText.replace(/\s+/g, ' ').trim() });
                    if (Math.max(doc.body.scrollWidth, doc.documentElement.scrollWidth) > doc.documentElement.clientWidth + 1) findings.push(`${state}: document overflow`);
                });
                cy.screenshot(`cheer-detail-${id}-${state}`, { capture: 'viewport' }); cy.then(persist);
            };
            const measure = (state: string, selector: string) => cy.get(selector).each(($el) => {
                const el = $el[0], rect = el.getBoundingClientRect(), name = el.getAttribute('aria-label') || el.textContent?.trim();
                observations.push({ state, control: name, width: rect.width, height: rect.height });
                if (rect.width < 43.99 || rect.height < 43.99) findings.push(`${state}/${name}: below44px`);
            });
            visit(96001); cy.get(root, { timeout: 20000 }).should('exist'); cy.get(`${root} .animate-skeleton-pulse`).should('exist'); capture('post-loading', root);
            cy.then(() => releasePost()); cy.wait('@post-96001').its('response.statusCode').should('equal', 200);
            cy.get(article, { timeout: 20000 }).should('contain.text', content); capture('post-data');
            align('img[alt="게시 이미지 1"]'); cy.get('img[alt="게시 이미지 1"]').should(($img) => expect(($img[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0));
            cy.get('[role="img"][aria-label="게시 이미지 2을 불러올 수 없습니다"]').should('exist'); capture('image-fallback', 'img[alt="게시 이미지 1"]');
            cy.get('img[alt="게시 이미지 1"]').click({ scrollBehavior: false }); cy.get(lightbox).should('exist');
            cy.get('[data-testid="image-lightbox-image"]').should(($img) => expect(($img[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0));
            capture('lightbox-good', lightbox, false); cy.get('body').type('{rightarrow}');
            cy.get('[data-testid="image-lightbox-error"]').should('exist'); capture('lightbox-failed', lightbox, false);
            measure('lightbox', `${lightbox} button`);
            cy.get('[data-testid="image-lightbox-close"]').then(($el) => {
                const el = $el[0], doc = el.ownerDocument, rect = el.getBoundingClientRect();
                const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                const reachable = Boolean(hit && (hit === el || el.contains(hit)));
                observations.push({ state: 'lightbox-close-hit', reachable, dialog: $el.closest('[role="dialog"]')[0].getBoundingClientRect().toJSON() });
                if (!reachable) findings.push('lightbox close center obscured or outside viewport');
            });
            cy.get('body').type('{esc}'); cy.get(lightbox).should('not.exist');
            align('#cheer-comments-section'); cy.get(panel, { timeout: 20000 }).should('exist');
            cy.wrap(null).should(() => expect(commentsSeen).to.be.greaterThan(0)); cy.get(`${panel} [aria-busy="true"]`).should('exist'); capture('comments-loading', panel);
            cy.then(() => releaseComments()); cy.wait('@comments-96001-0-error').its('response.statusCode').should('equal', 503);
            cy.get('[data-testid="cheer-comments-retry"]').should('exist'); measure('comments-error', `${panel} button`); capture('comments-error', panel);
            cy.then(() => { commentsPhase = 'empty'; }); align('[data-testid="cheer-comments-retry"]'); cy.get('[data-testid="cheer-comments-retry"]').click({ scrollBehavior: false });
            cy.wait('@comments-96001-0-empty').its('response.statusCode').should('equal', 200);
            cy.get(`${panel} [aria-busy="true"]`).should('not.exist'); cy.contains(panel, '아직 댓글이 없습니다.').should('exist'); capture('comments-empty', panel);
            cy.get('[data-testid="cheer-comments-submit"]').should('be.disabled'); align('textarea[aria-label="댓글 입력"]');
            cy.get('textarea[aria-label="댓글 입력"]').type('서버로 보내지 않는 합성 입력입니다.', { scrollBehavior: false });
            cy.get('[data-testid="cheer-comments-submit"]').should('be.enabled'); measure('comment-draft', '[data-testid="cheer-comments-submit"]'); capture('comment-draft', panel);
            visit(96002); cy.wait('@post-96002'); cy.get(article).should('contain.text', content); align('#cheer-comments-section');
            cy.wait('@comments-96002-0-empty'); cy.get('[aria-label="댓글 목록"] [role="listitem"]').should('have.length', 20);
            measure('comments-data', `${panel} button`); capture('comments-data', panel);
            align('[data-testid="cheer-comments-show-more"]'); cy.get('[data-testid="cheer-comments-show-more"]').click({ scrollBehavior: false });
            cy.wait('@comments-96002-1-empty'); cy.get('[aria-label="댓글 목록"] [role="listitem"]').should('have.length', 21);
            cy.get('[data-testid="cheer-comments-show-more"]').should('not.exist'); capture('comments-page-two', '[aria-label="댓글 목록"] [role="listitem"]:last-child');
            visit(96003); cy.wait('@post-96003').its('response.statusCode').should('equal', 503);
            cy.contains(root, '게시글을 불러오지 못했습니다.').should('exist'); measure('post-error', `${root} button`); capture('post-error', root);
            cy.then(() => { postRecovered = true; }); cy.contains(`${root} button`, '다시 시도').click(); cy.wait('@post-96003');
            cy.get(article, { timeout: 20000 }).should('contain.text', content); capture('post-recovered');
            visit(96004); cy.wait('@post-96004').its('response.statusCode').should('equal', 404);
            cy.contains(root, '게시글을 불러오지 못했습니다.').should('exist'); capture('post-not-found-response', root);
            visit(96005, true); cy.wait('@post-96005'); cy.get(article).should('contain.text', content);
            align('#cheer-comments-section');
            cy.get('[data-testid="cheer-comments-login"]', { timeout: 20000 }).should('exist'); cy.get('textarea[aria-label="댓글 입력"]').should('not.exist');
            cy.contains(panel, '아직 댓글이 없습니다.').should('exist'); measure('guest', '[data-testid="cheer-comments-login"]'); capture('guest-empty', panel);
            cy.then(() => { expect(writes).to.equal(0); observations.push({ finished: true }); }); cy.then(persist);
            cy.then(() => expect(findings, 'Cheer detail design findings').to.deep.equal([]));
        });
    }
});
