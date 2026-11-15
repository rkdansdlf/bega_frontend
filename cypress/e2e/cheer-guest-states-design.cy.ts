/// <reference types="cypress" />

describe('Clean guest Cheer feed state evidence', () => {
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width}px / ${font}px / ${theme}`, () => {
            const origin = new URL(String(Cypress.config('baseUrl'))).origin, id = `${width}-${font}-${theme}`;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const root = '[data-testid="cheer-runtime-route"]', card = '[data-testid="cheer-post-card"]';
            const error = '[data-testid="cheer-feed-error-state"]', empty = '[data-testid="cheer-feed-empty-state"]';
            const gated = '[data-testid="cheer-feed-login-required"]';
            const posts = [1, 2].map((n) => ({ id: 970100 + n, author: `합성 작성자 ${n}`, authorId: 970200 + n, authorHandle: `synthetic_guest_author_${n}`,
                authorTeamId: null, teamId: 'LG', team: 'LG', content: `실제 게시글이 아닌 합성 목록 문구 ${n}입니다.`,
                createdAt: '2026-10-24T00:00:00Z', postType: 'NORMAL', isOwner: false, views: 0, likeCount: 0, commentCount: 0, bookmarkCount: 0, repostCount: 0,
                imageUrls: n === 1 ? [`${origin}/synthetic-cheer-good.svg`, `${origin}/synthetic-cheer-missing.svg`] : [] }));
            const page = (content: unknown[]) => ({ content, last: true, number: 0, size: 20, totalPages: content.length ? 1 : 0, totalElements: content.length });
            let phase: 'error' | 'empty' | 'data' = 'error', release!: () => void, foreignBlocked = 0, followingRequests = 0;
            const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
            const mutations: Array<{ method: string; path: string }> = [], responses: Array<Record<string, unknown>> = [], observations: Array<Record<string, unknown>> = [], findings: string[] = [];
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/cheer-guest-${id}.json`, { width, font, theme, phase, foreignBlocked, followingRequests, mutations, responses, observations, findings });
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url), mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
                if (mutation) mutations.push({ method: req.method, path: url.pathname });
                if (url.origin !== origin) { foreignBlocked++; return req.reply({ forceNetworkError: true, log: false }); }
                if (mutation) return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                if (url.pathname !== '/cheer' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                    && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
            });
            cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
            cy.intercept('**/auth/**', { statusCode: 401, body: {} });
            cy.intercept('GET', '**/api/auth/mypage*', { statusCode: 401, body: {} });
            cy.intercept('GET', /\/api\/cheer\/posts(?:\?.*)?$/, (req) => {
                const current = phase; req.alias = `feed-${current}`;
                const reply = () => {
                    responses.push({ kind: 'feed', phase: current, status: current === 'error' ? 503 : 200 });
                    req.reply({ statusCode: current === 'error' ? 503 : 200, body: current === 'error'
                        ? { code: 'SYNTHETIC_UNAVAILABLE', message: '합성 목록 조회 실패입니다.' } : page(current === 'data' ? posts : []) });
                };
                return current === 'error' ? gate.then(reply) : reply();
            });
            cy.intercept('GET', '**/api/cheer/posts/hot*', { statusCode: 200, body: page([]) });
            cy.intercept('GET', '**/api/cheer/posts/changes*', { statusCode: 200, body: { newCount: 0, latestId: 970102 } });
            cy.intercept('GET', '**/api/cheer/posts/following*', (req) => { followingRequests++; req.reply({ statusCode: 503, body: {} }); });
            cy.intercept('GET', '**/api/leaderboard?*', { statusCode: 200, body: page([]) });
            cy.intercept('GET', '**/api/kbo/schedule*', { statusCode: 200, body: [] });
            cy.intercept('GET', '**/synthetic-cheer-good.svg', { statusCode: 200, headers: { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' },
                body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="100"><rect width="120" height="100" fill="#375b50"/></svg>' });
            cy.intercept('GET', '**/synthetic-cheer-missing.svg', { statusCode: 404, headers: { 'cache-control': 'no-store' }, body: '' });
            cy.viewport(width, width === 1280 ? 900 : 844);
            const visit = (path = '/cheer') => cy.visit(path, { onBeforeLoad(win) {
                win.localStorage.clear(); win.sessionStorage.clear(); win.document.cookie = 'Authorization=; max-age=0; path=/';
                win.localStorage.setItem('kbo-theme', theme); win.localStorage.setItem('bega_has_visited', 'true'); win.localStorage.setItem('bega_dont_show_guide', 'true');
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            const align = (el: HTMLElement) => {
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                const doc = el.ownerDocument, bottom = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect().bottom ?? 80;
                doc.defaultView!.scrollBy({ top: el.getBoundingClientRect().top - bottom - 16, behavior: 'instant' });
            };
            const capture = (state: string, selector: string) => {
                cy.document().then((doc) => doc.fonts.ready);
                cy.get(selector).first().then(($el) => {
                    align($el[0]); const doc = $el[0].ownerDocument, win = doc.defaultView!;
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                    expect(win.matchMedia('(min-width: 1024px)').matches).to.equal(width >= 1024);
                    expect(doc.cookie.includes('Authorization=')).to.equal(false);
                    observations.push({ state, path: win.location.pathname, search: win.location.search, text: doc.querySelector<HTMLElement>(root)?.innerText,
                        documentWidth: doc.documentElement.scrollWidth, bodyWidth: doc.body.scrollWidth });
                    if (Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > doc.documentElement.clientWidth + 1) {
                        findings.push(`${state}: document overflow`);
                        observations.push({ state, overflowingCardElements: Array.from(doc.querySelectorAll<HTMLElement>(`${card},${card} *`)).filter((el) => {
                            const rect = el.getBoundingClientRect(); return rect.width > 0 && rect.right > doc.documentElement.clientWidth + 1;
                        }).slice(0, 12).map((el) => ({ tag: el.tagName, className: el.className, text: el.innerText?.slice(0, 80),
                            width: el.getBoundingClientRect().width, right: el.getBoundingClientRect().right })) });
                    }
                }); cy.screenshot(`cheer-guest-${id}-${state}`, { capture: 'viewport' }); cy.then(persist);
            };
            const measure = (state: string, selector: string) => cy.get(selector).each(($el) => {
                const el = $el[0], r = el.getBoundingClientRect(); observations.push({ state, control: el.getAttribute('aria-label') || el.textContent?.trim(), width: r.width, height: r.height });
                if (r.width < 43.99 || r.height < 43.99) findings.push(`${state}: control below44px`);
            });
            visit(); cy.get('[data-testid="cheer-feed-skeleton"]', { timeout: 20000 }).should('exist'); capture('held-loading', '[data-testid="cheer-feed-skeleton"]');
            cy.then(() => release()); cy.get(error, { timeout: 20000 }).should('exist'); cy.get(empty).should('not.exist');
            capture('query-error', error); measure('query-error', `${error} button`);
            cy.then(() => { phase = 'empty'; }); cy.get(`${error} button`).then(($el) => align($el[0])); cy.get(`${error} button`).click({ scrollBehavior: false });
            cy.wait('@feed-empty'); cy.get(empty).should('contain.text', '아직 작성된 응원글이 없습니다.'); cy.get(error).should('not.exist');
            capture('healthy-empty-retry', empty); measure('empty-write', `${empty} button`);
            cy.then(() => { phase = 'data'; }); visit(); cy.wait('@feed-data'); cy.get(card, { timeout: 20000 }).should('have.length', 2);
            capture('populated', card);
            cy.get(`${card} img[alt="게시 이미지 1"]`).then(($el) => align($el[0]));
            cy.get(`${card} img[alt="게시 이미지 1"]`).should(($el) => expect(($el[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0));
            cy.get(`${card} [role="img"][aria-label="게시 이미지 2을 불러올 수 없습니다"]`).should('be.visible');
            cy.get(`${card} img[alt="게시 이미지 1"],${card} [role="img"][aria-label="게시 이미지 2을 불러올 수 없습니다"]`).each(($el) => {
                const r = $el[0].getBoundingClientRect(); observations.push({ state: 'image-host', label: $el[0].getAttribute('alt') || $el[0].getAttribute('aria-label'), width: r.width, height: r.height });
                if (r.width <= 0 || r.height <= 0) findings.push('image host collapsed');
            });
            capture('image-success-and-fallback', `${card} img[alt="게시 이미지 1"]`);
            measure('first-card-controls', `${card}:first button`);
            visit('/cheer?tab=following'); cy.get(gated, { timeout: 20000 }).should('contain.text', '로그인이 필요합니다');
            capture('following-login-required', gated); measure('following-login', `${gated} button`);
            cy.then(() => {
                expect(followingRequests).to.equal(0);
                expect(mutations.filter(({ path }) => !path.endsWith('/auth/reissue'))).to.deep.equal([]);
                observations.push({ finished: true });
            }); cy.then(persist); cy.then(() => expect(findings, 'guest Cheer feed design findings').to.deep.equal([]));
        });
    }
});
