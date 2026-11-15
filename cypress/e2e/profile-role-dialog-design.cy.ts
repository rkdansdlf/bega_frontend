/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

// Local-only presentation evidence: no follow/block/notify/message mutations.
describe('Profile roles and read-only follower dialogs', () => {
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const)
        for (const role of ['guest', 'own', 'followed', 'blocked'] as const) {
            it(`${role} / ${width}px / ${font}px / ${theme}`, () => {
                const id = `${role}-${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
                expect(new URL(origin).hostname).to.equal('127.0.0.1');
                const viewer = { id: 940123, email: 'profile-qa@example.invalid', name: '합성 방문자', handle: 'design_viewer',
                    favoriteTeam: null, role: 'ROLE_USER', profileImageUrl: null, hasPassword: true };
                const handle = role === 'own' ? viewer.handle : 'design_target';
                const profile = { name: '합성 프로필', handle, favoriteTeam: null, profileImageUrl: null,
                    bio: '실제 사용자가 아닌 합성 프로필입니다.', cheerPoints: 0 };
                const members = [
                    { id: 940124, name: '합성 목록 사용자', handle: 'design_member', favoriteTeam: null, profileImageUrl: null, isFollowedByMe: false },
                    { id: viewer.id, name: viewer.name, handle: viewer.handle, favoriteTeam: null, profileImageUrl: null, isFollowedByMe: false },
                ];
                const page = (content: unknown[]) => ({ content, last: true, totalElements: content.length, totalPages: content.length ? 1 : 0, number: 0, size: 20 });
                let listPhase: 'error' | 'data' = 'error', release!: () => void, foreignBlocked = 0;
                const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
                const mutations: Array<{ method: string; path: string }> = [], requests: Array<Record<string, unknown>> = [], findings: string[] = [], observations: Array<Record<string, unknown>> = [];
                const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/profile-role-${id}.json`, { role, width, font, theme, foreignBlocked, mutations, requests, observations, findings });
                cy.intercept({ url: '**', middleware: true }, (req) => {
                    const url = new URL(req.url), mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
                    if (mutation) mutations.push({ method: req.method, path: url.pathname });
                    if (url.origin !== origin) { foreignBlocked++; return req.reply({ forceNetworkError: true, log: false }); }
                    if (mutation) return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                    if (!url.pathname.startsWith('/profile/') && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                        && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
                });
                cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                cy.intercept('**/auth/**', { statusCode: 401, body: {} });
                cy.intercept('GET', '**/api/auth/mypage*', role === 'guest' ? { statusCode: 401, body: {} }
                    : { statusCode: 200, body: { success: true, data: toAuthApiUser(viewer) } });
                cy.intercept('GET', '**/api/dm/rooms/my*', { statusCode: 200, body: { success: true, data: [] } });
                cy.intercept('GET', '**/api/chat/my/unread-counts*', { statusCode: 200, body: { success: true, data: 0 } });
                cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
                cy.intercept('GET', '**/api/notifications/my/unread-count*', { statusCode: 200, body: 0 });
                cy.intercept('GET', /\/api\/users\/profile\/[^/?]+(?:\?.*)?$/, (req) => {
                    requests.push({ kind: 'profile', status: 200 }); req.reply({ statusCode: 200, body: { success: true, data: profile } });
                }).as('profile');
                cy.intercept('GET', '**/api/users/profile/*/follow-counts*', (req) => {
                    requests.push({ kind: 'counts', status: 200 }); req.reply({ statusCode: 200, body: { followerCount: 2, followingCount: 0,
                        isFollowedByMe: role === 'followed', notifyNewPosts: false, blockedByMe: role === 'blocked', blockingMe: false } });
                }).as('counts');
                cy.intercept('GET', '**/api/cheer/user/*/posts*', { statusCode: 200, body: page([]) }).as('posts');
                cy.intercept('GET', '**/api/users/profile/*/followers*', (req) => {
                    const phase = listPhase; req.alias = `followers-${phase}`;
                    const reply = () => { requests.push({ kind: 'followers', phase, status: phase === 'error' ? 503 : 200 });
                        req.reply({ statusCode: phase === 'error' ? 503 : 200, body: phase === 'error' ? { code: 'SYNTHETIC_UNAVAILABLE' } : page(members) }); };
                    return phase === 'error' ? gate.then(reply) : reply();
                });
                cy.intercept('GET', '**/api/users/profile/*/following*', (req) => {
                    requests.push({ kind: 'following', status: 200 }); req.reply({ statusCode: 200, body: page([]) });
                }).as('following');
                cy.viewport(width, width === 1280 ? 900 : 844);
                cy.visit(`/profile/${handle}`, { onBeforeLoad(win) {
                    win.localStorage.clear(); win.sessionStorage.clear(); win.document.cookie = 'Authorization=; max-age=0; path=/';
                    if (role !== 'guest') seedCypressAuthState(win, viewer, undefined, { theme });
                    win.localStorage.setItem('kbo-theme', theme); win.localStorage.setItem('bega_has_visited', 'true'); win.localStorage.setItem('bega_dont_show_guide', 'true');
                    win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
                } });
                const align = (el: HTMLElement) => {
                    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                    const bottom = el.ownerDocument.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect().bottom ?? 80;
                    el.ownerDocument.defaultView!.scrollBy({ top: el.getBoundingClientRect().top - bottom - 16, behavior: 'instant' });
                };
                const capture = (state: string, selector: string) => {
                    cy.document().then((doc) => doc.fonts.ready);
                    cy.get(selector).first().then(($el) => {
                        const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                        if (selector !== '[role="dialog"]') align(el);
                        expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                        expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                        expect(win.matchMedia('(min-width: 1024px)').matches).to.equal(width >= 1024);
                        // authStore intentionally persists an empty state; use fixture
                        // cookie + observed role controls, not persisted isLoggedIn.
                        expect(doc.cookie.includes('Authorization=')).to.equal(role !== 'guest');
                        if (Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > doc.documentElement.clientWidth + 1) findings.push(`${state}: document overflow`);
                        observations.push({ state, text: el.innerText, activeInDialog: Boolean(doc.querySelector('[role="dialog"]')?.contains(doc.activeElement)),
                            rect: { width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height } });
                        if (selector === '[role="dialog"]') {
                            el.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
                                const r = button.getBoundingClientRect(), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                                const receivesPointer = hit === button || Boolean(hit && button.contains(hit));
                                const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
                                let centerInVisibleArea = cx >= 0 && cx < win.innerWidth && cy >= 0 && cy < win.innerHeight;
                                for (let parent = button.parentElement; parent && parent !== doc.body; parent = parent.parentElement) {
                                    const style = win.getComputedStyle(parent), pr = parent.getBoundingClientRect();
                                    if (/auto|scroll|hidden|clip/.test(style.overflowY) && (cy < pr.top || cy > pr.bottom)) centerInVisibleArea = false;
                                    if (/auto|scroll|hidden|clip/.test(style.overflowX) && (cx < pr.left || cx > pr.right)) centerInVisibleArea = false;
                                }
                                observations.push({ state, control: button.getAttribute('aria-label') || button.textContent?.trim(), width: r.width, height: r.height, receivesPointer, centerInVisibleArea });
                                if (r.width < 43.99 || r.height < 43.99) findings.push(`${state}: control below44px (${button.getAttribute('aria-label') || button.textContent?.trim()})`);
                                if (centerInVisibleArea && !receivesPointer) findings.push(`${state}: visible control center obscured`);
                            });
                        }
                    });
                    cy.screenshot(`profile-role-${id}-${state}`, { capture: 'viewport' }); cy.then(persist);
                };
                cy.wait(['@profile', '@counts', '@posts']); cy.contains('main h1', profile.name).should('exist');
                cy.contains('아직 작성한 게시글이 없습니다.').should('exist');
                if (role === 'followed') {
                    cy.get('main [data-testid="profile-following-button"]').should('exist'); cy.contains('main button', '메시지 보내기').should('be.enabled');
                } else {
                    cy.get('main [data-testid="profile-following-button"], main [data-testid="profile-follow-button"]').should('not.exist');
                    if (role === 'blocked') { cy.contains('main button', '메시지 보내기').should('be.disabled'); cy.contains('차단 관계인 사용자에게는 메시지를 보낼 수 없습니다.').should('exist'); }
                    else cy.contains('main button', '메시지 보내기').should('not.exist');
                }
                capture('profile-role', 'main h1');
                if (role === 'followed' || role === 'blocked') {
                    cy.contains('main button', '메시지 보내기').then(($el) => {
                        align($el[0]); const rect = $el[0].getBoundingClientRect();
                        observations.push({ state: 'message-control', width: rect.width, height: rect.height });
                        if (rect.width < 43.99 || rect.height < 43.99) findings.push('message control below44px');
                    });
                    capture('profile-actions', 'main button.w-full');
                }
                cy.contains('main button span', '팔로워').closest('button').then(($el) => align($el[0]));
                cy.contains('main button span', '팔로워').closest('button').click({ scrollBehavior: false });
                cy.get('[role="dialog"]').should('contain.text', '팔로워'); cy.get('[role="dialog"] .animate-spin').should('exist'); capture('followers-held', '[role="dialog"]');
                cy.then(() => release()); cy.wait('@followers-error').its('response.statusCode').should('equal', 503);
                cy.get('[role="dialog"]').should('contain.text', '목록을 불러오지 못했습니다.').and('not.contain.text', '아직 팔로워가 없습니다.'); capture('followers-error', '[role="dialog"]');
                cy.then(() => { listPhase = 'data'; }); cy.contains('[role="dialog"] button', '다시 시도').click();
                cy.wait('@followers-data'); cy.get('[role="dialog"]').should('contain.text', members[0].name).and('contain.text', members[1].name);
                cy.get('[role="dialog"] [data-testid="profile-follow-button"]').should('have.length', role === 'guest' ? 2 : 1);
                capture('followers-data', '[role="dialog"]');
                cy.get('[role="dialog"] button[aria-label="닫기"]').focus();
                cy.document().then((doc) => {
                    expect(doc.activeElement?.getAttribute('aria-label')).to.equal('닫기');
                    observations.push({ state: 'native-tab-start', activeControl: '닫기', programmaticallyEstablished: true });
                });
                cy.press(Cypress.Keyboard.Keys.TAB); cy.document().then((doc) => {
                    const inDialog = Boolean(doc.querySelector('[role="dialog"]')?.contains(doc.activeElement));
                    observations.push({ state: 'one-native-tab', inDialog }); if (!inDialog) findings.push('one Tab escapes dialog');
                });
                cy.press(Cypress.Keyboard.Keys.ESC); cy.get('[role="dialog"]').should('not.exist');
                cy.contains('main button span', '팔로잉').closest('button').then(($el) => align($el[0])); cy.contains('main button span', '팔로잉').closest('button').click({ scrollBehavior: false });
                cy.wait('@following'); cy.get('[role="dialog"]').should('contain.text', '아직 팔로잉하는 유저가 없습니다.'); capture('following-empty', '[role="dialog"]');
                cy.get('[role="dialog"] button[aria-label="닫기"]').click(); cy.get('[role="dialog"]').should('not.exist');
                cy.then(() => {
                    expect(mutations.filter(({ path }) => !path.endsWith('/auth/reissue'))).to.deep.equal([]);
                    observations.push({ finished: true });
                }); cy.then(persist); cy.then(() => expect(findings, 'profile role/dialog findings').to.deep.equal([]));
            });
        }
});
