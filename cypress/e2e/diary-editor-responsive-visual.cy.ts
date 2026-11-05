/// <reference types="cypress" />

import { seedCypressAuthState } from '../support/auth';

const user = { id: 9221, email: 'diary-visual@example.invalid', name: 'Synthetic Diary',
    handle: 'synthetic-diary', favoriteTeam: 'HH', role: 'ROLE_USER', hasPassword: true, profileImageUrl: null };
// Fictional UI-only values; not a real schedule, result or stadium record.
const game = { id: 99221, homeTeam: '합성 홈', awayTeam: '합성 원정', stadium: '합성 구장', date: '2024-05-15' };
const memo = '합성 디자인 검증용 메모입니다.';
const form = '[data-testid="diary-editor-form-card"]';
const save = '[data-testid="save-diary-btn"]';

describe('Diary editor synthetic responsive states', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`;
                    const origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    const issues: string[] = [];
                    const checkpoints: Array<Record<string, unknown>> = [];
                    let releaseGames!: () => void;
                    let releaseSave!: () => void;
                    let releaseRefresh!: () => void;
                    const gamesGate = new Cypress.Promise<void>((resolve) => { releaseGames = resolve; });
                    const saveGate = new Cypress.Promise<void>((resolve) => { releaseSave = resolve; });
                    const refreshGate = new Cypress.Promise<void>((resolve) => { releaseRefresh = resolve; });
                    let saves = 0;
                    let created = false;
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        if (new URL(req.url).origin !== origin.origin) req.reply({ statusCode: 204, log: false });
                    });
                    cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    cy.intercept('GET', '**/auth/mypage*', { statusCode: 200, body: { success: true, data: user } });
                    cy.intercept('GET', '**/api/chat/my/unread-counts', { statusCode: 200, body: { success: true, data: 0 } });
                    cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });
                    cy.intercept('GET', '**/api/diary/entries*', (req) => {
                        const reply = () => req.reply({ statusCode: 200, body: created ? [{
                        id: 99222, date: game.date, type: 'attended', emoji: '/emojis/happy.png', emojiName: '최고',
                        winningName: 'WIN', gameId: game.id, memo, photos: [], team: '합성 홈 vs 합성 원정', stadium: game.stadium,
                        }] : [] });
                        return created ? refreshGate.then(reply) : reply();
                    }).as('entries');
                    cy.intercept('GET', '**/api/diary/games*', (req) => gamesGate.then(() => req.reply({ statusCode: 200, body: [game] }))).as('games');
                    cy.intercept('GET', '**/api/diary/statistics*', { statusCode: 200, body: {
                        totalCount: 0, totalWins: 0, totalLosses: 0, totalDraws: 0, winRate: 0,
                        monthlyCount: 0, yearlyCount: 0, yearlyWins: 0, yearlyWinRate: 0,
                        mostVisitedStadium: null, mostVisitedCount: 0, happiestMonth: null, happiestCount: 0,
                        firstDiaryDate: null, cheerPostCount: 0, mateParticipationCount: 0, earnedBadges: [],
                        opponentWinRates: {}, dayOfWeekStats: {}, monthlyVisitCounts: {}, stadiumVisitCounts: {},
                        currentWinStreak: 0, longestWinStreak: 0, currentLossStreak: 0,
                    } });
                    cy.intercept('POST', '**/api/diary/save*', (req) => {
                        saves++;
                        expect(req.body).to.include({ gameId: game.id, memo, type: 'attended', winningName: 'WIN' });
                        if (saves === 1) return saveGate.then(() => req.reply({ statusCode: 503, body: { message: 'Synthetic save failure' } }));
                        created = true;
                        req.reply({ statusCode: 201, body: { id: 99222 } });
                    }).as('save');
                    cy.intercept('POST', '**/api/media/uploads/init', { statusCode: 503, body: { message: 'Synthetic upload failure' } }).as('upload');
                    cy.clock(new Date('2024-05-15T12:00:00+09:00').getTime(), ['Date']);
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    cy.visit('/mypage?view=diaryEditor&date=2024-05-15', { onBeforeLoad(win) {
                        win.localStorage.clear();
                        win.sessionStorage.clear();
                        seedCypressAuthState(win, user, undefined, { theme });
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.fontSize = `${font}px`;
                        win.document.documentElement.style.scrollBehavior = 'auto';
                    } });
                    const snapshot = (state: string) => {
                        cy.document().then((doc) => doc.fonts.ready);
                        cy.get(form, { timeout: 20000 }).then(($card) => {
                            const card = $card[0];
                            const doc = card.ownerDocument;
                            const win = doc.defaultView!;
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                            if (doc.documentElement.scrollWidth > width + 1) issues.push(`${state}: document overflow ${doc.documentElement.scrollWidth}/${width}`);
                            const copy = Array.from(card.querySelectorAll<HTMLElement>('h3,h4,p,label,.diary-field-label,.diary-winning-row button,.diary-choice-row button,.diary-seat-panel span,select + div')).map((el) => {
                                const rect = el.getBoundingClientRect();
                                const style = win.getComputedStyle(el);
                                if (rect.width <= 0 || rect.height <= 0 || el.scrollWidth > el.clientWidth + 1 || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1)) issues.push(`${state}: clipped ${el.textContent?.trim().slice(0, 45)}`);
                                return { text: el.textContent?.trim(), width: rect.width, height: rect.height,
                                    clientWidth: el.clientWidth, scrollWidth: el.scrollWidth,
                                    clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, overflowY: style.overflowY };
                            });
                            checkpoints.push({ state, documentWidth: doc.documentElement.scrollWidth, copy });
                            card.scrollIntoView({ block: 'start', behavior: 'instant' });
                        });
                        cy.screenshot(`diary-editor-${id}-${state}-top`, { capture: 'viewport' });
                        cy.get(form).then(($el) => $el[0].scrollIntoView({ block: 'end', behavior: 'instant' }));
                        cy.screenshot(`diary-editor-${id}-${state}-bottom`, { capture: 'viewport' });
                        cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/diary-editor-${id}.json`, { width, font, theme, issues: [...issues], checkpoints: [...checkpoints] }));
                    };
                    const saveControl = (state: string, disabled = false) => {
                        cy.get(save).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(save).then(($el) => {
                            const el = $el[0], rect = el.getBoundingClientRect(), doc = el.ownerDocument;
                            const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                            const reachable = hit === el || Boolean(hit && el.contains(hit));
                            const style = doc.defaultView!.getComputedStyle(el);
                            checkpoints.push({ control: 'save', state, width: rect.width, height: rect.height, reachable,
                                clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight });
                            if (rect.width < 44 || rect.height < 44) issues.push(`${state}: save below44 ${rect.width}/${rect.height}`);
                            if (!disabled && !reachable) issues.push(`${state}: save occluded after scroll`);
                            if (el.scrollWidth > el.clientWidth + 1 || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1)) issues.push(`${state}: save text clipping`);
                        });
                    };
                    const toast = (text: string) => cy.contains('[aria-live="polite"] [role="status"]', text, { timeout: 15000 }).should('be.visible');
                    cy.get('[data-testid="diary-edit-runtime-ready"]', { timeout: 20000 }).should('exist');
                    cy.wait('@entries');
                    snapshot('games-held');
                    cy.then(() => releaseGames());
                    cy.wait('@games');
                    cy.get(`${form} select`).should('contain.text', '합성 홈');
                    snapshot('available');
                    cy.get(`${form} .diary-photo-grid label`).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                    cy.screenshot(`diary-editor-${id}-photo-control`, { capture: 'viewport' });
                    saveControl('validation');
                    cy.get(save).click();
                    toast('경기를 선택해주세요.');
                    cy.then(() => expect(saves).to.equal(0));
                    snapshot('validation');
                    cy.get(`${form} select`).select(String(game.id));
                    cy.get(`${form} .diary-winning-row button`).first().click();
                    cy.get(`${form} textarea`).type(memo, { delay: 0 });
                    cy.press(Cypress.Keyboard.Keys.TAB);
                    cy.focused().should('have.attr', 'data-testid', 'save-diary-btn').then(($el) => {
                        const el = $el[0], doc = el.ownerDocument, rect = el.getBoundingClientRect();
                        const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                        const visible = el.matches(':focus-visible') && (hit === el || Boolean(hit && el.contains(hit)));
                        checkpoints.push({ focus: 'save-from-memo-tab', visible, top: rect.top, bottom: rect.bottom });
                        if (!visible) issues.push('save focus occluded after native Tab from memo');
                    });
                    cy.screenshot(`diary-editor-${id}-save-tab`, { capture: 'viewport' });
                    cy.fixture('tiny-image.base64').then((base64) => {
                        cy.get('[data-testid="diary-photo-upload-input"]').selectFile({ contents: Cypress.Buffer.from(base64, 'base64'),
                            fileName: 'synthetic-diary.png', mimeType: 'image/png' }, { force: true });
                    });
                    cy.get(`${form} img[alt="업로드 1"]`).should('exist');
                    snapshot('photo-preview');
                    cy.get(save).click();
                    cy.get(save).should('be.disabled').and('contain.text', '저장 중');
                    saveControl('pending', true);
                    snapshot('pending');
                    cy.then(() => releaseSave());
                    cy.wait('@save');
                    toast('다이어리 저장에 실패했습니다.');
                    cy.get(save).should('not.be.disabled');
                    snapshot('save-error');
                    saveControl('retry');
                    cy.get(save).click();
                    cy.wait('@save');
                    cy.wait('@upload');
                    toast('일부 사진 업로드에 실패했습니다.');
                    cy.get(save).should('be.disabled');
                    snapshot('upload-error');
                    cy.then(() => releaseRefresh());
                    toast('다이어리가 작성되었습니다!');
                    cy.get('[data-testid="diary-edit-runtime-ready"]').should('not.exist');
                    snapshot('saved-read-mode');
                    cy.get('@save.all').should('have.length', 2);
                    cy.then(() => expect(issues, 'synthetic diary layout findings').to.deep.equal([]));
                });
            }
        }
    }
});
