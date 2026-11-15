/// <reference types="cypress" />

const noScrollSelectOptions: Partial<Cypress.SelectOptions> & { scrollBehavior: false } = { scrollBehavior: false };

import { seedCypressAuthState } from '../support/auth';
import { getMateCreateDraftStorageKey } from '../../src/utils/mateCreateDraft';

// Future dates/space/seats are explicitly fictional, not repaired baseball facts.
// Only the exact OCR POST is fulfilled locally; party/payment writes stay blocked.
describe('Mate create staged synthetic design evidence', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`, origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    const profile = { id: 99950, email: 'create-design@example.invalid', name: '합성 작성자', handle: 'synthetic-create',
                        role: 'ROLE_USER', favoriteTeam: null, hasPassword: true, profileImageUrl: null };
                    const root = '[data-testid="mate-create"]', ticket = '[data-testid="mate-create-ticket-step"]';
                    const match = '[data-testid="mate-create-match-step"]', seat = '[data-testid="mate-create-seat-step"]';
                    const description = '[data-testid="mate-create-description-step"]', confirm = '[data-testid="mate-create-confirm-dialog"]';
                    let ocr = 0, blockedWrites = 0, matchesPending = 0, schedulePhase: 'error' | 'empty' | 'data' = 'error';
                    let initialBodyOverflowY = '';
                    let releaseOcr!: () => void, releaseMatches!: () => void;
                    const ocrGate = new Cypress.Promise<void>((resolve) => { releaseOcr = resolve; });
                    const matchGate = new Cypress.Promise<void>((resolve) => { releaseMatches = resolve; });
                    const observations: Array<Record<string, unknown>> = [], findings: string[] = [], responses: Array<Record<string, unknown>> = [];
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/mate-create-${id}.json`, {
                        width, font, theme, findings, observations, responses, locallyMockedOcrRequests: ocr, blockedWrites,
                    });
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        const url = new URL(req.url);
                        if (url.origin !== origin.origin) return req.reply({ forceNetworkError: true, log: false });
                        if (req.method === 'POST' && url.pathname === '/api/tickets/analyze') {
                            const attempt = ++ocr; req.alias = `ocr-${attempt}`;
                            const reply = () => {
                                responses.push({ kind: 'locally-mocked-ocr', attempt, status: attempt === 1 ? 503 : 200 });
                                req.reply({ statusCode: attempt === 1 ? 503 : 200, body: attempt === 1 ? { message: 'SYNTHETIC_OCR_FAILURE' }
                                    : { date: '2099-06-01', time: null, stadium: null, homeTeam: null, awayTeam: null,
                                        section: null, row: null, seat: null, peopleCount: null, price: null, reservationNumber: null,
                                        gameId: null, verificationToken: 'synthetic-not-a-real-verification-token' } });
                            };
                            // Never continue this POST to any server, even while held.
                            return attempt === 1 ? ocrGate.then(reply) : reply();
                        }
                        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
                            blockedWrites++; return req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_MUTATION' });
                        }
                        if (url.pathname !== '/mate/create' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')
                            && !/\.(?:js|css|svg|png|webp|jpe?g|ico|woff2?|ttf)$/.test(url.pathname)) req.reply({ statusCode: 503, body: 'SYNTHETIC_BLOCKED_ROUTE' });
                    });
                    cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    cy.intercept('**/auth/**', { statusCode: 503, body: {} });
                    cy.intercept('GET', '**/auth/mypage*', { statusCode: 200, body: { success: true, data: profile } });
                    cy.intercept('GET', '**/api/users/99950/social-verified', { statusCode: 200, body: { success: true, data: true } });
                    cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
                    cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
                    cy.intercept('GET', '**/api/kbo/schedule*', (req) => {
                        const phase = schedulePhase; matchesPending++; req.alias = `matches-${phase}`;
                        const reply = () => {
                            responses.push({ kind: 'schedule', phase, date: new URL(req.url).searchParams.get('date'), status: phase === 'error' ? 503 : 200 });
                            req.reply({ statusCode: phase === 'error' ? 503 : 200, body: phase === 'error' ? { message: 'SYNTHETIC_SCHEDULE_FAILURE' }
                                : phase === 'empty' ? [] : [{ gameId: 'SYNTHETIC-NOT-A-REAL-GAME', time: '13:00',
                                    stadium: '합성 검증 공간', homeTeam: 'DB', awayTeam: 'LG' }] });
                        };
                        return phase === 'error' ? matchGate.then(reply) : reply();
                    });
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    cy.visit('/mate/create', { onBeforeLoad(win) {
                        win.localStorage.clear(); win.sessionStorage.clear(); seedCypressAuthState(win, profile, undefined, { theme });
                        win.document.documentElement.style.fontSize = `${font}px`; win.document.documentElement.style.scrollBehavior = 'auto';
                    } });
                    const align = (selector: string) => cy.get(selector).first().then(($el) => {
                        const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                        const header = doc.querySelector('[data-testid="navbar-capsule"]')?.getBoundingClientRect();
                        win.scrollBy({ top: el.getBoundingClientRect().top - Math.max(header?.bottom ?? 0, 80) - 16, behavior: 'instant' });
                    });
                    const click = (selector: string) => { align(selector); cy.get(selector).click({ scrollBehavior: false }); };
                    const fill = (selector: string, value: string) => { align(selector); cy.get(selector).clear({ scrollBehavior: false }).type(value, { scrollBehavior: false }); };
                    const capture = (state: string, selector: string, realign = true) => {
                        if (realign) align(selector);
                        cy.get(selector).then(($el) => {
                            const el = $el[0], doc = el.ownerDocument, win = doc.defaultView!;
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(win.localStorage.getItem('kbo-theme')).to.equal(theme);
                            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                            if (state === 'heading') initialBodyOverflowY = win.getComputedStyle(doc.body).overflowY;
                            observations.push({ state, text: el.innerText.replace(/\s+/g, ' ').trim() });
                            if (Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth) > doc.documentElement.clientWidth + 1) findings.push(`${state}: document overflow`);
                            if (state === 'match-error' && el.innerText.includes('경기 목록 조회 결과가 없습니다.')) findings.push('failed schedule query also presents normal empty copy');
                        });
                        cy.screenshot(`mate-create-${id}-${state}`, { capture: 'viewport' }); cy.then(persist);
                    };
                    const measure = (state: string, selector: string) => cy.get(selector).each(($el) => {
                        const el = $el[0], win = el.ownerDocument.defaultView!, rect = el.getBoundingClientRect(), control = el.getAttribute('data-testid') || el.id;
                        const record: Record<string, unknown> = { state, control, width: rect.width, height: rect.height };
                        if (el instanceof win.HTMLInputElement) {
                            const style = win.getComputedStyle(el), area = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
                            const context = el.ownerDocument.createElement('canvas').getContext('2d')!; context.font = style.font;
                            const glyph = el.value[0] ?? '0', glyphWidth = context.measureText(glyph).width;
                            Object.assign(record, { value: el.value, area, glyph, glyphWidth, nativeChromeExcluded: false });
                            if (el.value && area < glyphWidth) findings.push(`${state}/${control}: text area smaller than one value glyph`);
                        }
                        observations.push(record);
                        if (rect.width < 43.99 || rect.height < 43.99) findings.push(`${state}/${control}: below44px`);
                    });
                    cy.get(ticket, { timeout: 20000 }).should('exist');
                    cy.get('[data-testid="mate-create-next"]').should('be.disabled'); capture('heading', `${root} h1`); capture('ticket-idle', ticket);
                    cy.get('#ticketFile').selectFile({ contents: Cypress.Buffer.from('synthetic-invalid-type'), fileName: 'synthetic.txt', mimeType: 'text/plain' }, { force: true });
                    cy.get('[data-testid="mate-create-ticket-error"]').should('contain.text', '이미지 파일만');
                    cy.then(() => expect(ocr).to.equal(0)); capture('ticket-invalid-type', ticket);
                    // Valid transparent1px PNG, generated locally with PNG chunks/CRC; no ticket content.
                    cy.get('#ticketFile').selectFile({ contents: Cypress.Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=', 'base64'), fileName: 'synthetic-layout.png', mimeType: 'image/png' }, { force: true });
                    cy.get('[data-testid="mate-create-ticket-upload"]').should('have.attr', 'data-upload-state', 'scanning'); capture('ticket-scanning', ticket);
                    cy.then(() => releaseOcr()); cy.wait('@ocr-1').its('response.statusCode').should('equal', 503);
                    cy.get('[data-testid="mate-create-ticket-upload"]').should('have.attr', 'data-upload-state', 'scan-error');
                    measure('ticket-error', '[data-testid="mate-create-ticket-retry"]'); capture('ticket-scan-error', ticket);
                    click('[data-testid="mate-create-ticket-retry"]'); cy.wait('@ocr-2').its('response.statusCode').should('equal', 200);
                    cy.get(match).should('exist'); cy.wrap(null).should(() => expect(matchesPending).to.be.greaterThan(0));
                    cy.get('[data-testid="mate-create-match-loading"]').should('exist'); capture('match-loading', match);
                    cy.then(() => releaseMatches()); cy.wait('@matches-error').its('response.statusCode').should('equal', 503);
                    cy.get('[data-testid="mate-create-match-retry"]').should('exist'); cy.get('[data-testid="mate-create-match-manual"]').should('exist'); capture('match-error', match);
                    cy.then(() => { schedulePhase = 'empty'; }); click('[data-testid="mate-create-match-retry"]');
                    cy.wait('@matches-empty').its('response.body').should('deep.equal', []);
                    cy.get('[data-testid="mate-create-match-loading"]').should('not.exist');
                    cy.get('[data-testid="mate-create-match-manual"]').should('contain.text', '경기 목록 조회 결과가 없습니다.');
                    cy.get('[data-testid="mate-create-match-retry"]').should('not.exist'); cy.get('[data-testid="mate-create-next"]').should('be.disabled'); capture('match-empty', match);
                    fill('#manualGameTime', '12:00'); fill('#manualStadium', '합성 검증 공간');
                    align('#manualAwayTeam'); cy.get('#manualAwayTeam').select('lg', noScrollSelectOptions);
                    align('#manualHomeTeam'); cy.get('#manualHomeTeam').select('doosan', noScrollSelectOptions);
                    cy.get('[data-testid="mate-create-next"]').should('not.be.disabled'); capture('match-manual-filled', match);
                    cy.then(() => { schedulePhase = 'data'; }); fill('#gameDate', '2099-06-02');
                    cy.wait('@matches-data').its('response.body').should('have.length', 1);
                    cy.get('[data-testid="mate-create-match-option-0"]').should('have.attr', 'aria-pressed', 'false'); capture('match-data', match);
                    click('[data-testid="mate-create-match-option-0"]'); cy.get('[data-testid="mate-create-match-option-0"]').should('have.attr', 'aria-pressed', 'true'); capture('match-selected', match);
                    click('[data-testid="mate-create-next"]'); cy.get(seat).should('exist');
                    cy.get('[data-testid="mate-create-next"]').should('be.disabled'); capture('seat-required', seat);
                    click('[data-testid="mate-create-cheering-neutral"]'); click('[data-testid="mate-create-seat-category-COMFORT"]');
                    fill('#seatDetailBlock', '합성A'); fill('#seatDetailRow', '1'); fill('#seatDetailSeat', '1'); fill('#ticketPrice', '30000');
                    align('#maxParticipants'); cy.get('#maxParticipants').select('3', noScrollSelectOptions);
                    cy.get('[data-testid="mate-create-next"]').should('not.be.disabled');
                    measure('seat-filled', `${seat} input, ${seat} select, [data-testid="mate-create-next"]`); capture('seat-filled', seat);
                    click('[data-testid="mate-create-next"]'); cy.get(description).should('exist');
                    cy.get('[data-testid="mate-create-submit"]').should('be.disabled'); capture('description-empty', description);
                    fill('#description', '짧음'); cy.get('#description').blur(); cy.get('#description-hint').should('contain.text', '최소 10자'); capture('description-short', description);
                    fill('#description', '합성 연락처 test@example.invalid 검증입니다'); cy.get('#description-hint').should('contain.text', '연락처 정보나 링크'); capture('description-contact', description);
                    fill('#description', '가'.repeat(201)); cy.get('#description-count').should('contain.text', '201/200');
                    cy.get('#description-hint').should('contain.text', '200자를 초과'); capture('description-long', description);
                    fill('#description', '실제 모임이 아닌 합성 UI 검증용 소개글입니다.');
                    cy.get('#description-hint').should('contain.text', '10자 이상 200자 이하');
                    click('[data-testid="mate-create-description-tag-0"]'); cy.get('[data-testid="mate-create-description-tag-0"]').should('have.attr', 'aria-pressed', 'true');
                    cy.get('[data-testid="mate-create-submit"]').should('not.be.disabled'); capture('description-ready', description);
                    // This opens a local confirmation only. Never activate its confirm-submit.
                    click('[data-testid="mate-create-submit"]'); cy.get(confirm).should('exist');
                    measure('confirmation', `${confirm} button`); capture('confirmation', confirm, false);
                    cy.get(confirm).then(($dialog) => {
                        const doc = $dialog[0].ownerDocument;
                        const contained = $dialog[0].contains(doc.activeElement);
                        observations.push({ state: 'confirm-opening-focus', contained, target: doc.activeElement?.getAttribute('data-testid') });
                        if (!contained) findings.push('confirmation opening focus outside dialog');
                    });
                    cy.press(Cypress.Keyboard.Keys.TAB);
                    cy.get(confirm).then(($dialog) => {
                        const doc = $dialog[0].ownerDocument, el = doc.activeElement as HTMLElement;
                        const rect = el.getBoundingClientRect();
                        const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                        const contained = $dialog[0].contains(el), reachable = Boolean(hit && (hit === el || el.contains(hit)));
                        observations.push({ state: 'confirm-native-tab', contained, target: el.getAttribute('data-testid'), reachable, hitChatbot: Boolean(hit?.closest('[data-testid="chatbot-request-launcher"]')) });
                        if (!contained || !reachable) findings.push('confirmation native-Tab target obscured or outside dialog');
                    });
                    capture('confirmation-tab', confirm, false); cy.get('body').type('{esc}'); cy.get(confirm).should('not.exist');
                    cy.window().then((win) => new Cypress.Promise<void>((resolve) => {
                        win.requestAnimationFrame(() => win.requestAnimationFrame(() => {
                            const overflowY = win.getComputedStyle(win.document.body).overflowY;
                            observations.push({ state: 'after-confirm-cancel', initialBodyOverflowY, overflowY });
                            if (!['hidden', 'clip'].includes(initialBodyOverflowY) && ['hidden', 'clip'].includes(overflowY)) findings.push('confirmation cancel leaves changed body overflow-y lock');
                            resolve();
                        }));
                    }));
                    cy.window().should((win) => {
                        const draft = JSON.parse(win.sessionStorage.getItem(getMateCreateDraftStorageKey(profile.id)!)!);
                        expect(draft.state.createStep).to.equal(4); expect(draft.state.formData.ticketFile).to.equal(null);
                        expect(draft.state.formData.description).to.contain('합성 UI');
                    });
                    cy.reload(); cy.get(description, { timeout: 20000 }).should('exist');
                    // Reapply the CSS-only test condition to the loaded document.
                    // Reload still restores its real draft; storage is not reseeded.
                    cy.document().then((doc) => {
                        doc.documentElement.style.fontSize = `${font}px`;
                        doc.documentElement.style.scrollBehavior = 'auto';
                    });
                    cy.get('#description').should('contain.value', '합성 UI'); cy.get('[data-testid="mate-create-submit"]').should('be.disabled'); capture('draft-restored-file-required', description);
                    cy.then(() => { expect(ocr).to.equal(2); expect(blockedWrites).to.equal(0); observations.push({ finished: true }); }); cy.then(persist);
                    cy.then(() => expect(findings, 'Mate create design findings').to.deep.equal([]));
                });
            }
        }
    }
});
