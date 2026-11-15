/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

// Explicitly fictional UI records, not real people, games, venues or QR sessions.
const user = { id: 9241, email: 'qr-host@example.invalid', name: '합성 호스트',
    handle: 'synthetic-qr-host', favoriteTeam: 'HH', role: 'ROLE_USER', hasPassword: true, profileImageUrl: null };
const party = { id: 99241, hostId: user.id, hostHandle: user.handle, hostName: user.name,
    hostBadge: 'VERIFIED', teamId: 'HH', homeTeam: '합성 홈', awayTeam: '합성 원정',
    gameDate: '2099-05-15', gameTime: '18:30', stadium: '합성 검증 구장', section: '합성 좌석 구역',
    maxParticipants: 2, currentParticipants: 2, description: '합성 QR 호스트 검증',
    ticketVerified: false, ticketPrice: 0, status: 'MATCHED', createdAt: '2099-05-01T09:00:00Z' };
const partner = { id: 99242, partyId: party.id, userHandle: 'synthetic-qr-partner',
    userName: '합성 동행 참여자', location: party.stadium, checkedInAt: '2099-05-15T09:05:00Z' };
const own = { ...partner, id: 99243, userHandle: user.handle, userName: user.name };

describe('Mate check-in synthetic QR host and completed states', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`;
                    const origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    const issues: string[] = [];
                    const checkpoints: Array<Record<string, unknown>> = [];
                    let attempts = 0, completed = false;
                    let release!: () => void;
                    const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        if (new URL(req.url).origin !== origin.origin) req.reply({ statusCode: 204, log: false });
                    });
                    cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    cy.intercept('GET', '**/auth/mypage*', { statusCode: 200, body: { success: true, data: user } });
                    cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
                    cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
                    cy.intercept('GET', '**/api/parties/99240*', { statusCode: 404, body: { message: '합성 파티 없음' } });
                    cy.intercept('GET', '**/api/parties/99241*', { statusCode: 200, body: party });
                    cy.intercept('GET', '**/api/checkin/party/99241*', (req) => req.reply({ statusCode: 200, body: completed ? [partner, own] : [partner] }));
                    cy.intercept('POST', '**/api/checkin', (req) => {
                        attempts++;
                        expect(req.body).to.deep.equal({ partyId: party.id, location: party.stadium, qrSessionId: 'synthetic-qr-99241' });
                        if (attempts === 1) return gate.then(() => req.reply({ statusCode: 503, body: { code: 'SYNTHETIC_QR_UNAVAILABLE' } }));
                        completed = true;
                        req.reply({ statusCode: 201, body: own });
                    }).as('submit');
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    const visit = (path: string) => cy.visit(path, { onBeforeLoad(win) {
                        win.localStorage.clear();
                        win.sessionStorage.clear();
                        seedCypressAuthState(win, user, undefined, { theme });
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.fontSize = `${font}px`;
                        win.document.documentElement.style.scrollBehavior = 'auto';
                    } });
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/mate-checkin-qr-${id}.json`, { width, font, theme, issues, checkpoints });
                    const snapshot = (state: string, root = '[data-testid="mate-check-in"]') => {
                        cy.document().then((doc) => doc.fonts.ready);
                        cy.get(root).then(($root) => {
                            const el = $root[0], doc = el.ownerDocument, win = doc.defaultView!;
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                            if (doc.documentElement.scrollWidth > width + 1) issues.push(`${state}: document overflow`);
                            const copy = Array.from(el.querySelectorAll<HTMLElement>('h1,h2,h3,p,label,[data-testid="mate-check-in-pill"],[role="alert"]')).filter((node) => node.getClientRects().length && win.getComputedStyle(node).visibility !== 'hidden').map((node) => {
                                const rect = node.getBoundingClientRect(), style = win.getComputedStyle(node);
                                if (!rect.width && !rect.height) return null;
                                if (rect.width <= 0 || rect.height <= 0 || rect.left < -1 || rect.right > width + 1 || node.scrollWidth > node.clientWidth + 1 || (['hidden', 'clip'].includes(style.overflowY) && node.scrollHeight > node.clientHeight + 1)) issues.push(`${state}: copy bounds/clipping ${node.textContent?.slice(0, 50)}`);
                                return { text: node.textContent, left: rect.left, right: rect.right, width: rect.width,
                                    clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, clientHeight: node.clientHeight, scrollHeight: node.scrollHeight };
                            }).filter(Boolean);
                            checkpoints.push({ state, documentWidth: doc.documentElement.scrollWidth, copy });
                            win.scrollTo(0, 0);
                        });
                        cy.screenshot(`mate-checkin-qr-${id}-${state}-top`, { capture: 'viewport' });
                        cy.window().then((win) => win.scrollTo(0, win.document.documentElement.scrollHeight));
                        cy.screenshot(`mate-checkin-qr-${id}-${state}-bottom`, { capture: 'viewport' });
                        cy.then(persist);
                    };
                    const control = (testId: string, disabled = false) => {
                        cy.get(`[data-testid="${testId}"]`).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(`[data-testid="${testId}"]`).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, rect = el.getBoundingClientRect();
                            const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                            const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                            const style = doc.defaultView!.getComputedStyle(el);
                            checkpoints.push({ control: testId, width: rect.width, height: rect.height, left: rect.left, right: rect.right,
                                clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, clientHeight: el.clientHeight,
                                scrollHeight: el.scrollHeight, overflowY: style.overflowY, receivesPointer });
                            if (rect.width < 44 || rect.height < 44 || rect.left < -1 || rect.right > width + 1 || el.scrollWidth > el.clientWidth + 1 || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1)) issues.push(`${testId}: target bounds/sizing`);
                            if (testId === 'mate-check-in-desktop-complete' && font === 32 && rect.height < 72) issues.push(`${testId}: enlarged minimum regressed`);
                            if (!disabled && !receivesPointer) issues.push(`${testId}: center occluded after scroll`);
                        });
                    };
                    const tabTo = (from: string, to: string, state: string) => {
                        cy.get(`[data-testid="${from}"]`).focus();
                        cy.press(Cypress.Keyboard.Keys.TAB);
                        cy.focused().should('have.attr', 'data-testid', to).then(($el) => {
                            const el = $el[0], rect = el.getBoundingClientRect(), doc = el.ownerDocument;
                            const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                            const visible = el.matches(':focus-visible') && (hit === el || Boolean(hit && el.contains(hit)));
                            checkpoints.push({ focus: state, visible, top: rect.top, bottom: rect.bottom });
                            if (!visible) issues.push(`${state}: native Tab focus occluded`);
                        });
                        cy.screenshot(`mate-checkin-qr-${id}-${state}`, { capture: 'viewport' });
                    };

                    visit('/mate/99240/checkin');
                    cy.get('[data-testid="mate-check-in-error"]').should('contain.text', '삭제되었거나 존재하지 않는 파티입니다.');
                    snapshot('party-error', '[data-testid="mate-check-in-error"]');
                    control('mate-check-in-error-list');
                    visit(`/mate/${party.id}/checkin?sessionId=synthetic-qr-99241`);
                    cy.contains('[data-testid="mate-check-in-pill"]', '호스트 모드').should('be.visible');
                    cy.contains('h2', 'QR 세션이 연결된 체크인').should('be.visible');
                    cy.get('[data-testid="mate-check-in-progress-bar"]').should('have.attr', 'aria-valuenow', '50');
                    cy.get('[data-testid="mate-check-in-roster"]').should('contain.text', partner.userName);
                    snapshot('host-qr-ready');
                    tabTo('mate-check-in-manual-code', 'mate-check-in-status-check-in', 'input-to-checkin-tab');
                    control('mate-check-in-status-check-in');
                    const primaryId = width < 1024 ? 'mate-check-in-mobile-primary' : 'mate-check-in-desktop-check-in';
                    control(primaryId);
                    cy.get(`[data-testid="${primaryId}"]`).click();
                    cy.get(`[data-testid="${primaryId}"]`).should('be.disabled');
                    control(primaryId, true);
                    snapshot('qr-pending');
                    cy.then(() => release());
                    cy.wait('@submit', { timeout: 15000 });
                    cy.contains('[aria-live="polite"] [role="status"]', '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.').should('be.visible');
                    cy.get(`[data-testid="${primaryId}"]`).should('not.be.disabled');
                    snapshot('qr-error');
                    cy.get(`[data-testid="${primaryId}"]`).click();
                    cy.wait('@submit', { timeout: 15000 });
                    cy.get('[data-testid="mate-check-in-progress-bar"]').should('have.attr', 'aria-valuenow', '100');
                    cy.contains('h1', '체크인').should('be.visible');
                    cy.get('[data-testid="checkin-progress-card"]').contains('전원 도착 완료').should('be.visible');
                    cy.get('[data-testid="mate-check-in-status-complete"]').should('exist');
                    snapshot('host-all-arrived');
                    control('mate-check-in-status-complete');
                    tabTo('mate-check-in-status-complete', 'mate-check-in-roster-chat', 'complete-to-chat-tab');
                    control('mate-check-in-roster-chat');
                    control(width < 1024 ? 'mate-check-in-mobile-primary' : 'mate-check-in-desktop-complete');
                    cy.get('@submit.all').should('have.length', 2);
                    cy.then(persist);
                    // Aggregate design findings after completing the synthetic lifecycle.
                    cy.then(() => expect(issues, 'QR host layout and focus findings').to.deep.equal([]));
                });
            }
        }
    }
});
