/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

describe('Cheer edit synthetic state design baseline', () => {
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width}px / ${font}px / ${theme}`, () => {
            const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl')));
            expect(origin.hostname).to.equal('127.0.0.1');
            const root = '[data-testid="cheer-edit-route"]';
            const profile = { id: 95001, email: 'cheer-edit@example.invalid', name: '합성 작성자', handle: 'synthetic-editor',
                role: 'ROLE_USER', favoriteTeam: 'DB', hasPassword: true, profileImageUrl: null };
            const content = '실제 게시글이 아닌 합성 화면 검증용 응원 문구입니다.';
            let writes = 0, releasePost!: () => void, releaseImages!: () => void, imageRequests = 0;
            const postGate = new Cypress.Promise<void>((resolve) => { releasePost = resolve; });
            const imagesGate = new Cypress.Promise<void>((resolve) => { releaseImages = resolve; });
            const findings: string[] = [], observations: Array<Record<string, unknown>> = [], responses: Array<Record<string, unknown>> = [];
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/cheer-edit-${id}.json`, { width, font, theme, writes, findings, observations, responses });
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url);
                if (url.origin !== origin.origin) return req.reply({ forceNetworkError: true, log: false });
                if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                    writes++; return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                }
                if (!/^\/cheer\/edit\/9500[1-6]$/.test(url.pathname) && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                    && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
            });
            cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
            cy.intercept('**/auth/**', { statusCode: 503, body: {} });
            cy.intercept('GET', '**/auth/mypage*', { statusCode: 200, body: { success: true, data: profile } });
            cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
            cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
            cy.intercept('GET', '**/synthetic-cheer-good.svg', { statusCode: 200, headers: { 'content-type': 'image/svg+xml' },
                body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#166534"/></svg>' });
            cy.intercept('GET', '**/synthetic-cheer-missing.svg', { statusCode: 404, body: '' });
            cy.intercept('GET', /\/api\/cheer\/posts\/9500[1-6](?:\?.*)?$/, (req) => {
                const postId = Number(new URL(req.url).pathname.split('/').at(-1)); req.alias = `post-${postId}`;
                const reply = () => {
                    const status = postId === 95004 ? 503 : postId === 95005 ? 404 : 200;
                    responses.push({ kind: 'post', postId, status });
                    req.reply({ statusCode: status, body: status === 200 ? { id: postId, teamId: 'DB', team: 'DB', content,
                        author: '합성 작성자', authorId: postId === 95003 ? 95099 : profile.id, authorHandle: 'synthetic-editor',
                        createdAt: '2099-01-01T00:00:00.000Z', postType: 'NORMAL', isOwner: postId !== 95003, imageUrls: [] }
                        : { message: status === 404 ? 'SYNTHETIC_NOT_FOUND' : 'SYNTHETIC_QUERY_FAILURE' } });
                };
                return postId === 95001 ? postGate.then(reply) : reply();
            });
            cy.intercept('GET', /\/api\/cheer\/posts\/9500[126]\/images(?:\?.*)?$/, (req) => {
                const postId = Number(new URL(req.url).pathname.split('/').at(-2)); req.alias = `images-${postId}`; imageRequests++;
                const reply = () => {
                    const status = postId === 95002 ? 503 : 200; responses.push({ kind: 'images', postId, status });
                    req.reply({ statusCode: status, body: status === 503 ? { message: 'SYNTHETIC_IMAGE_QUERY_FAILURE' } : postId === 95006 ? []
                        : ['good', 'missing'].map((kind, index) => ({ id: 95100 + index, storagePath: `synthetic/${kind}`, mimeType: 'image/svg+xml',
                            bytes: 100, isThumbnail: index === 0, url: `${origin.origin}/synthetic-cheer-${kind}.svg` })) });
                };
                return postId === 95001 ? imagesGate.then(reply) : reply();
            });
            cy.viewport(width, width === 1280 ? 900 : 844);
            const visit = (postId: number) => cy.visit(`/cheer/edit/${postId}`, { onBeforeLoad(win) {
                win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, profile, undefined, { theme });
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            const align = (selector: string) => cy.get(selector).first().then(($el) => {
                const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                const bottom = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect().bottom ?? 80;
                win.scrollBy({ top: el.getBoundingClientRect().top - bottom - 16, behavior: 'instant' });
            });
            const capture = (state: string, selector = root, realign = true) => {
                if (realign) align(selector);
                cy.get(root).then(($root) => {
                    const el = $root[0], doc = el.ownerDocument, win = doc.defaultView!;
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                    observations.push({ state, text: el.innerText.replace(/\s+/g, ' ').trim() });
                    if (Math.max(doc.body.scrollWidth, doc.documentElement.scrollWidth) > doc.documentElement.clientWidth + 1) findings.push(`${state}: document overflow`);
                });
                cy.screenshot(`cheer-edit-${id}-${state}`, { capture: 'viewport' }); cy.then(persist);
            };
            const measure = (state: string) => cy.get(`${root} button, ${root} label[role="button"]`).each(($el) => {
                const el = $el[0], rect = el.getBoundingClientRect(), name = el.getAttribute('aria-label') || el.textContent?.trim();
                observations.push({ state, control: name, width: rect.width, height: rect.height });
                if (rect.width < 43.99 || rect.height < 43.99) findings.push(`${state}/${name}: below44px`);
            });
            visit(95001); cy.get(root, { timeout: 20000 }).should('exist'); cy.get(`${root} .animate-pulse`).should('have.length', 2); capture('post-loading');
            cy.then(() => releasePost()); cy.wait('@post-95001').its('response.statusCode').should('equal', 200);
            cy.get(`${root} textarea`).should('have.value', content); cy.get(`${root} .animate-pulse`).should('not.exist');
            cy.wrap(null).should(() => expect(imageRequests).to.equal(1)); capture('images-pending', `${root} label[role="button"]`);
            cy.get(root).then(($el) => observations.push({ state: 'pending-images-guidance', text: $el[0].innerText }));
            cy.then(() => releaseImages()); cy.wait('@images-95001').its('response.body').should('have.length', 2);
            cy.get('img[alt="이미지 1"]').should(($img) => expect(($img[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0));
            cy.get('img[alt="이미지 2"]').should(($img) => { expect(($img[0] as HTMLImageElement).complete).to.equal(true); expect(($img[0] as HTMLImageElement).naturalWidth).to.equal(0); });
            // Current onError hides the image; wait for that handler, not only network completion.
            cy.get('img[alt="이미지 2"]').should('not.be.visible');
            measure('owned'); capture('owned-form', `${root} h2`); capture('image-results', 'img[alt="이미지 1"]');
            cy.get('img[alt="이미지 2"]').then(($img) => {
                const box = $img[0].parentElement!;
                // The current product exposes no fallback test-id; locate its existing copy,
                // not its styling classes, and use Cypress's ancestor-aware visibility check.
                const placeholder = Array.from(box.children).find((el) => el.tagName === 'DIV' && el.textContent?.includes('로딩 중...')) as HTMLElement | undefined;
                const visible = Boolean(placeholder && Cypress.dom.isVisible(placeholder));
                observations.push({ state: 'failed-image-fallback', visible, text: placeholder?.innerText });
                if (!visible) findings.push('failed existing image has no visible fallback');
            });
            align(`${root} textarea`); cy.get(`${root} textarea`).clear({ scrollBehavior: false });
            cy.contains(`${root} button`, '수정 완료').should('be.disabled'); capture('empty-content', `${root} textarea`);
            cy.get(`${root} textarea`).type(content, { scrollBehavior: false }); cy.contains(`${root} button`, '수정 완료').should('be.enabled');
            // Tab is delivered natively after a real pointer focus; do not trigger file selection.
            cy.press(Cypress.Keyboard.Keys.TAB);
            cy.document().then((doc) => {
                const active = doc.activeElement as HTMLElement, rect = active.getBoundingClientRect();
                const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                observations.push({ state: 'native-tab-after-editor', target: active.getAttribute('role') || active.tagName,
                    reachable: Boolean(hit && (hit === active || active.contains(hit))) });
            }); capture('native-tab', root, false);
            visit(95002); cy.wait('@post-95002'); cy.wait('@images-95002').its('response.statusCode').should('equal', 503);
            // There is no image loading/error state exposed by this route. Observe two
            // render frames after delivery; do not claim an explicit settled-error state.
            cy.window().then((win) => new Cypress.Promise<void>((resolve) => {
                win.requestAnimationFrame(() => win.requestAnimationFrame(() => resolve()));
            }));
            cy.get(`${root} textarea`).should('have.value', content); capture('image-query-error', `${root} label[role="button"]`);
            cy.get(root).then(($el) => {
                const text = $el[0].innerText; observations.push({ state: 'image-query-error-guidance', text });
                if (!/실패|문제|오류/.test(text)) findings.push('image query failure has no local failure guidance after two frames');
            });
            visit(95006); cy.wait('@post-95006'); cy.wait('@images-95006').its('response.body').should('deep.equal', []);
            cy.get(`${root} textarea`).should('have.value', content); capture('healthy-no-images', `${root} label[role="button"]`);
            visit(95003); cy.wait('@post-95003'); cy.contains(root, '수정 권한이 없습니다').should('exist');
            cy.get(`${root} textarea`).should('not.exist'); measure('denied');
            // Header alignment alone does not expose the actual denial copy on mobile.
            capture('denied', `${root} h2.mt-6`);
            visit(95004); cy.wait('@post-95004').its('response.statusCode').should('equal', 503);
            cy.contains(root, '게시글 정보를 불러오는 중 문제가 발생했습니다.', { timeout: 20000 }).should('exist'); capture('post-query-error');
            visit(95005); cy.wait('@post-95005').its('response.statusCode').should('equal', 404);
            cy.contains(root, '게시글 정보를 불러오는 중 문제가 발생했습니다.', { timeout: 20000 }).should('exist'); capture('post-not-found-response');
            cy.then(() => { expect(writes).to.equal(0); observations.push({ finished: true }); }); cy.then(persist);
            cy.then(() => expect(findings, 'Cheer edit design findings').to.deep.equal([]));
        });
    }
});
