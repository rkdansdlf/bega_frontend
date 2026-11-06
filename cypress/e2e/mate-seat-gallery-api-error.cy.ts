/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

// Fictional local records only; no real account, game, venue, ticket or photo.
const user = { id: 99270, email: 'gallery@example.invalid', name: '합성 갤러리 참여자',
    handle: 'synthetic-gallery-viewer', favoriteTeam: null, role: 'ROLE_USER', hasPassword: true, profileImageUrl: null };
const party = { id: 99271, hostId: 99272, hostName: '합성 호스트', hostHandle: 'synthetic-gallery-host',
    hostBadge: 'NEW', teamId: '합성 홈', homeTeam: '합성 홈', awayTeam: '합성 원정',
    gameDate: '2099-05-15', gameTime: '18:30', stadium: '합성 검증 구장', section: '합성 좌석 구역',
    maxParticipants: 4, currentParticipants: 2, description: '합성 갤러리 API 오류 검증', ticketVerified: false,
    ticketPrice: 0, status: 'PENDING', createdAt: '2099-05-01T09:00:00Z' };

describe('Mate gallery query error versus normal empty', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    const findings: string[] = [], observations: Array<Record<string, unknown>> = [];
                    const responses: Array<{ mode: string; status: number }> = [];
                    let mode: 'error' | 'empty' = 'error', writes = 0, release!: () => void;
                    const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
                    const panel = '[data-testid="mate-seat-panel"]', gallery = `${panel} [data-testid="seat-view-gallery"]`;
                    let errorText = '', emptyText = '';
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/mate-gallery-query-${id}.json`, {
                        width, font, theme, findings, observations, responses, writes,
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
                        const requestMode = mode;
                        const query = new URL(req.url).searchParams;
                        expect(query.get('stadium')).to.equal(party.stadium);
                        expect(query.get('section')).to.equal(party.section);
                        const reply = () => {
                            const status = requestMode === 'error' ? 503 : 200;
                            responses.push({ mode: requestMode, status });
                            req.reply({ statusCode: status, body: requestMode === 'error' ? { code: 'SYNTHETIC_PHOTO_QUERY_UNAVAILABLE' } : [] });
                        };
                        return requestMode === 'error' ? gate.then(reply) : reply();
                    });
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    const visit = () => cy.visit(`/mate/${party.id}`, { onBeforeLoad(win) {
                        win.localStorage.clear(); win.sessionStorage.clear();
                        seedCypressAuthState(win, user, undefined, { theme });
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.fontSize = `${font}px`;
                        win.document.documentElement.style.scrollBehavior = 'auto';
                    } });
                    const openPanel = () => {
                        cy.get('[data-testid="mate-open-seat-panel"]', { timeout: 15000 }).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get('[data-testid="mate-open-seat-panel"]').click();
                        cy.get(panel).should('exist');
                    };
                    const capture = (state: string) => {
                        cy.get(gallery).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.screenshot(`mate-gallery-query-${id}-${state}`, { capture: 'viewport' });
                        cy.then(persist);
                    };
                    const snapshot = (state: 'query-error' | 'query-empty') => {
                        cy.get(`${gallery} .animate-pulse`, { timeout: 15000 }).should('not.exist');
                        cy.get(gallery).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                            const text = el.innerText.replace(/\s+/g, ' ').trim();
                            const emptyClaim = text.includes('아직 등록된 시야가 없어요');
                            const failureCopy = /불러|실패|오류|문제|연결|잠시|error|unavailable/i.test(text);
                            observations.push({ state, text, emptyClaim, failureCopy, images: el.querySelectorAll('img').length,
                                retryButtons: Array.from(el.querySelectorAll('button')).map((button) => button.innerText),
                                rootFont: win.getComputedStyle(doc.documentElement).fontSize, dark: doc.documentElement.classList.contains('dark') });
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                            if (state === 'query-error') {
                                errorText = text;
                                expect(el.querySelector('[data-testid="seat-view-query-error"]')?.getAttribute('role')).to.equal('alert');
                                const alert = el.querySelector<HTMLElement>('[data-testid="seat-view-query-error"]')!;
                                expect(alert.innerText).to.include('사진 조회 실패');
                                expect(alert.scrollWidth, 'error notice horizontal fit').to.be.at.most(alert.clientWidth + 1);
                                expect(responses.some((response) => response.mode === 'error' && response.status === 503)).to.equal(true);
                                if (emptyClaim || !failureCopy) findings.push('photo query failure is not distinguished from normal empty');
                            } else {
                                emptyText = text;
                                expect(responses.some((response) => response.mode === 'empty' && response.status === 200)).to.equal(true);
                                expect(emptyClaim, 'healthy empty claim').to.equal(true);
                                expect(el.querySelector('[data-testid="seat-view-query-error"]')).to.equal(null);
                            }
                        });
                        capture(state);
                    };
                    visit(); openPanel();
                    cy.get(`${gallery} .animate-pulse`).should('have.length.greaterThan', 0);
                    capture('held-loading'); cy.then(() => release());
                    snapshot('query-error');
                    cy.then(() => { mode = 'empty'; }); visit(); openPanel();
                    snapshot('query-empty');
                    cy.then(() => {
                        expect(writes).to.equal(0);
                        observations.push({ finished: true, identicalPresentation: errorText === emptyText });
                    });
                    cy.then(persist);
                    cy.then(() => expect(findings, 'query-state presentation findings').to.deep.equal([]));
                });
            }
        }
    }
});
