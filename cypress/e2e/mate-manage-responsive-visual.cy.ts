/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

const user = { id: 9241, email: 'manage-visual@example.invalid', name: '합성 호스트',
    handle: 'synthetic-manage-host', favoriteTeam: 'HH', role: 'ROLE_USER', hasPassword: true, profileImageUrl: null };
// Fictional UI fixture only, not a real game, payment or participant record.
const party = { id: 99241, hostId: user.id, hostName: user.name, hostHandle: user.handle,
    hostBadge: 'VERIFIED', teamId: 'HH', homeTeam: '합성 홈', awayTeam: '합성 원정',
    gameDate: '2099-05-15', gameTime: '18:30', stadium: '합성 검증 구장', section: '합성 좌석 구역',
    maxParticipants: 4, currentParticipants: 2, description: '합성 호스트 관리 UI 검증',
    ticketVerified: false, ticketPrice: 0, status: 'PENDING', createdAt: '2099-05-01T09:00:00Z' };
const applications = ['pending', 'approved', 'rejected'].map((state, index) => ({
    id: 99242 + index, partyId: party.id, applicantId: 99245 + index,
    applicantName: `합성 신청자 ${index + 1}`, applicantHandle: `synthetic-applicant-${index + 1}`,
    applicantBadge: 'TRUSTED', applicantRating: 4.5, message: '합성 신청 메시지입니다. 구장 입구에서 만날 시간을 정합니다.',
    depositAmount: 0, paymentType: 'DEPOSIT', paymentStatus: 'PAID', settlementStatus: 'PENDING',
    isApproved: state === 'approved', isRejected: state === 'rejected', ticketVerified: false,
    createdAt: '2099-05-01T09:00:00Z', responseDeadline: '2099-05-14T09:00:00Z',
}));

describe('Mate host manage synthetic responsive states', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                for (const mode of ['empty', 'mixed'] as const) {
                    it(`${mode} at ${width}px / ${font}px / ${theme}`, () => {
                        const id = `${mode}-${width}-${font}-${theme}`;
                        const origin = new URL(String(Cypress.config('baseUrl')));
                        expect(origin.hostname).to.equal('127.0.0.1');
                        const issues: string[] = [];
                        const checkpoints: Array<Record<string, unknown>> = [];
                        let releaseParty!: () => void;
                        let releaseApplications!: () => void;
                        const partyGate = new Cypress.Promise<void>((resolve) => { releaseParty = resolve; });
                        const applicationsGate = new Cypress.Promise<void>((resolve) => { releaseApplications = resolve; });
                        let recovered = false;
                        let mutationRequests = 0;
                        cy.intercept({ url: '**', middleware: true }, (req) => {
                            if (new URL(req.url).origin !== origin.origin) req.reply({ statusCode: 204, log: false });
                        });
                        cy.intercept('**/api/**', (req) => {
                            if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) mutationRequests++;
                            req.reply({ statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                        });
                        cy.intercept('GET', '**/auth/mypage*', { statusCode: 200, body: { success: true, data: user } });
                        cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
                        cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
                        cy.intercept('GET', '**/api/parties/99241*', (req) => partyGate.then(() => req.reply({ statusCode: 200, body: party }))).as('party');
                        cy.intercept('GET', '**/api/applications/party/99241*', (req) => {
                            if (recovered) return req.reply({ statusCode: 200, body: mode === 'mixed' ? applications : [] });
                            return applicationsGate.then(() => req.reply({ statusCode: 503, body: { message: 'Synthetic applications failure' } }));
                        }).as('applications');
                        cy.viewport(width, width === 1280 ? 900 : 844);
                        cy.visit(`/mate/${party.id}/manage`, { onBeforeLoad(win) {
                            win.localStorage.clear();
                            win.sessionStorage.clear();
                            seedCypressAuthState(win, user, undefined, { theme });
                            win.document.documentElement.classList.toggle('dark', theme === 'dark');
                            win.document.documentElement.style.fontSize = `${font}px`;
                            win.document.documentElement.style.scrollBehavior = 'auto';
                        } });
                        const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/mate-manage-${id}.json`, { width, font, theme, mode, issues: [...issues], checkpoints: [...checkpoints] });
                        const measure = (state: string, selector: string) => {
                            cy.document().then((doc) => doc.fonts.ready);
                            cy.get(selector, { timeout: 20000 }).then(($root) => {
                                const root = $root[0], doc = root.ownerDocument, win = doc.defaultView!;
                                expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                                expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                                if (doc.documentElement.scrollWidth > width + 1) issues.push(`${state}: document overflow ${doc.documentElement.scrollWidth}/${width}`);
                                const copy = Array.from(root.querySelectorAll<HTMLElement>('h1,h2,h3,p,label,button')).filter((el) => el.getClientRects().length > 0).map((el) => {
                                    const rect = el.getBoundingClientRect(), style = win.getComputedStyle(el);
                                    if (rect.width <= 0 || rect.height <= 0 || el.scrollWidth > el.clientWidth + 1 || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1)) issues.push(`${state}: copy clipped ${el.textContent?.trim().slice(0, 50)}`);
                                    if (rect.left < -1 || rect.right > width + 1) issues.push(`${state}: copy outside viewport ${el.textContent?.trim().slice(0, 50)}`);
                                    return { text: el.textContent?.trim(), width: rect.width, height: rect.height,
                                        left: rect.left, right: rect.right,
                                        clientWidth: el.clientWidth, scrollWidth: el.scrollWidth,
                                        clientHeight: el.clientHeight, scrollHeight: el.scrollHeight };
                                });
                                checkpoints.push({ state, documentWidth: doc.documentElement.scrollWidth, copy });
                                root.scrollIntoView({ block: 'start', behavior: 'instant' });
                            });
                            cy.screenshot(`mate-manage-${id}-${state}-top`, { capture: 'viewport' });
                            cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'end', behavior: 'instant' }));
                            cy.screenshot(`mate-manage-${id}-${state}-bottom`, { capture: 'viewport' });
                            cy.then(persist);
                        };
                        const control = (testId: string) => {
                            cy.get(`[data-testid="${testId}"]`).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                            cy.get(`[data-testid="${testId}"]`).then(($el) => {
                                const el = $el[0], rect = el.getBoundingClientRect(), doc = el.ownerDocument;
                                const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                                const reachable = hit === el || Boolean(hit && el.contains(hit));
                                checkpoints.push({ control: testId, width: rect.width, height: rect.height, reachable });
                                if (rect.width < 44 || rect.height < 44) issues.push(`${testId}: below44 ${rect.width}/${rect.height}`);
                                if (!reachable) issues.push(`${testId}: center occluded after scroll`);
                            });
                        };
                        measure('party-loading', '[data-testid="mate-manage-runtime-loading"]');
                        cy.then(() => releaseParty());
                        cy.wait('@party');
                        cy.contains('신청 목록을 불러오는 중...').should('exist');
                        measure('applications-loading', '[data-testid="mate-manage-runtime-loading"]');
                        cy.then(() => releaseApplications());
                        cy.wait('@applications');
                        cy.contains('신청 목록을 불러오지 못했습니다').should('be.visible');
                        measure('applications-error', '[data-testid="mate-manage-runtime-error"]');
                        cy.then(() => { recovered = true; });
                        cy.contains('[data-testid="mate-manage-runtime-error"] button', '다시 시도').click();
                        cy.get('[data-testid="mate-manage-applications-runtime"]', { timeout: 20000 }).should('exist');
                        cy.get('[data-testid="mate-manage-overview-runtime"] h1').should('contain.text', '파티 관리');
                        measure('overview', '[data-testid="mate-manage-overview-runtime"]');
                        cy.get('[data-testid="mate-manage-overview-runtime"] h1').then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.screenshot(`mate-manage-${id}-overview-title`, { capture: 'viewport' });
                        for (const tab of ['pending', 'approved', 'rejected']) {
                            const tabId = `mate-manage-applications-tab-${tab}`;
                            control(tabId);
                            cy.get(`[data-testid="${tabId}"]`).click().should('have.attr', 'aria-pressed', 'true');
                            if (mode === 'mixed') cy.get(`[data-testid="manage-application-${tab}"]`).should('exist');
                            else cy.contains(tab === 'pending' ? '대기 중인 신청이 없습니다' : tab === 'approved' ? '승인된 신청이 없습니다' : '거절된 신청이 없습니다').should('exist');
                            measure(tab, '[data-testid="mate-manage-applications-runtime"]');
                            if (mode === 'mixed') {
                                cy.get(`[data-testid="manage-application-${tab}"]`).then(($el) => $el[0].scrollIntoView({ block: 'start', behavior: 'instant' }));
                                cy.screenshot(`mate-manage-${id}-${tab}-card`, { capture: 'viewport' });
                            }
                            if (mode === 'mixed' && tab === 'pending') {
                                control('mate-manage-application-approve-99242');
                                control('mate-manage-application-reject-99242');
                            }
                            if (mode === 'mixed' && tab === 'approved') {
                                control('mate-manage-application-chat');
                                control('mate-manage-application-checkin');
                            }
                        }
                        cy.then(() => expect(mutationRequests, 'no synthetic mutation was attempted').to.equal(0));
                        cy.then(persist);
                        cy.then(() => expect(issues, 'synthetic host-manage layout findings').to.deep.equal([]));
                    });
                }
            }
        }
    }
});
