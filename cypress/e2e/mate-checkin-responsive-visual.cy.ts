/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

const user = { id: 9231, email: 'checkin-visual@example.invalid', name: '합성 참여자',
    handle: 'synthetic-checkin-user', favoriteTeam: 'HH', role: 'ROLE_USER', hasPassword: true, profileImageUrl: null };
// UI-only fiction, not an actual game, ticket, venue or participant record.
const party = { id: 99231, hostId: 99232, hostName: '합성 호스트', hostHandle: 'synthetic-host',
    hostBadge: 'VERIFIED', teamId: 'HH', homeTeam: '합성 홈', awayTeam: '합성 원정',
    gameDate: '2099-05-15', gameTime: '18:30', stadium: '합성 검증 구장', section: '합성 좌석 구역',
    maxParticipants: 2, currentParticipants: 2, description: '합성 체크인 UI 검증',
    ticketVerified: false, ticketPrice: 0, status: 'MATCHED', createdAt: '2099-05-01T09:00:00Z' };

describe('Mate check-in synthetic responsive states', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`;
                    const origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    const issues: string[] = [];
                    const checkpoints: Array<Record<string, unknown>> = [];
                    let releaseParty!: () => void;
                    let releaseSubmit!: () => void;
                    const partyGate = new Cypress.Promise<void>((resolve) => { releaseParty = resolve; });
                    const submitGate = new Cypress.Promise<void>((resolve) => { releaseSubmit = resolve; });
                    let statusAvailable = false;
                    let submissions = 0;
                    let completed = false;
                    const ownCheckIn = { id: 99233, partyId: party.id, userId: user.id, userName: user.name,
                        userHandle: user.handle, location: party.stadium, checkedInAt: '2099-05-15T09:10:00Z' };
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        if (new URL(req.url).origin !== origin.origin) req.reply({ statusCode: 204, log: false });
                    });
                    cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    cy.intercept('GET', '**/auth/mypage*', { statusCode: 200, body: { success: true, data: user } });
                    cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
                    cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
                    cy.intercept('GET', '**/api/parties/99231*', (req) => partyGate.then(() => req.reply({ statusCode: 200, body: party }))).as('party');
                    cy.intercept('GET', '**/api/checkin/party/99231*', (req) => req.reply(statusAvailable
                        ? { statusCode: 200, body: completed ? [ownCheckIn] : [] }
                        : { statusCode: 503, body: { message: 'Synthetic status failure' } })).as('status');
                    cy.intercept('POST', '**/api/checkin', (req) => {
                        submissions++;
                        expect(req.body).to.include({ partyId: party.id, manualCode: '0427', location: party.stadium });
                        expect(req.body).not.to.have.property('qrSessionId');
                        if (submissions === 1) return submitGate.then(() => req.reply({ statusCode: 503, body: { message: '합성 체크인 요청 실패' } }));
                        completed = true;
                        req.reply({ statusCode: 201, body: ownCheckIn });
                    }).as('submit');
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    cy.visit(`/mate/${party.id}/checkin`, { onBeforeLoad(win) {
                        win.localStorage.clear();
                        win.sessionStorage.clear();
                        seedCypressAuthState(win, user, undefined, { theme });
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.fontSize = `${font}px`;
                        win.document.documentElement.style.scrollBehavior = 'auto';
                    } });
                    const snapshot = (state: string, root = '[data-testid="mate-check-in"]') => {
                        cy.document().then((doc) => doc.fonts.ready);
                        cy.get(root, { timeout: 20000 }).then(($root) => {
                            const el = $root[0], doc = el.ownerDocument, win = doc.defaultView!;
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                            if (doc.documentElement.scrollWidth > width + 1) issues.push(`${state}: document overflow`);
                            const copy = Array.from(el.querySelectorAll<HTMLElement>('h1,h2,h3,p,label,[data-testid="mate-check-in-pill"]')).filter((node) => node.getClientRects().length && win.getComputedStyle(node).visibility !== 'hidden').map((node) => {
                                const rect = node.getBoundingClientRect(), style = win.getComputedStyle(node);
                                // Hidden responsive cards have no layout boxes even though child getClientRects can vary.
                                if (!rect.width && !rect.height) return null;
                                if (rect.width <= 0 || rect.height <= 0 || node.scrollWidth > node.clientWidth + 1 || (['hidden', 'clip'].includes(style.overflowY) && node.scrollHeight > node.clientHeight + 1)) issues.push(`${state}: copy clipped ${node.textContent?.slice(0, 50)}`);
                                return { text: node.textContent, width: rect.width, height: rect.height,
                                    clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
                                    clientHeight: node.clientHeight, scrollHeight: node.scrollHeight };
                            }).filter(Boolean);
                            checkpoints.push({ state, documentWidth: doc.documentElement.scrollWidth, copy });
                            win.scrollTo(0, 0);
                        });
                        cy.screenshot(`mate-checkin-${id}-${state}-top`, { capture: 'viewport' });
                        cy.window().then((win) => win.scrollTo(0, win.document.documentElement.scrollHeight));
                        cy.screenshot(`mate-checkin-${id}-${state}-bottom`, { capture: 'viewport' });
                        cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/mate-checkin-${id}.json`, { width, font, theme, issues: [...issues], checkpoints: [...checkpoints] }));
                    };
                    const control = (testId: string, disabled = false) => {
                        cy.get(`[data-testid="${testId}"]`).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(`[data-testid="${testId}"]`).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, rect = el.getBoundingClientRect();
                            const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                            const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                            const style = doc.defaultView!.getComputedStyle(el);
                            checkpoints.push({ control: testId, width: rect.width, height: rect.height,
                                clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, receivesPointer });
                            if (rect.width < 44 || rect.height < 44 || el.scrollWidth > el.clientWidth + 1 || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1)) issues.push(`${testId}: target/copy sizing`);
                            if (!disabled && !receivesPointer) issues.push(`${testId}: center occluded after scroll`);
                        });
                    };
                    const primaryId = width < 1024 ? 'mate-check-in-mobile-primary' : 'mate-check-in-desktop-check-in';
                    const primary = `[data-testid="${primaryId}"]`;
                    snapshot('party-loading', '[data-testid="mate-check-in-loading"]');
                    cy.then(() => releaseParty());
                    cy.wait('@party');
                    cy.get('[data-testid="mate-check-in-status-error"]').should('be.visible');
                    snapshot('status-error');
                    control('mate-check-in-status-retry');
                    cy.then(() => { statusAvailable = true; });
                    cy.get('[data-testid="mate-check-in-status-retry"]').click();
                    cy.get('[data-testid="mate-check-in-status-error"]').should('not.exist');
                    cy.get('[data-testid="mate-check-in-roster-empty"]').should('exist');
                    cy.get('[data-testid="mate-check-in-overview-hero"]').should('exist');
                    snapshot('available-empty');
                    cy.get('[data-testid="mate-check-in-overview-hero"] h1').then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                    cy.screenshot(`mate-checkin-${id}-overview-title`, { capture: 'viewport' });
                    control(primaryId);
                    if (width === 1280) control('mate-check-in-desktop-chat');
                    cy.get(primary).click();
                    cy.contains('수동 체크인 코드를 4자리 숫자로 입력해주세요.').should('exist');
                    cy.then(() => expect(submissions).to.equal(0));
                    snapshot('validation');
                    cy.get('[data-testid="mate-check-in-manual-code"]').type('0427');
                    cy.get(primary).click();
                    cy.get(primary).should('be.disabled').and('contain.text', '처리 중');
                    control(primaryId, true);
                    if (width === 1280) control('mate-check-in-desktop-chat');
                    snapshot('pending');
                    cy.then(() => releaseSubmit());
                    cy.wait('@submit', { timeout: 15000 });
                    cy.contains('[aria-live="polite"] [role="status"]', '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.').should('be.visible');
                    cy.get(primary).should('not.be.disabled');
                    control(primaryId);
                    if (width === 1280) control('mate-check-in-desktop-chat');
                    snapshot('request-error');
                    cy.get(primary).click();
                    cy.wait('@submit', { timeout: 15000 });
                    cy.get('[data-testid="mate-check-in-status"]').should('contain.text', '체크인 완료');
                    cy.get('[data-testid="mate-check-in-progress-bar"]').should('have.attr', 'aria-valuenow', '50');
                    snapshot('completed-waiting');
                    control(width < 1024 ? 'mate-check-in-mobile-chat' : 'mate-check-in-desktop-chat');
                    cy.get('@submit.all').should('have.length', 2);
                    cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/mate-checkin-${id}.json`, { width, font, theme, issues, checkpoints }));
                    cy.then(() => expect(issues, 'synthetic check-in layout findings').to.deep.equal([]));
                });
            }
        }
    }
});
