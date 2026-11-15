/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

const user = { id: 9251, email: 'chat-visual@example.invalid', name: '합성 참여자',
    handle: 'synthetic-chat-user', favoriteTeam: 'HH', role: 'ROLE_USER', hasPassword: true, profileImageUrl: null };
// Fictional UI-only party/messages; no actual game, venue, person or ticket data.
const party = { id: 99251, hostId: 99252, hostName: '합성 호스트', hostHandle: 'synthetic-chat-host',
    hostBadge: 'VERIFIED', teamId: 'HH', homeTeam: '합성 홈', awayTeam: '합성 원정',
    gameDate: '2099-05-15', gameTime: '18:30', stadium: '합성 검증 구장', section: '합성 좌석 구역',
    maxParticipants: 2, currentParticipants: 2, description: '합성 채팅 UI 검증',
    ticketVerified: false, ticketPrice: 0, status: 'MATCHED', createdAt: '2099-05-01T09:00:00Z' };
const draft = '합성 메시지 입력 검증';
const history = [
    { id: 99253, partyId: party.id, senderId: party.hostId, senderName: party.hostName,
        message: '합성 안내입니다. ' + '긴 메시지 줄바꿈 검증 문장입니다. '.repeat(6), createdAt: '2099-05-15T08:00:00Z' },
    { id: 99254, partyId: party.id, senderId: user.id, senderName: user.name,
        message: 'synthetic_unbroken_text_'.repeat(8), createdAt: '2099-05-15T08:01:00Z' },
    { id: 99255, partyId: party.id, senderId: party.hostId, senderName: party.hostName,
        message: '합성 이미지 로드 실패', imageUrl: '/__synthetic_chat_attachment__.png', createdAt: '2099-05-15T08:02:00Z' },
];

describe('Mate party chat synthetic responsive states', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                for (const mode of ['empty', 'history'] as const) {
                    it(`${mode} at ${width}px / ${font}px / ${theme}`, () => {
                        const id = `${mode}-${width}-${font}-${theme}`;
                        const origin = new URL(String(Cypress.config('baseUrl')));
                        expect(origin.hostname).to.equal('127.0.0.1');
                        const issues: string[] = [];
                        const checkpoints: Array<Record<string, unknown>> = [];
                        let releaseHistory!: () => void;
                        const historyGate = new Cypress.Promise<void>((resolve) => { releaseHistory = resolve; });
                        let recovered = false;
                        let messageSends = 0;
                        cy.intercept({ url: '**', middleware: true }, (req) => {
                            if (new URL(req.url).origin !== origin.origin) req.reply({ statusCode: 204, log: false });
                        });
                        cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                        cy.intercept('GET', '**/auth/mypage*', { statusCode: 200, body: { success: true, data: user } });
                        cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
                        cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
                        cy.intercept('GET', '**/api/parties/99251*', { statusCode: 200, body: party });
                        cy.intercept('GET', '**/api/applications/party/99251/mine*', { statusCode: 200,
                            body: { id: 99256, partyId: party.id, applicantId: user.id, isApproved: true, isRejected: false } });
                        cy.intercept('GET', '**/api/chat/party/99251*', (req) => {
                            if (recovered) return req.reply({ statusCode: 200, body: mode === 'history' ? history : [] });
                            return historyGate.then(() => req.reply({ statusCode: 503, body: { message: 'Synthetic history failure' } }));
                        }).as('history');
                        cy.intercept('POST', '**/api/chat/party/99251/read', { statusCode: 200, body: { success: true } });
                        cy.intercept('POST', '**/api/chat/messages', (req) => { messageSends++; req.reply({ statusCode: 503 }); });
                        cy.intercept('GET', '**/__synthetic_chat_attachment__.png', { statusCode: 404, body: '' }).as('brokenImage');
                        cy.viewport(width, width === 1280 ? 900 : 844);
                        cy.visit(`/mate/${party.id}/chat`, { onBeforeLoad(win) {
                            win.localStorage.clear();
                            win.sessionStorage.clear();
                            seedCypressAuthState(win, user, undefined, { theme });
                            win.document.documentElement.classList.toggle('dark', theme === 'dark');
                            win.document.documentElement.style.fontSize = `${font}px`;
                            win.document.documentElement.style.scrollBehavior = 'auto';
                        } });
                        const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/mate-chat-${id}.json`, { width, font, theme, mode, issues: [...issues], checkpoints: [...checkpoints] });
                        const measure = (state: string, selector: string) => {
                            cy.document().then((doc) => doc.fonts.ready);
                            cy.get(selector, { timeout: 20000 }).then(($root) => {
                                const root = $root[0], doc = root.ownerDocument, win = doc.defaultView!;
                                expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                                expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                                if (doc.documentElement.scrollWidth > width + 1) issues.push(`${state}: document overflow`);
                                const copy = Array.from(root.querySelectorAll<HTMLElement>('h1,h2,h3,p,label,li,[role="alert"] span,[data-testid="mate-chat-attachment-fallback"]')).filter((el) => el.getClientRects().length > 0).map((el) => {
                                    const rect = el.getBoundingClientRect(), style = win.getComputedStyle(el);
                                    if (rect.width <= 0 || rect.height <= 0 || el.scrollWidth > el.clientWidth + 1 || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1)) issues.push(`${state}: copy clipped ${el.textContent?.trim().slice(0, 50)}`);
                                    if (rect.left < -1 || rect.right > width + 1) issues.push(`${state}: copy outside viewport ${el.textContent?.trim().slice(0, 50)}`);
                                    return { text: el.textContent?.trim(), left: rect.left, right: rect.right, width: rect.width, height: rect.height,
                                        clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight };
                                });
                                const forms = Array.from(root.querySelectorAll('form')).map((form) => {
                                    if (form.scrollWidth > form.clientWidth + 1) issues.push(`${state}: composer toolbar overflow`);
                                    const controls = Array.from(form.querySelectorAll<HTMLElement>('button,input:not([type="file"])')).map((control) => {
                                        const rect = control.getBoundingClientRect(), style = win.getComputedStyle(control);
                                        const editableWidth = rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
                                            - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
                                        if (control.tagName === 'INPUT' && editableWidth <= 0) issues.push(`${state}: input has no editable text width`);
                                        return { testId: control.dataset.testid, left: rect.left, right: rect.right, width: rect.width,
                                            paddingLeft: style.paddingLeft, paddingRight: style.paddingRight, editableWidth };
                                    });
                                    return { clientWidth: form.clientWidth, scrollWidth: form.scrollWidth, controls };
                                });
                                checkpoints.push({ state, documentWidth: doc.documentElement.scrollWidth, copy, forms });
                                root.scrollIntoView({ block: 'start', behavior: 'instant' });
                            });
                            cy.screenshot(`mate-chat-${id}-${state}-top`, { capture: 'viewport' });
                            cy.get(selector).then(($el) => $el[0].scrollIntoView({ block: 'end', behavior: 'instant' }));
                            cy.screenshot(`mate-chat-${id}-${state}-bottom`, { capture: 'viewport' });
                            cy.then(persist);
                        };
                        const control = (testId: string, disabled = false) => {
                            cy.get(`[data-testid="${testId}"]`).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                            cy.get(`[data-testid="${testId}"]`).then(($el) => {
                                const el = $el[0], doc = el.ownerDocument, rect = el.getBoundingClientRect();
                                const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                                const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                                const style = doc.defaultView!.getComputedStyle(el);
                                checkpoints.push({ control: testId, width: rect.width, height: rect.height, left: rect.left, right: rect.right, receivesPointer,
                                    clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight });
                                if (rect.width < 44 || rect.height < 44) issues.push(`${testId}: below44 ${rect.width}/${rect.height}`);
                                if (rect.left < -1 || rect.right > width + 1) issues.push(`${testId}: outside viewport after scroll`);
                                // Native single-line input values may scroll; button copy must fit instead.
                                if (el.tagName !== 'INPUT' && (el.scrollWidth > el.clientWidth + 1 || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1))) issues.push(`${testId}: internal copy clipping`);
                                if (!disabled && !receivesPointer) issues.push(`${testId}: center occluded after scroll`);
                            });
                        };
                        measure('history-loading', '[data-testid="mate-chat-approved-runtime-fallback"]');
                        cy.then(() => releaseHistory());
                        cy.wait('@history');
                        cy.get('[data-testid="mate-chat-retry"]').should('exist');
                        measure('history-error', '[data-testid="mate-chat-view"]');
                        control('mate-chat-retry');
                        cy.then(() => { recovered = true; });
                        cy.get('[data-testid="mate-chat-retry"]').click();
                        cy.get('[data-testid="mate-chat-retry"]').should('not.exist');
                        cy.get('[data-testid="mate-chat-composer-panel"]').should('exist');
                        if (mode === 'history') {
                            for (const message of history.slice(0, 2)) {
                                cy.contains('[data-testid="mate-chat-conversation-panel"] p', message.message).should('have.text', message.message);
                            }
                            cy.get('img[alt="채팅 첨부 이미지"]').scrollIntoView();
                            cy.wait('@brokenImage');
                            cy.get('[data-testid="mate-chat-attachment-fallback"]').should('be.visible');
                            cy.screenshot(`mate-chat-${id}-attachment-fallback`, { capture: 'viewport' });
                        } else cy.contains('아직 대화가 시작되지 않았습니다').should('exist');
                        measure('resolved-overview', '[data-testid="mate-chat-view"]');
                        measure('conversation', '[data-testid="mate-chat-conversation-panel"]');
                        cy.get('[data-testid="mate-chat-composer-submit"]').should('be.disabled');
                        control('mate-chat-composer-upload');
                        control('mate-chat-composer-input');
                        control('mate-chat-composer-submit', true);
                        measure('composer-empty', '[data-testid="mate-chat-composer-panel"]');
                        cy.get('[data-testid="mate-chat-composer-input"]').type(draft, { delay: 0 }).should('have.value', draft);
                        cy.get('[data-testid="mate-chat-composer-submit"]').should('not.be.disabled');
                        cy.press(Cypress.Keyboard.Keys.TAB);
                        cy.focused().should('have.attr', 'data-testid', 'mate-chat-composer-submit').then(($el) => {
                            const el = $el[0], rect = el.getBoundingClientRect(), doc = el.ownerDocument;
                            const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                            const visible = el.matches(':focus-visible') && (hit === el || Boolean(hit && el.contains(hit)));
                            checkpoints.push({ focus: 'submit-from-input-tab', visible, top: rect.top, bottom: rect.bottom });
                            if (!visible) issues.push('submit focus occluded after native Tab');
                        });
                        cy.screenshot(`mate-chat-${id}-submit-tab`, { capture: 'viewport' });
                        control('mate-chat-composer-submit');
                        measure('composer-draft', '[data-testid="mate-chat-composer-panel"]');
                        cy.then(() => expect(messageSends, 'draft was not sent').to.equal(0));
                        cy.then(persist);
                        cy.then(() => expect(issues, 'synthetic party-chat layout findings').to.deep.equal([]));
                    });
                }
            }
        }
    }
});
