/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

// Real routes and API consumers, with synthetic responses only.
const user = { id: 123, email: 'screen-test@example.invalid', name: 'Screen Test', handle: 'screen-test', favoriteTeam: 'HH' };
const blockedSection = '[data-testid="mypage-blocked-users-section"]';
const welcome = '멋진 선택이에요! 함께 응원하며 즐거운 야구 생활을 시작해보세요.';
const releases: Array<() => void> = [];

function visit(path: string, theme?: 'light' | 'dark') {
    cy.visit(path, {
        onBeforeLoad(win) {
            seedCypressAuthState(win, user, undefined, { theme });
            const NativeWebSocket = win.WebSocket;
            win.WebSocket = new Proxy(NativeWebSocket, {
                construct(target, args) {
                    const url = new URL(String(args[0]), win.location.href);
                    if (args[1] === 'vite-hmr' && url.host === win.location.host) return Reflect.construct(target, args);
                    return Object.assign(new win.EventTarget(), {
                        readyState: NativeWebSocket.CLOSED, close() {}, send() {},
                        onopen: null, onclose: null, onerror: null, onmessage: null,
                    });
                },
            });
        },
    });
}

function page(number: number, count: number, last: boolean) {
    return {
        content: Array.from({ length: count }, (_, index) => ({
            handle: `@blocked-${number * 20 + index}`, name: `Blocked ${number * 20 + index}`,
            profileImageUrl: null,
        })),
        number, size: 20, totalPages: last && number === 0 ? 1 : 2,
        totalElements: last && number === 0 ? count : 22, last,
    };
}

function scrollBurst() {
    cy.get(`${blockedSection} .overflow-y-auto`).then(($element) => {
        const element = $element[0];
        element.scrollTop = element.scrollHeight;
        const EventConstructor = element.ownerDocument.defaultView!.Event;
        for (let index = 0; index < 8; index += 1) element.dispatchEvent(new EventConstructor('scroll'));
    });
}

describe('Screen type-fix behavior regressions', () => {
    beforeEach(() => {
        const base = new URL(String(Cypress.config('baseUrl')));
        expect(base.hostname).to.eq('127.0.0.1');
        cy.intercept({ url: '**', middleware: true }, (request) => {
            if (new URL(request.url).origin !== base.origin) request.reply({ statusCode: 204, log: false });
        });
        cy.intercept({ pathname: /^\/api(?:\/|$)/ }, {
            statusCode: 503, body: { code: 'TEST_ONLY_UNMOCKED_REQUEST' }, log: false,
        });
        cy.mockAPI();
        cy.viewport(1440, 1000);
    });

    afterEach(() => { releases.splice(0).forEach((release) => release()); });

    const metadataCases = [
        { name: 'summary precedence', body: { summary: 'Synthetic summary', description: 'Synthetic description', homeStadium: '잠실야구장' }, expected: 'Synthetic summary' },
        { name: 'description fallback', body: { description: 'Synthetic description', homeStadium: '잠실야구장' }, expected: 'Synthetic description' },
        { name: 'stadium alias fallback', body: { homeStadium: '잠실야구장' }, expected: '홈구장: 서울 · 잠실야구장' },
        { name: 'normalized stadium is not prefixed twice', body: { homeStadium: '서울 · 잠실야구장' }, expected: '홈구장: 서울 · 잠실야구장' },
        { name: 'unknown synthetic stadium is preserved', body: { homeStadium: '테스트구장' }, expected: '홈구장: 테스트구장' },
        { name: 'missing metadata uses welcome', body: {}, expected: welcome },
        { name: 'blank stadium uses welcome', body: { homeStadium: '   ' }, expected: welcome },
    ];
    for (const scenario of metadataCases) {
        it(`Cheer: ${scenario.name}`, () => {
            cy.intercept('GET', '**/api/franchises/*/metadata', { body: scenario.body }).as('metadata');
            visit('/cheer');
            cy.wait('@metadata');
            cy.get('[data-testid="cheer-sidebar-team"] > p').should('be.visible').and('have.text', scenario.expected);
            cy.get('[data-testid="cheer-runtime-route"]').should('be.visible');
        });
    }

    for (const width of [1440, 390]) {
        it(`Blocked users: pagination, in-flight deduplication and terminal page at ${width}px`, () => {
            cy.viewport(width, 900);
            const requests: number[] = [];
            let releaseNext = () => {};
            const barrier = new Cypress.Promise<void>((resolve) => { releaseNext = resolve; });
            releases.push(releaseNext);
            cy.intercept('GET', '**/api/users/me/blocked*', (request) => {
                const number = Number(new URL(request.url).searchParams.get('page'));
                requests.push(number);
                expect(new URL(request.url).searchParams.get('size')).to.eq('20');
                if (number === 0) request.reply({ body: page(0, 20, false) });
                else return barrier.then(() => { request.reply({ body: page(number, 2, true) }); });
            }).as('blocked');
            visit('/mypage?view=blockedUsers');
            cy.wait('@blocked');
            cy.get(`${blockedSection} [data-testid="profile-unblock-button"]`).should('have.length', 20);
            scrollBurst();
            cy.wrap(requests).should('deep.equal', [0, 1]);
            cy.get(`${blockedSection} .animate-spin`).should('exist');
            scrollBurst();
            cy.get(`${blockedSection} .animate-spin`).should('be.visible');
            cy.then(() => { expect(requests).to.deep.eq([0, 1]); releaseNext(); });
            cy.wait('@blocked');
            cy.get(`${blockedSection} [data-testid="profile-unblock-button"]`).should('have.length', 22);
            scrollBurst();
            cy.get(`${blockedSection} .animate-spin`).should('not.exist');
            cy.then(() => { expect(requests).to.deep.eq([0, 1]); });
        });
    }

    it('Blocked users: unblocking invalidates the real list query', () => {
        let unblocked = false;
        let reads = 0;
        cy.intercept('GET', '**/api/users/me/blocked*', (request) => {
            reads += 1;
            request.reply({ body: page(0, unblocked ? 0 : 1, true) });
        }).as('blocked');
        cy.intercept('POST', '**/api/users/profile/%40blocked-0/block', (request) => {
            unblocked = true;
            request.reply({ body: { blocked: false, blockedCount: 0 } });
        }).as('unblock');
        visit('/mypage?view=blockedUsers');
        cy.wait('@blocked');
        cy.get(`${blockedSection} [data-testid="profile-unblock-button"]`).click();
        cy.wait('@unblock');
        cy.wait('@blocked');
        cy.get(blockedSection).should('contain.text', '차단한 사용자가 없습니다.');
        cy.get(`${blockedSection} [data-testid="profile-unblock-button"]`).should('not.exist');
        cy.then(() => { expect(reads).to.eq(2); });
    });

    for (const width of [390, 1440]) {
        for (const state of ['error', 'empty'] as const) {
            for (const theme of ['light', 'dark'] as const) {
                it(`MyPage statistics: ${state} state at ${width}px in ${theme} theme`, () => {
                    cy.viewport(width, 900);
                    cy.intercept('GET', '**/api/auth/mypage*', {
                        statusCode: 200,
                        body: { success: true, data: { ...user, role: 'ROLE_USER', hasPassword: true } },
                    });
                    cy.intercept('GET', '**/api/diary*', { statusCode: 200, body: [] });
                    cy.intercept('GET', '**/api/diary/statistics*', state === 'error'
                        ? { statusCode: 503, body: { code: 'LOCAL_QA_FAILURE' } }
                        : {
                            statusCode: 200,
                            body: {
                                totalCount: 0, totalWins: 0, totalLosses: 0, totalDraws: 0,
                                winRate: 0, mostVisitedStadium: null, mostVisitedCount: 0,
                                monthlyVisitCounts: {}, stadiumVisitCounts: {}, emojiCounts: {},
                                opponentWinRates: {},
                            },
                        }).as('statistics');
                    visit('/mypage?view=stats', theme);
                    cy.wait('@statistics');
                    cy.get('html').should('have.class', theme);
                    cy.get('section[data-screen-label="나의 기록"]', { timeout: 20000 }).within(() => {
                        if (state === 'error') {
                            cy.get('[role="alert"]').should('be.visible')
                                .and('contain.text', '통계를 불러오지 못했어요')
                                .and('contain.text', '잠시 후 다시 방문하면 통계를 확인할 수 있어요.');
                            cy.contains('아직 분석할 기록이 없어요').should('not.exist');
                        } else {
                            cy.contains('아직 분석할 기록이 없어요').should('be.visible');
                            cy.contains('통계를 불러오지 못했어요').should('not.exist');
                        }
                    });
                    if (width === 390 && state === 'error') {
                        cy.document().then((doc) => {
                            const message = doc.querySelector<HTMLElement>('section[data-screen-label="나의 기록"] .mypage-season-empty-copy');
                            expect(message, 'error guidance').to.exist;
                            const win = doc.defaultView!;
                            const nav = doc.querySelector('[data-testid="auth-mobile-bottom-nav"]');
                            expect(nav, 'authenticated mobile navigation').to.exist;
                            expect(win.innerWidth, 'CSS viewport width').to.eq(390);
                            expect(win.innerHeight, 'CSS viewport height').to.eq(900);
                            const messageRect = message!.getBoundingClientRect();
                            const navRect = nav!.getBoundingClientRect();
                            expect(messageRect.bottom, 'error guidance clears fixed bottom navigation')
                                .to.be.at.most(navRect.top);
                        });
                    }
                    cy.screenshot(`mypage-statistics-${state}-${width}-${theme}`, { capture: 'viewport' });
                });
            }
        }
    }
});
