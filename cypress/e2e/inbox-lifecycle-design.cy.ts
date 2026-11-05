/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

describe('Inbox local-only request lifecycle and row presentation', () => {
    for (const width of [320, 390, 1280]) for (const font of [16, 32]) for (const theme of ['light', 'dark'] as const) {
        it(`${width}px / ${font}px / ${theme}`, () => {
            const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl'))).origin;
            expect(new URL(origin).hostname).to.equal('127.0.0.1');
            const root = '[data-testid="dm-inbox-runtime"]', row = '[data-testid="dm-inbox-room-row"]';
            const viewer = { id: 950001, email: 'inbox-qa@example.invalid', name: '합성 방문자', handle: 'synthetic_inbox_viewer',
                favoriteTeam: null, role: 'ROLE_USER', profileImageUrl: null, hasPassword: true };
            const rooms = Array.from({ length: 8 }, (_, n) => ({ roomId: 950100 + n, targetUser: {
                id: 950200 + n, name: n === 0 ? '합성 긴 사용자 표시 검증' : `합성 사용자 ${n + 1}`,
                handle: `synthetic_inbox_person_${n + 1}`, favoriteTeam: null,
                profileImageUrl: n === 0 ? '/synthetic-inbox-missing.svg' : n === 1 ? '/synthetic-inbox-good.svg' : null,
            }, lastMessage: n === 1 ? null : { content: `실제 대화가 아닌 합성 미리보기 ${n + 1}입니다.`, createdAt: '2026-10-24T10:00:00Z', senderId: 950200 + n }, hasUnread: n === 0 }));
            let phase: 'error' | 'empty' | 'populated' = 'error', release!: () => void, foreignBlocked = 0;
            const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
            const mutations: Array<{ method: string; path: string }> = [], requests: Array<Record<string, unknown>> = [], observations: Array<Record<string, unknown>> = [], findings: string[] = [];
            const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/inbox-${id}.json`, { width, font, theme, phase, foreignBlocked, mutations, requests, observations, findings });
            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url), mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
                if (mutation) mutations.push({ method: req.method, path: url.pathname });
                if (url.origin !== origin) { foreignBlocked++; return req.reply({ forceNetworkError: true, log: false }); }
                if (mutation) return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                if (url.pathname !== '/messages' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                    && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
            });
            cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
            cy.intercept('**/auth/**', { statusCode: 401, body: {} });
            cy.intercept('GET', '**/api/auth/mypage*', { statusCode: 200, body: { success: true, data: toAuthApiUser(viewer) } });
            cy.intercept('GET', '**/api/chat/my/unread-counts*', { statusCode: 200, body: { success: true, data: 0 } });
            cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
            cy.intercept('GET', '**/api/notifications/my/unread-count*', { statusCode: 200, body: 0 });
            cy.intercept('GET', '**/api/dm/rooms/my*', (req) => {
                const current = phase; req.alias = `inbox-${current}`;
                const reply = () => {
                    requests.push({ phase: current, status: current === 'error' ? 503 : 200 });
                    req.reply({ statusCode: current === 'error' ? 503 : 200, body: current === 'error'
                        ? { success: false, code: 'SYNTHETIC_UNAVAILABLE', message: '합성 목록 조회 실패입니다.' }
                        : { success: true, data: current === 'empty' ? [] : rooms } });
                };
                return current === 'error' ? gate.then(reply) : reply();
            });
            cy.intercept('GET', '**/synthetic-inbox-missing.svg', { statusCode: 404, headers: { 'cache-control': 'no-store' }, body: '' });
            cy.intercept('GET', '**/synthetic-inbox-good.svg', { statusCode: 200, headers: { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' },
                body: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="#375b50"/><circle cx="24" cy="24" r="12" fill="white"/></svg>' });
            cy.viewport(width, width === 1280 ? 900 : 844);
            // Only Date is frozen; query retry/load timers retain real behavior.
            cy.clock(Date.UTC(2026, 9, 24, 12), ['Date']);
            cy.on('window:before:load', (win) => {
                win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, viewer, undefined, { theme });
                win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
            });
            const align = (el: HTMLElement) => {
                el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                const doc = el.ownerDocument, bottom = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect().bottom ?? 80;
                doc.defaultView!.scrollBy({ top: el.getBoundingClientRect().top - bottom - 16, behavior: 'instant' });
            };
            const capture = (state: string, getTarget: () => Cypress.Chainable<JQuery<HTMLElement>>) => {
                cy.document().then((doc) => doc.fonts.ready);
                getTarget().then(($el) => {
                    align($el[0]); const doc = $el[0].ownerDocument, win = doc.defaultView!;
                    expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                    expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                    expect(win.matchMedia('(min-width: 1024px)').matches).to.equal(width >= 1024);
                    observations.push({ state, path: win.location.pathname, text: doc.querySelector<HTMLElement>(root)?.innerText,
                        documentWidth: doc.documentElement.scrollWidth, bodyWidth: doc.body.scrollWidth });
                    if (Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > doc.documentElement.clientWidth + 1) findings.push(`${state}: document overflow`);
                });
                cy.screenshot(`inbox-${id}-${state}`, { capture: 'viewport' }); cy.then(persist);
            };
            const measureRow = (index: number, state: string, explicitlyAligned = true) => cy.get(row).eq(index).then(($el) => {
                const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, r = el.getBoundingClientRect();
                const column = el.children[1] as HTMLElement, name = column.querySelector('span')!, preview = column.querySelector('p')!;
                const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                const headerBottom = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect().bottom ?? 0;
                const docks = Array.from(doc.querySelectorAll<HTMLElement>('[data-testid="auth-mobile-bottom-nav"],[data-testid="public-mobile-bottom-nav"]')).filter((node) => Cypress.dom.isVisible(node));
                const dockTop = Math.min(win.innerHeight, ...docks.map((node) => node.getBoundingClientRect().top));
                const firstGlyphWidth = (element: Element) => {
                    const range = doc.createRange(); range.setStart(element.firstChild!, 0); range.setEnd(element.firstChild!, 1);
                    return range.getBoundingClientRect().width;
                };
                const nameGlyphWidth = firstGlyphWidth(name), previewGlyphWidth = firstGlyphWidth(preview);
                const visibleTop = Math.max(r.top, headerBottom), visibleBottom = Math.min(r.bottom, dockTop);
                const visibleHit = visibleTop < visibleBottom ? doc.elementFromPoint(r.left + r.width / 2, (visibleTop + visibleBottom) / 2) : null;
                const visibleSampleReceivesPointer = visibleHit === el || Boolean(visibleHit && el.contains(visibleHit));
                observations.push({ state, index, width: r.width, height: r.height, textColumnWidth: column.getBoundingClientRect().width,
                    nameWidth: name.getBoundingClientRect().width, previewWidth: preview.getBoundingClientRect().width,
                    nameGlyphWidth, previewGlyphWidth, explicitlyAligned, visibleSampleReceivesPointer,
                    receivesPointer: hit === el || Boolean(hit && el.contains(hit)), top: r.top, bottom: r.bottom, headerBottom, dockTop });
                if (r.width < 43.99 || r.height < 43.99) findings.push(`${state}: row below44px`);
                if (name.getBoundingClientRect().width <= 0 || preview.getBoundingClientRect().width <= 0) findings.push(`${state}: name or preview collapsed`);
                if (name.getBoundingClientRect().width + 0.01 < nameGlyphWidth || preview.getBoundingClientRect().width + 0.01 < previewGlyphWidth) findings.push(`${state}: name or preview cannot fit one content glyph`);
                if (explicitlyAligned && (r.top < headerBottom || r.bottom > dockTop)) findings.push(`${state}: aligned row outside chrome-safe area`);
                if (explicitlyAligned && !(hit === el || Boolean(hit && el.contains(hit)))) findings.push(`${state}: row center obscured`);
                if (!explicitlyAligned && !visibleSampleReceivesPointer) findings.push(`${state}: focused row sampled point obscured`);
            });
            cy.visit('/messages'); cy.get(root, { timeout: 20000 }).should('exist');
            cy.get(row).should('not.exist'); cy.get(`${root} p`).should('not.exist'); capture('held-loading', () => cy.get(`${root} h1`));
            cy.then(() => release());
            // App default retries once. Wait for both responses, then the rendered
            // non-loading state; do not relabel the first failed attempt as settled.
            cy.wait('@inbox-error'); cy.wait('@inbox-error');
            cy.get(`${root} p`, { timeout: 20000 }).should('have.length.greaterThan', 0);
            cy.get(root).then(($el) => {
                const text = $el[0].innerText, errorAsEmpty = text.includes('아직 대화가 없습니다');
                observations.push({ state: 'error-presentation', errorAsEmpty, text });
                if (errorAsEmpty) findings.push('query error presented as healthy empty');
            }); capture('query-error', () => cy.get(`${root} h1`));
            cy.then(() => { phase = 'empty'; }); cy.reload(); cy.wait('@inbox-empty');
            cy.get(root).should('contain.text', '아직 대화가 없습니다'); capture('healthy-empty-reload', () => cy.get(`${root} p`).last());
            cy.get(`${root} p`).last().then(($el) => {
                const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!, range = doc.createRange(); range.selectNodeContents(el);
                const lines = Array.from(range.getClientRects()).filter((r) => r.width > 0), last = lines.at(-1)!;
                const hit = doc.elementFromPoint(last.left + last.width / 2, last.top + last.height / 2);
                observations.push({ state: 'empty-final-line', top: last.top, bottom: last.bottom, receivesPointer: hit === el || Boolean(hit && el.contains(hit)), viewportHeight: win.innerHeight });
                if (!(hit === el || Boolean(hit && el.contains(hit)))) findings.push('empty final line obscured after alignment');
            });
            cy.then(() => { phase = 'populated'; }); cy.reload(); cy.wait('@inbox-populated'); cy.get(row).should('have.length', 8);
            cy.get(row).eq(1).then(($el) => align($el[0]));
            cy.get(`${row} img[alt="${rooms[1].targetUser.name}"]`).should(($img) => expect(($img[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0));
            cy.get(row).first().then(($el) => align($el[0]));
            cy.get(`${row} [data-testid="profile-avatar-fallback"][aria-label="${rooms[0].targetUser.name}"]`).should('exist');
            cy.get(row).eq(1).should('contain.text', '대화를 시작해보세요.');
            capture('populated-first', () => cy.get(row).first()); measureRow(0, 'first-row');
            cy.get(row).first().focus(); cy.document().then((doc) => expect(doc.activeElement).to.equal(doc.querySelector(row)));
            cy.press(Cypress.Keyboard.Keys.TAB); cy.get(row).eq(1).then(($el) => {
                expect($el[0].ownerDocument.activeElement).to.equal($el[0]); observations.push({ state: 'native-tab', target: 'second-row', programmaticStart: 'first-row' });
            }); measureRow(1, 'native-tab-second-row', false);
            capture('populated-last', () => cy.get(row).last()); measureRow(7, 'last-row');
            cy.location('pathname').should('equal', '/messages');
            cy.then(() => { expect(mutations).to.deep.equal([]); observations.push({ finished: true }); }); cy.then(persist);
            cy.then(() => expect(findings, 'Inbox lifecycle/design findings').to.deep.equal([]));
        });
    }
});
