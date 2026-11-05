/// <reference types="cypress" />

describe('Legacy public profile alias synthetic guest states', () => {
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width}px / ${font}px / ${theme}`, () => {
            const id = `${width}-${font}-${theme}`, handle = 'design_alias_target';
            const origin = new URL(String(Cypress.config('baseUrl'))).origin;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const profile = { name: '합성 별칭 사용자', handle, favoriteTeam: null, profileImageUrl: null,
                bio: '실제 사용자가 아닌 합성 프로필입니다.', cheerPoints: 0 };
            let phase: 'unavailable' | 'data' | 'notfound' = 'unavailable', release!: () => void, foreignBlocked = 0;
            const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
            const mutations: Array<{ method: string; path: string }> = [], unexpectedReads: string[] = [];
            const requests: Array<Record<string, unknown>> = [], observations: Array<Record<string, unknown>> = [], findings: string[] = [];
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/profile-alias-${id}.json`, {
                width, font, theme, phase, foreignBlocked, mutations, unexpectedReads, requests, observations, findings,
            });
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url), mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
                if (mutation) mutations.push({ method: req.method, path: url.pathname });
                if (url.origin !== origin) {
                    foreignBlocked++;
                    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) unexpectedReads.push(url.pathname);
                    return req.reply({ forceNetworkError: true, log: false });
                }
                if (mutation) return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                if (!url.pathname.startsWith('/mypage/') && !url.pathname.startsWith('/profile/')
                    && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                    && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) {
                    return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
                }
            });
            cy.intercept('**/api/**', (req) => {
                unexpectedReads.push(new URL(req.url).pathname); req.reply({ statusCode: 503, body: {} });
            });
            cy.intercept('**/auth/**', (req) => {
                unexpectedReads.push(new URL(req.url).pathname); req.reply({ statusCode: 401, body: {} });
            });
            cy.intercept('GET', `${origin}/api/auth/mypage`, { statusCode: 401, body: {} });
            cy.intercept('GET', /\/api\/users\/profile\/[^/?]+(?:\?.*)?$/, (req) => {
                const url = new URL(req.url), current = phase;
                expect(decodeURIComponent(url.pathname.split('/').pop()!)).to.equal(`@${handle}`);
                expect(url.search).to.equal(''); req.alias = `profile-${current}`;
                const reply = () => {
                    const status = current === 'unavailable' ? 503 : current === 'notfound' ? 404 : 200;
                    requests.push({ kind: 'profile', phase: current, path: url.pathname, status });
                    req.reply({ statusCode: status, body: current === 'data' ? { success: true, data: profile }
                        : { code: current === 'notfound' ? 'SYNTHETIC_NOT_FOUND' : 'SYNTHETIC_UNAVAILABLE' } });
                };
                return current === 'unavailable' ? gate.then(reply) : reply();
            });
            cy.intercept('GET', '**/api/users/profile/*/follow-counts*', (req) => {
                const url = new URL(req.url);
                expect(url.pathname).to.equal(`/api/users/profile/${handle}/follow-counts`);
                expect(url.search).to.equal('');
                expect(decodeURIComponent(url.pathname.split('/').at(-2)!).replace(/^@/, '')).to.equal(handle);
                expect(phase).to.equal('data'); requests.push({ kind: 'counts', phase, path: url.pathname, search: url.search });
                req.reply({ statusCode: 200, body: { followerCount: 2, followingCount: 0, isFollowedByMe: false,
                    notifyNewPosts: false, blockedByMe: false, blockingMe: false } });
            }).as('counts');
            cy.intercept('GET', '**/api/cheer/user/*/posts*', (req) => {
                const url = new URL(req.url);
                expect(url.pathname).to.equal(`/api/cheer/user/${handle}/posts`);
                expect(Array.from(url.searchParams.entries()).sort()).to.deep.equal([['page', '0'], ['size', '20']]);
                expect(decodeURIComponent(url.pathname.split('/').at(-2)!)).to.equal(handle);
                expect(url.searchParams.get('page')).to.equal('0'); expect(url.searchParams.get('size')).to.equal('20');
                expect(phase).to.equal('data'); requests.push({ kind: 'posts', phase, path: url.pathname, search: url.search });
                req.reply({ statusCode: 200, body: { content: [], last: true, totalElements: 0, totalPages: 0, number: 0, size: 20 } });
            }).as('posts');
            cy.viewport(width, width === 1280 ? 900 : 844);
            const visit = (prefix: string) => cy.visit(`/mypage/${prefix}${handle}`, { onBeforeLoad(win) {
                win.localStorage.clear(); win.sessionStorage.clear(); win.document.cookie = 'Authorization=; max-age=0; path=/';
                win.localStorage.setItem('kbo-theme', theme); win.localStorage.setItem('bega_has_visited', 'true');
                win.localStorage.setItem('bega_dont_show_guide', 'true');
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            const canonical = () => {
                cy.location('pathname').should('equal', `/profile/@${handle}`);
                cy.location('search').should('equal', '');
            };
            const capture = (state: string, selector: string) => {
                cy.document().then((doc) => doc.fonts.ready);
                cy.get(selector).first().should('be.visible').then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                    const overflow = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > doc.documentElement.clientWidth + 1;
                    if (overflow) findings.push(`${state}: document overflow`);
                    observations.push({ state, path: win.location.pathname, text: el.innerText, documentWidth: doc.documentElement.scrollWidth });
                });
                cy.screenshot(`profile-alias-${id}-${state}`, { capture: 'viewport' }); cy.then(persist);
            };
            visit(''); canonical(); cy.get('main .animate-pulse').should('exist'); capture('held-profile', 'main .animate-pulse');
            cy.then(() => release()); cy.wait('@profile-unavailable').its('response.statusCode').should('equal', 503);
            cy.get('main h2').should('be.visible').and('not.be.empty');
            cy.get('main .animate-pulse').should('not.exist');
            cy.get('main').then(($el) => {
                const text = $el[0].innerText;
                if (text.includes('사용자를 찾을 수 없습니다.') || text.includes('존재하지 않거나 삭제된 사용자일 수 있습니다.')) {
                    findings.push('503 profile read is presented as user not found');
                }
            });
            capture('unavailable-profile', 'main h2');
            cy.then(() => { phase = 'data'; }); visit('@'); canonical(); cy.wait(['@profile-data', '@counts', '@posts']);
            cy.contains('main h1', profile.name).should('be.visible'); cy.contains('main', profile.bio).should('exist');
            cy.contains('main button', '메시지 보내기').should('not.exist'); capture('resolved-profile', 'main h1');
            cy.contains('main p', '아직 작성한 게시글이 없습니다.').should('be.visible').then(($el) => $el.attr('data-alias-qa-empty', 'true'));
            capture('empty-posts', '[data-alias-qa-empty="true"]');
            cy.then(() => { phase = 'notfound'; }); visit(''); canonical();
            cy.wait('@profile-notfound').its('response.statusCode').should('equal', 404);
            cy.contains('main h2', '사용자를 찾을 수 없습니다.').should('be.visible'); capture('notfound-profile', 'main h2');
            cy.contains('main button', '뒤로 가기').then(($el) => {
                const rect = $el[0].getBoundingClientRect(); observations.push({ state: 'notfound-back', width: rect.width, height: rect.height });
                if (rect.width < 43.99 || rect.height < 43.99) findings.push('notfound back control below44px');
            });
            cy.then(() => {
                expect(unexpectedReads).to.deep.equal([]);
                expect(mutations.filter((x) => !(x.method === 'POST' && x.path === '/api/auth/reissue'))).to.deep.equal([]);
                expect(requests.filter((x) => x.kind === 'profile').map((x) => x.status)).to.deep.equal([503, 200, 404]);
                expect(requests.filter((x) => x.kind === 'counts')).to.have.length(1);
                expect(requests.filter((x) => x.kind === 'posts')).to.have.length(1);
                observations.push({ finished: true });
            }); cy.then(persist);
            cy.then(() => expect(findings, 'legacy alias synthetic design findings').to.deep.equal([]));
        });
    }
});
