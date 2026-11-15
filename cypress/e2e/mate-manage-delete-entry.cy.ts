/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

const host = {
    id: 9241, email: 'synthetic@example.invalid', name: '합성 호스트',
    handle: 'synthetic-manage-host', favoriteTeam: 'HH', role: 'ROLE_USER',
    hasPassword: true, profileImageUrl: null,
};

// These values are fictional UI fixtures, not real games, users, or payments.
const party = {
    id: 99241, hostId: host.id, hostName: host.name, hostHandle: host.handle,
    hostBadge: 'VERIFIED', teamId: 'HH', homeTeam: '합성 홈', awayTeam: '합성 원정',
    gameDate: '2099-05-15', gameTime: '18:30', stadium: '합성 검증 구장',
    section: '합성 좌석 구역', maxParticipants: 4, currentParticipants: 1,
    description: '합성 관리 검증', ticketVerified: false, ticketPrice: 0,
    status: 'PENDING', createdAt: '2099-05-01T09:00:00Z',
};

class ClosedSocket extends EventTarget {
    static readonly CONNECTING = 0; static readonly OPEN = 1; static readonly CLOSING = 2; static readonly CLOSED = 3;
    readonly CONNECTING = 0; readonly OPEN = 1; readonly CLOSING = 2; readonly CLOSED = 3;
    readonly readyState = 3; readonly url: string; readonly protocol = ''; readonly extensions = ''; readonly bufferedAmount = 0;
    binaryType: BinaryType = 'blob'; onopen = null; onmessage = null; onerror = null; onclose = null;
    constructor(url: string | URL) { super(); this.url = String(url); }
    close() {} send() {}
}

type Scenario = 'empty' | 'pending' | 'approved';
const cases: Array<{ width: number; font: number; theme: 'light' | 'dark'; scenario: Scenario; editing?: boolean }> = [
    { width: 320, font: 16, theme: 'light', scenario: 'empty' },
    { width: 320, font: 32, theme: 'dark', scenario: 'pending' },
    { width: 390, font: 32, theme: 'light', scenario: 'approved' },
    { width: 640, font: 16, theme: 'dark', scenario: 'empty' },
    { width: 1023, font: 16, theme: 'light', scenario: 'pending' },
    { width: 1024, font: 16, theme: 'dark', scenario: 'empty' },
    { width: 320, font: 32, theme: 'light', scenario: 'empty', editing: true },
    { width: 1280, font: 16, theme: 'light', scenario: 'pending' },
];

describe('Mate manage delete entry (synthetic)', () => {
    for (const item of cases) {
        it(`${item.scenario}${item.editing ? ' while editing' : ''} at ${item.width}px / ${item.font}px / ${item.theme}`, () => {
            const origin = new URL(String(Cypress.config('baseUrl')));
            expect(['127.0.0.1', 'localhost']).to.include(origin.hostname);
            const writes: string[] = [];
            const foreign: string[] = [];
            const unknownApi: string[] = [];
            const unknownLocal: string[] = [];
            const application = {
                id: 99242, partyId: party.id, applicantId: 99245, applicantName: '합성 신청자',
                applicantHandle: 'synthetic-applicant', applicantBadge: 'TRUSTED', applicantRating: 4.5,
                message: '합성 메시지', depositAmount: 0, paymentType: 'DEPOSIT', paymentStatus: 'PAID',
                settlementStatus: 'PENDING', isApproved: item.scenario === 'approved', isRejected: false,
                ticketVerified: false, createdAt: '2099-05-01T09:00:00Z', responseDeadline: '2099-05-14T09:00:00Z',
            };

            cy.intercept({ url: '**', middleware: true }, (req) => {
                const url = new URL(req.url);
                if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                    writes.push(`${req.method} ${url.pathname}`);
                    return req.reply({ statusCode: 503, body: {} });
                }
                if (url.origin !== origin.origin) {
                    foreign.push(url.hostname);
                    return req.reply({ forceNetworkError: true });
                }
                const localReadAllowed = url.pathname.startsWith('/api/')
                    || url.pathname.startsWith('/assets/')
                    || url.pathname.startsWith('/src/')
                    || url.pathname.startsWith('/node_modules/.vite/')
                    || url.pathname.startsWith('/@vite/')
                    || url.pathname.startsWith('/@id/')
                    || ['/mate/99241/manage', '/favicon.ico', '/manifest.json', '/sw.js',
                        '/theme-init.js', '/performance-shell-init.js', '/seo-routes.json', '/@react-refresh',
                        '/node_modules/vite/dist/client/env.mjs'].includes(url.pathname);
                if (!localReadAllowed) {
                    unknownLocal.push(url.pathname);
                    return req.reply({ statusCode: 404, body: '' });
                }
            });
            cy.intercept({ pathname: '/api/**' }, (req) => {
                unknownApi.push(new URL(req.url).pathname);
                req.reply({ statusCode: 503, body: {} });
            });
            cy.intercept('GET', '**/api/auth/mypage*', { body: { success: true, data: host } });
            cy.intercept('GET', '**/api/chat/my/unread-counts*', { body: { success: true, data: 0 } });
            cy.intercept('GET', '**/api/dm/rooms/my*', { body: { success: true, data: [] } });
            cy.intercept('GET', '**/api/notifications/my*', { body: [] });
            cy.intercept('GET', '**/api/parties/99241*', { body: party }).as('party');
            cy.intercept('GET', '**/api/applications/party/99241*', { body: item.scenario === 'empty' ? [] : [application] }).as('applications');
            cy.intercept('GET', '**/sw.js', { statusCode: 404, body: '' });
            cy.intercept({ method: 'GET', pathname: '/mate/99241/manage' }, (req) => {
                req.continue((res) => {
                    expect(res.body, 'local application HTML').to.be.a('string');
                    const html = String(res.body)
                        .replace(/<link[^>]*rel="(?:dns-prefetch|preconnect)"[^>]*>/g, '')
                        .replace(/<noscript>[\s\S]*?cdn\.jsdelivr\.net[\s\S]*?<\/noscript>/, '')
                        .replace(/<script>\s*\(function \(\) \{\s*var HREF = 'https:\/\/cdn\.jsdelivr\.net[\s\S]*?<\/script>/, '');
                    expect(html, 'no deferred external font loader').not.to.contain('cdn.jsdelivr.net');
                    res.body = html;
                });
            });

            cy.viewport(item.width, 600);
            cy.visit('/mate/99241/manage', { onBeforeLoad(win) {
                if ('serviceWorker' in win.navigator) {
                    expect(win.navigator.serviceWorker.controller).to.equal(null);
                    Object.defineProperty(win.navigator.serviceWorker, 'register', {
                        configurable: true,
                        value: () => Promise.reject(new Error('Synthetic test disables service workers')),
                    });
                }
                win.localStorage.clear(); win.sessionStorage.clear();
                seedCypressAuthState(win, host, undefined, { theme: item.theme });
                win.document.documentElement.style.fontSize = `${item.font}px`;
                win.document.documentElement.style.scrollBehavior = 'auto';
                win.WebSocket = ClosedSocket as unknown as typeof WebSocket;
            } });
            cy.wait(['@party', '@applications']);
            cy.document().should((doc) => {
                expect(doc.defaultView!.getComputedStyle(doc.documentElement).fontSize).to.equal(`${item.font}px`);
                expect(doc.documentElement.classList.contains('dark')).to.equal(item.theme === 'dark');
            });
            if (item.editing) {
                cy.get('button:visible').contains('정보 수정').click();
                cy.get('#manage-description').clear().type('합성 수정 중 문구');
            }

            const deleteId = item.width < 1024 ? 'mate-manage-mobile-delete' : 'mate-manage-content-delete';
            cy.get(`[data-testid="${deleteId}"]`, { timeout: 20000 }).should('be.visible')
                .then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
            cy.get(`[data-testid="${deleteId}"]`).should(($el) => {
                const el = $el[0]; const rect = el.getBoundingClientRect(); const doc = el.ownerDocument;
                const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                expect(hit === el || Boolean(hit && el.contains(hit)), 'delete center is reachable').to.equal(true);
                if (item.width < 1024) {
                    expect(rect.width).to.be.at.least(44); expect(rect.height).to.be.at.least(44);
                    expect(rect.left).to.be.at.least(-1); expect(rect.right).to.be.at.most(item.width + 1);
                    expect(rect.top).to.be.at.least(-1); expect(rect.bottom).to.be.at.most(601);
                    for (const [x, y] of [[rect.left + 16, rect.top + 16], [rect.right - 16, rect.top + 16],
                        [rect.left + 16, rect.bottom - 16], [rect.right - 16, rect.bottom - 16]]) {
                        const point = doc.elementFromPoint(x, y);
                        expect(point === el || Boolean(point && el.contains(point)), 'delete interior point is reachable').to.equal(true);
                    }
                }
            }).click();

            if (item.scenario === 'approved') {
                cy.contains('승인된 참여자가 있어 파티를 삭제할 수 없습니다.').should('be.visible');
                cy.get('[data-testid="confirm-dialog"]').should('not.exist');
            } else {
                cy.get('[data-testid="confirm-dialog"]').should('be.visible');
                if (item.scenario === 'pending') cy.get('[data-testid="confirm-dialog"]').should('contain.text', '대기 중인 신청 1건');
                for (const id of ['confirm-dialog-cancel', 'confirm-dialog-confirm']) {
                    cy.get(`[data-testid="${id}"]`).should('be.visible').then(($el) => {
                        const rect = $el[0].getBoundingClientRect();
                        expect(rect.width).to.be.at.least(44); expect(rect.height).to.be.at.least(44);
                    });
                }
                cy.get('[data-testid="confirm-dialog-cancel"]').click();
                cy.get('[data-testid="confirm-dialog"]').should('not.exist');
                cy.location('pathname').should('equal', '/mate/99241/manage');
                if (item.editing) cy.get('#manage-description').should('have.value', '합성 수정 중 문구');
            }
            cy.then(() => {
                expect(writes, 'no write request attempted').to.deep.equal([]);
                expect(foreign, 'no foreign HTTP request attempted').to.deep.equal([]);
                expect(unknownApi, 'no unmocked API request').to.deep.equal([]);
                expect(unknownLocal, 'no unrecognized local read').to.deep.equal([]);
            });
        });
    }
});
