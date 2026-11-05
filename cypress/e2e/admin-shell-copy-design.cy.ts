/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

// UI-only counts, not real platform statistics. No management activation.
describe('Admin shell complete text-slot and focus-ring boundary geometry', () => {
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width}px / ${font}px / ${theme}`, () => {
            const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const viewer = { id: 950096, email: 'shell-design@example.invalid', name: '합성 관리자', handle: 'design_shell_admin',
                role: 'ROLE_ADMIN', favoriteTeam: null, profileImageUrl: null, hasPassword: true };
            const names = ['users', 'posts', 'parties', 'reports', 'game-status', 'client-errors', 'seat-views', 'offseason', 'stadiums', 'ai'];
            const cards = [{ name: 'users', label: '전체 사용자', value: '123,456' }, { name: 'posts', label: '전체 게시글', value: '2,345' },
                { name: 'mates', label: '메이트 모임', value: '67' }];
            const mutations: string[] = [], unexpectedReads: string[] = [], findings: string[] = [];
            const observations: Array<Record<string, unknown>> = [];
            let foreignBlocked = 0, statsReplies = 0, usersReplies = 0, finished = false;
            let statsPhase: 'error' | 'data' = 'error', releaseStats!: () => void;
            const statsGate = new Cypress.Promise<void>((resolve) => { releaseStats = resolve; });
            const statsStatuses: number[] = [];
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/shell-${id}.json`, {
                width, font, requestedTheme: theme, foreignBlocked, statsReplies, usersReplies, statsStatuses, mutations, unexpectedReads, observations, findings, finished,
            });
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url);
                if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                    mutations.push(`${req.method} ${url.pathname}`); return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                }
                if (url.origin !== origin) {
                    foreignBlocked++;
                    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) unexpectedReads.push(url.pathname);
                    return req.reply({ forceNetworkError: true, log: false });
                }
                if (url.pathname !== '/admin' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                    && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
            });
            cy.intercept('**/api/**', (req) => { unexpectedReads.push(new URL(req.url).pathname); req.reply({ statusCode: 503, body: {} }); });
            cy.intercept('**/auth/**', (req) => { unexpectedReads.push(new URL(req.url).pathname); req.reply({ statusCode: 401, body: {} }); });
            cy.intercept('GET', `${origin}/api/auth/mypage`, { statusCode: 200, body: { success: true, data: toAuthApiUser(viewer) } });
            cy.intercept('GET', `${origin}/api/admin/stats`, (req) => {
                const current = statsPhase; statsReplies++; req.alias = `shell-stats-${current}`;
                const reply = () => {
                    const status = current === 'error' ? 503 : 200; statsStatuses.push(status);
                    req.reply({ statusCode: status, body: status === 503 ? {} : { success: true, data: { totalUsers: 123456, totalPosts: 2345, totalMates: 67 } } });
                };
                return current === 'error' ? statsGate.then(reply) : reply();
            });
            cy.intercept('GET', `${origin}/api/admin/users*`, (req) => {
                const url = new URL(req.url); expect(url.pathname).to.equal('/api/admin/users');
                expect(Array.from(url.searchParams.entries()).every(([key, value]) => key === 'search' && value === '')).to.equal(true);
                usersReplies++; req.alias = 'shell-users'; req.reply({ statusCode: 200, body: { success: true, data: [] } });
            });
            cy.intercept('GET', `${origin}/api/dm/rooms/my`, { statusCode: 200, body: { success: true, data: [] } });
            cy.intercept('GET', `${origin}/api/chat/my/unread-counts`, { statusCode: 200, body: { success: true, data: 0 } });
            cy.intercept('GET', `${origin}/api/notifications/my*`, (req) => {
                const url = new URL(req.url); expect(url.pathname).to.equal('/api/notifications/my'); expect(url.search).to.equal('');
                req.reply({ statusCode: 200, body: [] });
            });
            cy.intercept('GET', `${origin}/api/notifications/my/unread-count`, { statusCode: 200, body: 0 });
            cy.viewport(width, width === 1280 ? 900 : 844);
            const visit = () => cy.visit('/admin', { onBeforeLoad(win) {
                win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            } });
            visit(); cy.wait('@shell-users'); cy.get('[data-testid="admin-users-empty"]').should('exist');
            cy.document().then((doc) => doc.fonts.ready);
            cy.wrap(null).should(() => expect(statsReplies).to.equal(1));
            const unknownStats = (state: string) => {
                cy.get('[data-testid="admin-stat-users"]').should('exist');
                for (const card of cards) cy.get(`[data-testid="admin-stat-${card.name}"] > div > div:first-child > p:last-child`).then(($el) => {
                    const el = $el[0], text = el.textContent?.trim() ?? '', rendered = Cypress.dom.isVisible(el);
                    observations.push({ name: `${state}-${card.name}`, text, rendered });
                    if (text === '0' && rendered) findings.push(`${state}-${card.name}: unknown count displayed as zero`);
                });
                cy.get('[data-testid="admin-stat-users"]').then(($el) => {
                    const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                    el.scrollIntoView({ block: 'center', behavior: 'instant' });
                    const header = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
                    win.scrollBy({ top: el.getBoundingClientRect().top - Math.max(header?.bottom ?? 0, 80) - 16, behavior: 'instant' });
                });
                cy.screenshot(`shell-${id}-stats-${state}`, { capture: 'viewport' });
            };
            unknownStats('loading');
            cy.then(() => releaseStats()); cy.wait('@shell-stats-error').its('response.statusCode').should('equal', 503);
            cy.get('[data-testid="admin-error-message"]').should('contain.text', '통계를 불러오는데 실패했습니다.');
            unknownStats('failed');
            cy.then(persist);
            cy.then(() => { statsPhase = 'data'; }); visit();
            cy.wait(['@shell-stats-data', '@shell-users']); cy.get('[data-testid="admin-users-empty"]').should('exist');
            cy.get('[data-testid="admin-error-message"]').should('not.exist');
            cy.document().then((doc) => doc.fonts.ready);
            const align = (selector: string) => cy.get(selector).first().then(($el) => {
                const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                const capsule = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
                win.scrollBy({ top: el.getBoundingClientRect().top - Math.max(capsule?.bottom ?? 0, 80) - 16, behavior: 'instant' });
            });
            const textGeometry = (selector: string, name: string) => cy.get(selector).should('have.length', 1).then(($el) => {
                const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, slot = el.getBoundingClientRect();
                expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                expect(win.localStorage.getItem('kbo-theme')).to.equal(theme);
                expect(doc.querySelector('[data-testid="admin-route-theme"]')?.classList.contains('dark')).to.equal(true);
                const bounds = [{ name: 'own text slot', left: slot.left, right: slot.right, top: slot.top, bottom: slot.bottom, x: true, y: true }];
                for (let ancestor = el.parentElement; ancestor; ancestor = ancestor.parentElement) {
                    // Page roots represent ordinary document scrolling, not a nested clip box.
                    if (ancestor === doc.documentElement || ancestor === doc.body || ancestor === doc.scrollingElement) continue;
                    const style = win.getComputedStyle(ancestor), r = ancestor.getBoundingClientRect();
                    const x = /hidden|clip|auto|scroll/.test(style.overflowX), y = /hidden|clip|auto|scroll/.test(style.overflowY);
                    if (x || y) bounds.push({ name: ancestor.getAttribute('data-testid') ?? ancestor.tagName,
                        left: r.left + ancestor.clientLeft, right: r.left + ancestor.clientLeft + ancestor.clientWidth,
                        top: r.top + ancestor.clientTop, bottom: r.top + ancestor.clientTop + ancestor.clientHeight, x, y });
                }
                const walker = doc.createTreeWalker(el, win.NodeFilter.SHOW_TEXT), chars: Array<Record<string, unknown>> = [];
                let node: Node | null;
                while ((node = walker.nextNode())) for (let i = 0; i < (node.textContent?.length ?? 0); i++) {
                    const char = node.textContent![i]; if (/\s/.test(char)) continue;
                    const range = doc.createRange(); range.setStart(node, i); range.setEnd(node, i + 1);
                    const rects = Array.from(range.getClientRects());
                    const outside = bounds.filter((b) => rects.some((r) => (b.x && (r.left < b.left - 1 || r.right > b.right + 1))
                        || (b.y && (r.top < b.top - 1 || r.bottom > b.bottom + 1)))).map((b) => b.name);
                    chars.push({ char, rects: rects.map((r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom })), outside });
                }
                expect(chars.length).to.be.greaterThan(0);
                const outsideCount = chars.filter((x) => (x.outside as string[]).length > 0
                    || !(x.rects as Array<{ left: number; right: number; top: number; bottom: number }>).some((r) => r.right > r.left && r.bottom > r.top)).length;
                const rendered = Cypress.dom.isVisible(el);
                const words: Array<{ word: string; rectangles: number }> = [];
                if (name.startsWith('menu-')) {
                    const textNodes = doc.createTreeWalker(el, win.NodeFilter.SHOW_TEXT);
                    let textNode: Node | null;
                    while ((textNode = textNodes.nextNode())) {
                        for (const match of (textNode.textContent ?? '').matchAll(/\S+/g)) {
                            const range = doc.createRange(); range.setStart(textNode, match.index!); range.setEnd(textNode, match.index! + match[0].length);
                            words.push({ word: match[0], rectangles: Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0).length });
                        }
                    }
                    expect(words.length).to.be.greaterThan(0);
                    if (words.some((word) => word.rectangles !== 1)) findings.push(`${name}: menu word fragmented`);
                }
                observations.push({ name, text: el.textContent, rendered, width: slot.width, height: slot.height, outsideCount, chars, bounds, words });
                if (!rendered || slot.width <= 0 || slot.height <= 0 || outsideCount) findings.push(`${name}: text cells exceed slot or clipping boundary`);
            });
            for (const card of cards) {
                const selector = `[data-testid="admin-stat-${card.name}"]`;
                cy.get(`${selector} > div > div:first-child > p:last-child`).should('have.text', card.value);
                cy.get(`${selector} [data-testid="admin-stat-label"]`).should('have.text', card.label);
                textGeometry(`${selector} [data-testid="admin-stat-label"]`, `${card.name}-label`);
                textGeometry(`${selector} > div > div:first-child > p:last-child`, `${card.name}-value`);
                align(selector); cy.screenshot(`shell-${id}-${card.name}`, { capture: 'viewport' }); cy.then(persist);
            }
            cy.get('[role="tablist"][aria-label="관리자 메뉴"] [role="tab"]').should('have.length', 10);
            for (const name of names) textGeometry(`[data-testid="admin-tab-${name}"] > span`, `menu-${name}`);
            // One native arrival is solely for measuring the AI ring's clipping boundary.
            cy.get('[data-testid="admin-tab-stadiums"]').focus(); cy.press(Cypress.Keyboard.Keys.TAB);
            cy.get('[data-testid="admin-tab-ai"]').then(($el) => {
                const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, style = win.getComputedStyle(el), r = el.getBoundingClientRect();
                expect(el.ownerDocument.activeElement).to.equal(el); expect(el.matches(':focus-visible')).to.equal(true);
                const spread = Math.max(0, ...Array.from(style.boxShadow.matchAll(/0px 0px 0px ([\d.]+)px/g), (m) => Number(m[1])));
                const clips: Array<Record<string, unknown>> = [];
                for (let ancestor = el.parentElement; ancestor; ancestor = ancestor.parentElement) {
                    if (ancestor === doc.documentElement || ancestor === doc.body || ancestor === doc.scrollingElement) continue;
                    const s = win.getComputedStyle(ancestor), a = ancestor.getBoundingClientRect();
                    if (/hidden|clip|auto|scroll/.test(s.overflowX) && (r.left - spread < a.left + ancestor.clientLeft - 1
                        || r.right + spread > a.left + ancestor.clientLeft + ancestor.clientWidth + 1)) clips.push({ name: ancestor.tagName, axis: 'x' });
                    if (/hidden|clip|auto|scroll/.test(s.overflowY) && (r.top - spread < a.top + ancestor.clientTop - 1
                        || r.bottom + spread > a.top + ancestor.clientTop + ancestor.clientHeight + 1)) clips.push({ name: ancestor.tagName, axis: 'y' });
                }
                observations.push({ name: 'ai-ring-boundary', spread, boxShadow: style.boxShadow, clips });
                if (!spread) findings.push('AI ring: measurable shadow absent');
                if (clips.length) findings.push('AI ring: shadow extent exceeds ancestor clip box');
            });
            cy.screenshot(`shell-${id}-ai-ring`, { capture: 'viewport' });
            cy.get('[data-testid="admin-tab-users"]').should('have.attr', 'aria-selected', 'true');
            cy.then(() => {
                expect(mutations).to.deep.equal([]); expect(unexpectedReads).to.deep.equal([]);
                expect(statsReplies).to.equal(2); expect(usersReplies).to.equal(2); expect(statsStatuses).to.deep.equal([503, 200]);
                expect(observations).to.have.length(23); finished = true;
            }); cy.then(persist);
            cy.then(() => expect(findings, 'Admin shell text/ring boundary findings').to.deep.equal([]));
        });
    }
});
