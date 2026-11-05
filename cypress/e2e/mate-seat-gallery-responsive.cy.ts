/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

// Non-production fiction only; no real game, ticket, photo, account or venue.
const user = { id: 99270, email: 'gallery@example.invalid', name: '합성 갤러리 참여자',
    handle: 'synthetic-gallery-viewer', favoriteTeam: null, role: 'ROLE_USER', hasPassword: true, profileImageUrl: null };
const party = { id: 99271, hostId: 99272, hostName: '합성 호스트', hostHandle: 'synthetic-gallery-host',
    hostBadge: 'NEW', teamId: '합성 홈', homeTeam: '합성 홈', awayTeam: '합성 원정',
    gameDate: '2099-05-15', gameTime: '18:30', stadium: '합성 검증 구장', section: '합성 좌석 구역',
    maxParticipants: 4, currentParticipants: 2, description: '합성 갤러리 UI 검증', ticketVerified: false,
    ticketPrice: 0, status: 'PENDING', createdAt: '2099-05-01T09:00:00Z' };

describe('Mate seat gallery synthetic responsive states', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    const findings: string[] = [], observations: Array<Record<string, unknown>> = [];
                    let mode: 'held-mixed' | 'empty' = 'held-mixed', reads = 0, writes = 0, release!: () => void;
                    const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
                    const panel = '[data-testid="mate-seat-panel"]', gallery = `${panel} [data-testid="seat-view-gallery"]`;
                    const photo = (index: number) => `${gallery} [data-testid="seat-view-photo-${index}"]`;
                    const box = '[data-testid="seat-view-lightbox"]', close = '[data-testid="seat-view-lightbox-close"]';
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/mate-seat-gallery-${id}.json`, {
                        width, font, theme, findings, observations, reads, writes,
                    });
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        const url = new URL(req.url);
                        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                            writes++;
                            return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                        }
                        if (url.origin !== origin.origin) return req.reply({ forceNetworkError: true, log: false });
                        const frontend = url.pathname === `/mate/${party.id}` || /\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname);
                        if (!frontend && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')) {
                            req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_LOCAL_ROUTE' });
                        }
                    });
                    cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    cy.intercept('**/auth/**', { statusCode: 503, body: {} });
                    cy.intercept('GET', '**/auth/mypage*', { statusCode: 200, body: { success: true, data: user } });
                    cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
                    cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
                    cy.intercept('GET', `**/api/parties/${party.id}`, { statusCode: 200, body: party });
                    cy.intercept('GET', `**/api/applications/party/${party.id}*`, { statusCode: 200, body: [] });
                    cy.intercept('GET', `**/api/applications/party/${party.id}/mine`, { statusCode: 200, body: null });
                    cy.intercept('GET', '**/api/diary/seat-views*', (req) => {
                        reads++;
                        const query = new URL(req.url).searchParams;
                        expect(query.get('stadium')).to.equal(party.stadium);
                        expect(query.get('section')).to.equal(party.section);
                        const reply = () => req.reply({ statusCode: 200, body: mode === 'empty' ? [] : ['good', 'failed'].map((kind) => ({
                            photoUrl: `${origin.origin}/__qa__/mate-seat-${kind}.svg`, stadium: party.stadium,
                            section: party.section, block: null, diaryDate: '2099-05-15',
                        })) });
                        return mode === 'held-mixed' ? gate.then(reply) : reply();
                    });
                    cy.intercept('GET', '**/__qa__/mate-seat-good.svg', { statusCode: 200,
                        headers: { 'content-type': 'image/svg+xml', 'cache-control': 'no-store' },
                        body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#25776b"/><text x="40" y="240" font-size="40" fill="white">SYNTHETIC IMAGE</text></svg>' });
                    cy.intercept('GET', '**/__qa__/mate-seat-failed.svg', { statusCode: 404, body: '', headers: { 'cache-control': 'no-store' } });
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    const visit = () => cy.visit(`/mate/${party.id}`, { onBeforeLoad(win) {
                        win.localStorage.clear(); win.sessionStorage.clear();
                        seedCypressAuthState(win, user, undefined, { theme });
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.fontSize = `${font}px`;
                        win.document.documentElement.style.scrollBehavior = 'auto';
                    } });
                    const capture = (state: string, selector = gallery) => {
                        cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.screenshot(`mate-seat-gallery-${id}-${state}`, { capture: 'viewport' });
                        cy.then(persist);
                    };
                    const measure = (selector: string, state: string) => {
                        cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(selector).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, r = el.getBoundingClientRect();
                            const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                            const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                            observations.push({ state, control: selector, width: r.width, height: r.height, left: r.left, right: r.right,
                                top: r.top, bottom: r.bottom, receivesPointer, hit: hit?.closest('[data-testid]')?.getAttribute('data-testid') });
                            if (r.width < 44 || r.height < 44 || r.left < -1 || r.right > width + 1 || !receivesPointer
                                || el.scrollWidth > el.clientWidth + 1) findings.push(`${state}: control size/bounds/center`);
                        });
                        cy.then(persist);
                    };
                    const activateMeasured = (selector: string, state: string) => {
                        cy.then(() => {
                            const metric = observations.find((item) => item.state === state && item.control === selector);
                            if (metric?.receivesPointer) cy.get(selector).click();
                            else {
                                observations.push({ setup: 'keyboard-activation-after-measured-obstruction', state });
                                cy.get(selector).focus(); cy.press(Cypress.Keyboard.Keys.SPACE);
                            }
                        });
                    };
                    const openPanel = () => {
                        cy.get('[data-testid="mate-open-seat-panel"]', { timeout: 15000 }).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get('[data-testid="mate-open-seat-panel"]').click();
                        cy.get(panel).should('exist');
                    };
                    visit(); openPanel();
                    cy.get(`${gallery} .animate-pulse`).should('have.length.greaterThan', 0);
                    capture('loading'); cy.then(() => release());
                    cy.get(`${photo(0)} img`).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                    cy.get(`${photo(0)} img`).should(($el) => expect(($el[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0));
                    cy.get(photo(1)).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                    cy.get(`${photo(1)} [data-testid="seat-view-image-fallback"]`).should('be.visible').and('have.attr', 'aria-label', '시야 사진을 불러오지 못했습니다.');
                    measure(photo(0), 'loaded-thumbnail'); measure(photo(1), 'failed-thumbnail'); capture('mixed');
                    cy.get(photo(0)).focus(); cy.press(Cypress.Keyboard.Keys.SPACE);
                    cy.get(`${box} img`).should(($el) => expect(($el[0] as HTMLImageElement).naturalWidth).to.be.greaterThan(0));
                    measure(close, 'loaded-close'); capture('loaded-lightbox', close);
                    cy.get(panel).closest('[role="dialog"]').then(($dialog) => {
                        const count = Array.from($dialog[0].querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
                            .filter((el) => el.getClientRects().length > 0).length;
                        const start = $dialog[0].ownerDocument.activeElement;
                        const seen = new Set<Element>(start ? [start] : []);
                        let reachedClose = false, returnedToStart = false;
                        observations.push({ focusStart: start?.getAttribute('data-testid') ?? start?.getAttribute('aria-label'),
                            parentFocusableCount: count });
                        for (let step = 0; step < count + 2; step++) {
                            cy.press(Cypress.Keyboard.Keys.TAB);
                            cy.document().then((doc) => {
                                const active = doc.activeElement as HTMLElement;
                                const isClose = active.matches(close);
                                reachedClose ||= isClose;
                                returnedToStart ||= active === start && seen.size > 1;
                                const repeated = seen.has(active);
                                seen.add(active);
                                const r = active.getBoundingClientRect(), hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                                observations.push({ focusStep: step, parentFocusableCount: count, close: isClose, repeated, returnedToStart: active === start,
                                    active: active.getAttribute('data-testid') ?? active.getAttribute('aria-label'),
                                    focusVisible: active.matches(':focus-visible'), centerHit: hit === active || Boolean(hit && active.contains(hit)) });
                            });
                        }
                        cy.then(() => {
                            observations.push({ keyboard: 'native-forward-tab', steps: count + 2, reachedClose, returnedToStart, distinctElements: seen.size });
                            if (!reachedClose) findings.push(returnedToStart
                                ? 'loaded-lightbox: observed parent-dialog Tab cycle excludes close'
                                : `loaded-lightbox: close not reached in ${count + 2} forward Tab presses`);
                        });
                    });
                    capture('keyboard-after-cycle', close);
                    activateMeasured(close, 'loaded-close'); cy.get(box).should('not.exist'); cy.get(panel).should('exist');
                    cy.get(photo(1)).focus(); cy.press(Cypress.Keyboard.Keys.SPACE);
                    cy.get(`${box} [data-testid="seat-view-image-fallback"]`).should('be.visible').and('contain.text', '사진을 불러오지 못했어요');
                    measure(close, 'failed-close'); capture('failed-lightbox', close);
                    activateMeasured(close, 'failed-close'); cy.get(box).should('not.exist');
                    measure('[data-testid="mate-seat-panel-close"]', 'panel-footer-close');
                    activateMeasured('[data-testid="mate-seat-panel-close"]', 'panel-footer-close'); cy.get(panel).should('not.exist');
                    cy.then(() => { mode = 'empty'; }); visit(); openPanel();
                    cy.contains(gallery, '아직 등록된 시야가 없어요').should('exist');
                    measure('[data-testid="seat-view-share-link"]', 'empty-share'); capture('empty');
                    measure('[data-testid="mate-seat-panel-close"]', 'empty-panel-close'); capture('empty-footer', '[data-testid="mate-seat-panel-close"]');
                    activateMeasured('[data-testid="mate-seat-panel-close"]', 'empty-panel-close'); cy.get(panel).should('not.exist');
                    cy.document().then((doc) => {
                        expect(doc.defaultView!.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                        expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                        expect(writes).to.equal(0);
                        observations.push({ finished: true, documentWidth: Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) });
                    });
                    cy.then(persist);
                    cy.then(() => expect(findings, 'Mate gallery design findings').to.deep.equal([]));
                });
            }
        }
    }
});
