/// <reference types="cypress" />

export {};

import type { MatePaymentCapability } from '../../src/types/mate';

// Explicitly fictional local UI fixtures, not a real game, venue, price, or account.
const party = { id: 950001, hostId: 456, hostHandle: 'synthetic_host', hostName: '합성 검증 호스트', hostBadge: 'NEW',
    status: 'PENDING', gameDate: '2099-03-22', gameTime: '18:30', stadium: '합성 UI 검증 구장',
    teamId: 'TESTH', homeTeam: 'TESTH', awayTeam: 'TESTA', section: '합성 좌석 안내',
    maxParticipants: 4, currentParticipants: 2, ticketPrice: 26000, reservationDepositAmount: 0,
    ticketVerified: false, description: '실제 경기 정보가 아닌 합성 디자인 검증 파티입니다.', createdAt: '2099-03-01T09:00:00' };
const validMessage = '합성 화면 검증을 위해 함께 관람 일정을 조율하겠습니다.';
const failureMessage = '합성 신청 오류입니다. 잠시 후 다시 시도해주세요.';
const displayedFailureMessage = '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.';
const validationMessage = '연락처 정보나 링크는 입력할 수 없습니다. 매칭 후 채팅을 이용해주세요.';
const policyCopy = ['현재 베타에서는 앱 내 결제를 제공하지 않습니다.',
    '승인 후 채팅에서 거래 시간과 장소를 조율합니다.', '플랫폼 결제/환불 없이 신청 취소만 처리됩니다.'];

describe('Mate application synthetic responsive acceptance', () => {
    beforeEach(() => {
        const origin = new URL(String(Cypress.config('baseUrl'))).origin;
        cy.intercept({ url: '**', middleware: true }, (request) => {
            if (new URL(request.url).origin !== origin) request.reply({ statusCode: 204, log: false });
        });
        cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
        cy.login('user');
        cy.setCookie('XSRF-TOKEN', 'synthetic-mate-ui-csrf');
        cy.mockAPI();
        cy.intercept('GET', '**/api/payments/capability', { statusCode: 200,
            body: { businessMode: 'DIRECT_TRADE', environment: 'NONE', paymentMode: 'DIRECT_TRADE',
                payoutEnabled: false, payoutProvider: 'UNSUPPORTED', provider: 'UNSUPPORTED',
                sellingPaymentRequired: false, tossPaymentEnabled: false } satisfies MatePaymentCapability });
    });

    for (const width of [320, 390, 1280] as const) {
        for (const fontSize of [16, 32] as const) {
            for (const theme of ['light', 'dark'] as const) {
                for (const state of ['form-keyboard', 'validation', 'submit-retry', 'party-loading', 'party-error', 'ticket-cycle'] as const) {
                    it(`${state} at ${width}px / ${fontSize}px in ${theme}`, () => {
                        const id = `${state}-${width}-${fontSize}-${theme}`;
                        const submitSelector = `[data-testid="mate-apply-submit-${width >= 1024 ? 'desktop' : 'mobile'}"]`;
                        const issues: string[] = [];
                        const measurements: Array<Record<string, unknown>> = [];
                        let releaseParty!: () => void;
                        let releaseSubmit!: () => void;
                        let releaseTicket!: () => void;
                        const partyGate = new Cypress.Promise<void>((resolve) => { releaseParty = resolve; });
                        const submitGate = new Cypress.Promise<void>((resolve) => { releaseSubmit = resolve; });
                        const ticketGate = new Cypress.Promise<void>((resolve) => { releaseTicket = resolve; });
                        cy.intercept('POST', '**/api/tickets/analyze', (request) => ticketGate.then(() => request.reply({
                            statusCode: 200, body: { date: party.gameDate, time: party.gameTime,
                                stadium: party.stadium, homeTeam: party.homeTeam, awayTeam: party.awayTeam,
                                section: party.section, row: '합성 행', seat: '합성 번호', peopleCount: 1,
                                price: party.ticketPrice, reservationNumber: null, gameId: null,
                                verificationToken: 'synthetic-local-verification' },
                        }))).as('analyzeTicket');
                        let submissions = 0;
                        cy.intercept('GET', `**/api/parties/${party.id}*`, (request) => {
                            if (state === 'party-loading') return partyGate.then(() => request.reply({ statusCode: 200, body: party }));
                            request.reply(state === 'party-error' ? { statusCode: 503, body: { message: '합성 파티 조회 실패' } }
                                : { statusCode: 200, body: party });
                        }).as('party');
                        cy.intercept('POST', '**/api/applications', (request) => {
                            submissions++;
                            const reply = () => request.reply({ statusCode: 503, body: { message: failureMessage } });
                            if (state === 'submit-retry' && submissions === 1) return submitGate.then(reply);
                            reply();
                        }).as('apply');
                        cy.viewport(width, width === 1280 ? 900 : 844);
                        cy.visit(`/mate/${party.id}/apply`, {
                            onBeforeLoad(win) {
                                win.localStorage.setItem('kbo-theme', theme);
                                win.document.documentElement.classList.toggle('dark', theme === 'dark');
                                win.document.documentElement.style.fontSize = `${fontSize}px`;
                                win.document.documentElement.style.scrollBehavior = 'auto';
                            },
                        });
                        if (state === 'party-loading') cy.get('[data-testid="mate-apply-loading"]').should('exist');
                        else {
                            cy.wait('@party').then(({ request, response }) => {
                                cy.writeFile(`${Cypress.config('screenshotsFolder')}/mate-apply-${id}-request.json`, {
                                    pathname: new URL(request.url).pathname,
                                    origin: new URL(request.url).origin,
                                    status: response?.statusCode,
                                    body: response?.body,
                                });
                                expect(response?.statusCode).to.equal(state === 'party-error' ? 503 : 200);
                            });
                            cy.get(`[data-testid="${state === 'party-error' ? 'mate-apply-error' : 'mate-apply'}"]`).should('exist');
                        }
                        cy.document().then((doc) => doc.fonts.ready);
                        cy.screenshot(`mate-apply-${id}-top`, { capture: 'viewport' });
                        cy.document().then((doc) => {
                            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                            expect(doc.defaultView!.getComputedStyle(doc.documentElement).fontSize).to.equal(`${fontSize}px`);
                            expect(doc.defaultView!.matchMedia('(min-width: 1024px)').matches).to.equal(width >= 1024);
                            if (doc.documentElement.scrollWidth > width || doc.body.scrollWidth > width) issues.push('document horizontal overflow');
                        });
                        const measure = (element: HTMLElement, label: string, control = false, scroll = true) => {
                            if (scroll) element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                            const doc = element.ownerDocument;
                            const win = doc.defaultView!;
                            const rect = element.getBoundingClientRect();
                            const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                            const receivesPointer = hit === element || Boolean(hit && element.contains(hit));
                            const disabled = element instanceof win.HTMLButtonElement && element.disabled;
                            measurements.push({ label, text: element.textContent, width: rect.width, height: rect.height,
                                left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
                                clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
                                clientHeight: element.clientHeight, scrollHeight: element.scrollHeight,
                                receivesPointer, disabled, focusVisible: element.matches(':focus-visible') });
                            if (rect.width <= 0 || rect.height <= 0 || element.scrollWidth > element.clientWidth + 1) issues.push(`${label}: internal clipping or collapse`);
                            if (rect.left < 0 || rect.right > doc.documentElement.clientWidth) issues.push(`${label}: outside horizontal viewport`);
                            if (control && (rect.width < 44 || rect.height < 44)) issues.push(`${label}: touch area below 44px`);
                            if (control && !disabled && !receivesPointer) issues.push(`${label}: center occluded`);
                        };
                        const measureControl = (selector: string, label: string) => cy.get(selector).then(($el) => measure($el[0], label, true));
                        const measureToast = (copy: string, label: string) => {
                            cy.contains('[aria-live="polite"] [role="status"]', copy).then(($el) => {
                                const el = $el[0];
                                measure(el, label, false, false);
                                const rect = el.getBoundingClientRect();
                                const doc = el.ownerDocument;
                                if (rect.top < 0 || rect.bottom > doc.defaultView!.innerHeight || el.scrollHeight > el.clientHeight + 1) issues.push(`${label}: vertical clipping`);
                                const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                                if (!(hit === el || Boolean(hit && el.contains(hit)))) issues.push(`${label}: toast center occluded`);
                            });
                            cy.screenshot(`mate-apply-${id}-${label}`, { capture: 'viewport' });
                        };
                        if (state === 'party-error') {
                            cy.contains('[data-testid="mate-apply-error"] p', '파티 정보를 불러오지 못했습니다.').then(($el) => measure($el[0], 'party-error-copy'));
                            measureControl('[data-testid="mate-apply-error-return"]', 'error-return');
                        } else if (state !== 'party-loading') {
                            cy.get('[data-testid="mate-apply-ticket-panel"]').should('exist');
                            if (width < 640) {
                                cy.get('[data-testid="mate-ticket-upload"] p').each(($copy, index) => {
                                    const el = $copy[0];
                                    const rect = el.getBoundingClientRect();
                                    const lineHeight = parseFloat(el.ownerDocument.defaultView!.getComputedStyle(el).lineHeight);
                                    const maximumLines = index === 0 ? 2 : 3;
                                    measurements.push({ label: `upload-copy-${index}`, text: el.textContent,
                                        width: rect.width, height: rect.height, lineHeight, maximumLines });
                                    if (el.scrollWidth > el.clientWidth + 1 || rect.height > lineHeight * maximumLines + 1) issues.push(`upload-copy-${index}: excessive wrapping or clipping`);
                                });
                            }
                            if (state === 'form-keyboard') {
                                cy.document().then((doc) => expect(doc.activeElement, 'native Tab starts at body').to.equal(doc.body));
                                const required = ['mate-apply-back', 'message', 'mate-ticket-upload', `mate-apply-submit-${width >= 1024 ? 'desktop' : 'mobile'}`];
                                const seen = new Set<string>();
                                const order: string[] = [];
                                const walk = (step: number): void => { cy.press(Cypress.Keyboard.Keys.TAB).then(() => cy.document().then((doc) => {
                                    const el = doc.activeElement as HTMLElement;
                                    const target = el.id === 'message' ? 'message' : el.dataset.testid;
                                    if (!target || !required.includes(target) || seen.has(target)) return;
                                    seen.add(target);
                                    order.push(target);
                                    measure(el, `keyboard-${target}`, true, false);
                                    if (!el.matches(':focus-visible')) issues.push(`${target}: focus-visible state missing`);
                                    cy.screenshot(`mate-apply-${id}-keyboard-${target}`, { capture: 'viewport' });
                                    if (target === 'message') cy.focused().type(validMessage, { delay: 0, scrollBehavior: false });
                                })).then(() => {
                                    if (required.every((target) => seen.has(target)) || step >= 40) return;
                                    walk(step + 1);
                                }); };
                                walk(1);
                                cy.then(() => {
                                    for (const target of required) if (!seen.has(target)) issues.push(`native Tab did not reach ${target}`);
                                    if (JSON.stringify(order) !== JSON.stringify(required)) issues.push('native Tab target order changed');
                                });
                            }
                            cy.get('[data-testid="mate-apply-ticket-panel"]').should('exist');
                            for (const copy of policyCopy) cy.contains('[data-testid="mate-apply"] li span', copy).then(($el) => measure($el[0], `policy:${copy}`));
                            cy.contains('[data-testid="mate-apply"] h1', '파티 참여 신청').then(($el) => measure($el[0], 'heading'));
                            measureControl('#message', 'message-input');
                            if (state === 'ticket-cycle') {
                                cy.get('#ticketVerifyFile').selectFile({ contents: Cypress.Buffer.from('synthetic-not-a-real-ticket'),
                                    fileName: 'synthetic-ticket.png', mimeType: 'image/png', lastModified: 0 }, { force: true });
                                cy.get('[data-testid="mate-ticket-scanning"]').should('exist');
                                cy.contains('[data-testid="mate-ticket-scanning"] p', 'AI가 티켓을 분석 중...').then(($el) => measure($el[0], 'scanning-copy'));
                                cy.screenshot(`mate-apply-${id}-scanning`, { capture: 'viewport' });
                                cy.then(() => releaseTicket());
                                cy.wait('@analyzeTicket');
                                cy.contains('[data-testid="mate-apply-ticket-panel"]', '티켓 인증 완료').should('exist');
                                cy.contains('[data-testid="mate-apply-ticket-panel"] p', party.stadium).then(($el) => measure($el[0], 'verified-stadium'));
                                measureControl('[data-testid="mate-ticket-reset"]', 'ticket-reset');
                                cy.screenshot(`mate-apply-${id}-verified`, { capture: 'viewport' });
                                cy.get('[data-testid="mate-ticket-reset"]').click();
                                cy.get('[data-testid="mate-ticket-upload"]').should('exist');
                            }
                            if (state === 'validation') {
                                cy.get(submitSelector).should('be.disabled');
                                cy.get('#message').type('합성 링크 https://example.invalid/test', { delay: 0 });
                                cy.get(submitSelector).should('be.enabled').click();
                                measureToast(validationMessage, 'validation');
                                cy.get('@apply.all').should('have.length', 0);
                            }
                            if (state === 'submit-retry') {
                                cy.get('#message').type(validMessage, { delay: 0 });
                                cy.get(submitSelector).click();
                                cy.get(submitSelector).should('be.disabled').and('contain.text', '신청 중...');
                                measureControl(submitSelector, 'pending-submit');
                                cy.screenshot(`mate-apply-${id}-pending`, { capture: 'viewport' });
                                cy.then(() => releaseSubmit());
                                cy.wait('@apply').then(({ request }) => {
                                    expect(request.body.partyId).to.equal(party.id);
                                    expect(request.body.message).to.equal(validMessage);
                                });
                                measureToast(displayedFailureMessage, 'submit-error');
                                cy.get(submitSelector).should('be.enabled').click();
                                cy.wait('@apply');
                                cy.get('@apply.all').should('have.length', 2);
                                cy.get('#message').should('have.value', validMessage);
                                cy.get(submitSelector).should('be.enabled');
                                cy.location('pathname').should('equal', `/mate/${party.id}/apply`);
                            }
                            measureControl(submitSelector, 'submit-action');
                            cy.screenshot(`mate-apply-${id}-actions`, { capture: 'viewport' });
                        }
                        if (state === 'party-loading') {
                            cy.contains('[data-testid="mate-apply-loading"] p', '파티 정보를 불러오는 중입니다...').then(($el) => {
                                measure($el[0], 'loading-copy', false, false);
                                const rect = $el[0].getBoundingClientRect();
                                if (rect.top < 0 || rect.bottom > $el[0].ownerDocument.defaultView!.innerHeight) issues.push('loading-copy: outside vertical viewport');
                            });
                            cy.then(() => releaseParty());
                            cy.wait('@party');
                            cy.get('[data-testid="mate-apply"]').should('exist');
                        }
                        cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/mate-apply-${id}.json`, { width, fontSize, theme, state, issues, measurements }));
                        cy.then(() => expect(issues, 'application responsive findings').to.deep.equal([]));
                    });
                }
            }
        }
    }
});
