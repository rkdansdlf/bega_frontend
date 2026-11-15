/// <reference types="cypress" />

export {};

// No mail is sent: all API responses and the fictional address remain local.
describe('Password reset request synthetic responsive states', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`;
                    const origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    const findings: string[] = [];
                    const observations: Array<Record<string, unknown>> = [];
                    let submissions = 0, unknownWrites = 0;
                    let release!: () => void;
                    const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
                    const select = (suffix: string) => `[data-testid="password-reset-${suffix}"]`;
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/reset-request-${id}.json`, {
                        width, font, theme, findings, observations,
                    });
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        if (new URL(req.url).origin !== origin.origin) req.reply({ statusCode: 204, log: false });
                    });
                    cy.intercept('**/api/**', (req) => {
                        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) unknownWrites++;
                        req.reply({ statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    });
                    cy.intercept('GET', '**/auth/mypage*', { statusCode: 401, body: {} });
                    cy.intercept('POST', '**/auth/reissue*', { statusCode: 401, body: {} });
                    cy.intercept('POST', '**/api/auth/password/reset/request', (req) => {
                        submissions++;
                        expect(req.body).to.deep.equal({ email: 'synthetic@example.invalid', redirect: '/mypage' });
                        if (submissions === 1) return gate.then(() => req.reply({ statusCode: 503,
                            body: { success: false, code: 'SYNTHETIC_RESET_UNAVAILABLE' } }));
                        req.reply({ statusCode: 200, body: { success: true } });
                    }).as('reset');
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    cy.visit('/password/reset?redirect=%2Fmypage', { onBeforeLoad(win) {
                        win.localStorage.clear();
                        win.sessionStorage.clear();
                        win.localStorage.setItem('kbo-theme', theme);
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.fontSize = `${font}px`;
                        win.document.documentElement.style.scrollBehavior = 'auto';
                    } });
                    const snapshot = (state: string) => {
                        cy.document().then((doc) => doc.fonts.ready);
                        cy.get(`${select('header')} h1`).should('be.visible');
                        cy.get(`${select('header')} .auth-description`).should('be.visible');
                        cy.get(select('header')).then(($header) => {
                            const doc = $header[0].ownerDocument, win = doc.defaultView!;
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                            const documentWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth);
                            if (documentWidth > width + 1) findings.push(`${state}: document overflow`);
                            const copy = Array.from($header[0].parentElement!.querySelectorAll<HTMLElement>('h1,h2,p,label'))
                                .filter((el) => el.getClientRects().length).map((el) => {
                                    const r = el.getBoundingClientRect(), style = win.getComputedStyle(el);
                                    if (r.width <= 0 || r.height <= 0 || r.left < -1 || r.right > width + 1
                                        || el.scrollWidth > el.clientWidth + 1
                                        || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1)) {
                                        findings.push(`${state}: copy bounds/clipping ${el.textContent?.slice(0, 45)}`);
                                    }
                                    return { text: el.textContent, width: r.width, height: r.height, left: r.left, right: r.right,
                                        clientWidth: el.clientWidth, scrollWidth: el.scrollWidth,
                                        clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, overflowY: style.overflowY,
                                        visibility: style.visibility, display: style.display };
                                });
                            observations.push({ state, documentWidth, innerWidth: win.innerWidth, clientWidth: doc.documentElement.clientWidth, copy });
                            win.scrollTo({ top: 0, behavior: 'instant' });
                        });
                        cy.screenshot(`reset-request-${id}-${state}-top`, { capture: 'viewport' });
                        cy.get(select('header')).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.screenshot(`reset-request-${id}-${state}-header`, { capture: 'viewport' });
                        cy.window().then((win) => win.scrollTo({ top: win.document.documentElement.scrollHeight, behavior: 'instant' }));
                        cy.screenshot(`reset-request-${id}-${state}-bottom`, { capture: 'viewport' });
                        cy.then(persist);
                    };
                    const control = (suffix: string, state: string) => {
                        cy.get(select(suffix)).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(select(suffix)).then(($el) => {
                            const el = $el[0] as HTMLInputElement | HTMLButtonElement, doc = el.ownerDocument;
                            const r = el.getBoundingClientRect(), style = doc.defaultView!.getComputedStyle(el);
                            const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                            const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                            observations.push({ control: suffix, state, width: r.width, height: r.height, disabled: el.disabled, receivesPointer,
                                hitTestId: hit?.closest('[data-testid]')?.getAttribute('data-testid') });
                            if (r.width < 44 || r.height < 44 || r.left < -1 || r.right > width + 1
                                || (!el.disabled && !receivesPointer) || (el.tagName === 'BUTTON' && el.scrollWidth > el.clientWidth + 1)
                                || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1)) {
                                findings.push(`${state}: ${suffix} size/bounds/reachability`);
                            }
                        });
                    };
                    cy.get(select('form')).should('exist');
                    snapshot('blank');
                    for (const suffix of ['back-link', 'email', 'submit']) control(suffix, 'blank');
                    cy.get(select('back-link')).focus();
                    cy.press(Cypress.Keyboard.Keys.TAB);
                    cy.focused().should('have.attr', 'data-testid', 'password-reset-email').then(($el) => {
                        expect($el[0].matches(':focus-visible')).to.equal(true);
                        observations.push({ focus: 'native-tab-back-to-email', focusVisible: true });
                    });
                    cy.get(select('email')).type('invalid').blur();
                    cy.get(`${select('form')} .auth-error-text`).should('be.visible');
                    cy.get(select('submit')).click();
                    cy.get(select('email')).then(($el) => expect(($el[0] as HTMLInputElement).validity.valid).to.equal(false));
                    snapshot('invalid-email');
                    cy.then(() => expect(submissions, 'local validation sends no reset request').to.equal(0));
                    cy.get(select('email')).clear().type('synthetic@example.invalid').blur();
                    cy.get(`${select('form')} .auth-error-text`).should('not.exist');
                    snapshot('ready');
                    cy.get(select('submit')).click();
                    cy.wrap(null).should(() => expect(submissions, 'POST reached held response').to.equal(1));
                    cy.get(select('submit')).should('be.disabled').and('contain.text', '전송 중');
                    cy.get(select('email')).should('be.disabled');
                    snapshot('pending');
                    for (const suffix of ['back-link', 'email', 'submit']) control(suffix, 'pending');
                    cy.then(() => release());
                    cy.get(select('status-panel')).should('be.visible').and('have.attr', 'role', 'alert')
                        .and('contain.text', '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.');
                    cy.get(select('email')).should('be.enabled').and('have.value', 'synthetic@example.invalid');
                    cy.get(select('submit')).should('be.enabled');
                    snapshot('error');
                    control('submit', 'error');
                    cy.get(select('submit')).click();
                    cy.get(select('header')).should('contain.text', '이메일을 확인해주세요')
                        .and('contain.text', '입력한 이메일로 가입된 계정이 있다면 비밀번호 재설정 안내를 발송했습니다.');
                    snapshot('completed');
                    control('return-login', 'completed');
                    cy.get(select('return-login')).click();
                    cy.location('pathname').should('equal', '/login');
                    cy.location('search').should('equal', '?redirect=%2Fmypage');
                    cy.then(() => {
                        expect(submissions).to.equal(2);
                        expect(unknownWrites).to.equal(0);
                        observations.push({ navigation: 'return-login', submissions, unknownWrites });
                    });
                    cy.then(persist);
                    cy.then(() => expect(findings, 'reset-request visual findings').to.deep.equal([]));
                });
            }
        }
    }
});
