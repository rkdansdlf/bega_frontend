/// <reference types="cypress" />

// Fictional identity and credentials; every availability/signup request is answered locally.
describe('Signup synthetic responsive state flow', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`;
                    const origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    const findings: string[] = [];
                    const observations: Array<Record<string, unknown>> = [];
                    let handleChecks = 0, submissions = 0, unknownWrites = 0;
                    let releaseHandle!: () => void, releaseSubmit!: () => void;
                    const handleGate = new Cypress.Promise<void>((resolve) => { releaseHandle = resolve; });
                    const submitGate = new Cypress.Promise<void>((resolve) => { releaseSubmit = resolve; });
                    const select = (suffix: string) => `[data-testid="signup-${suffix}"]`;
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        if (new URL(req.url).origin !== origin.origin) req.reply({ statusCode: 204, log: false });
                    });
                    cy.intercept('**/api/**', (req) => {
                        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) unknownWrites++;
                        req.reply({ statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    });
                    cy.intercept('GET', '**/auth/mypage*', { statusCode: 401, body: {} });
                    cy.intercept('POST', '**/auth/reissue*', { statusCode: 401, body: {} });
                    cy.intercept('GET', '**/api/auth/check-handle*', (req) => {
                        handleChecks++;
                        if (handleChecks === 1) return handleGate.then(() => req.reply({ statusCode: 503, body: { code: 'SYNTHETIC_CHECK_UNAVAILABLE' } }));
                        req.reply({ statusCode: 200, body: { success: true, data: { available: true, normalized: '@synthetic_ok' } } });
                    }).as('handle');
                    cy.intercept('GET', '**/api/auth/policies/required', { statusCode: 200, body: { success: true, data: { policies:
                        ['TERMS', 'PRIVACY', 'DATA_DISCLAIMER'].map((policyType) => ({ policyType, version: '2026-02-26', required: true })),
                    } } });
                    cy.intercept('POST', '**/api/auth/signup', (req) => {
                        submissions++;
                        expect(req.body).to.include({ name: '합성가입자', handle: '@synthetic_ok', email: 'synthetic@example.invalid', favoriteTeam: null });
                        if (submissions === 1) return submitGate.then(() => req.reply({ statusCode: 503, body: {
                            success: false, code: 'SYNTHETIC_SIGNUP_UNAVAILABLE', message: '합성 가입 요청을 처리하지 못했습니다.',
                        } }));
                        req.reply({ statusCode: 201, body: { success: true, message: '합성 가입 완료' } });
                    }).as('signup');
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    cy.visit('/signup', { onBeforeLoad(win) {
                        win.localStorage.clear();
                        win.sessionStorage.clear();
                        win.localStorage.setItem('kbo-theme', theme);
                        win.document.documentElement.classList.toggle('dark', theme === 'dark');
                        win.document.documentElement.style.fontSize = `${font}px`;
                        win.document.documentElement.style.scrollBehavior = 'auto';
                    } });
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/signup-state-${id}.json`, { width, font, theme, findings, observations });
                    const snapshot = (state: string, focus = select('header')) => {
                        cy.document().then((doc) => doc.fonts.ready);
                        cy.get(select('form')).then(($form) => {
                            const root = $form[0].parentElement!, doc = root.ownerDocument, win = doc.defaultView!;
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                            const documentWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth);
                            if (documentWidth > width + 1) findings.push(`${state}: document overflow`);
                            const copy = Array.from(root.querySelectorAll<HTMLElement>('h1,h2,p,label')).filter((el) => el.getClientRects().length).map((el) => {
                                const r = el.getBoundingClientRect(), style = win.getComputedStyle(el);
                                if (r.width <= 0 || r.height <= 0 || r.left < -1 || r.right > width + 1 || el.scrollWidth > el.clientWidth + 1
                                    || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1)) findings.push(`${state}: copy bounds/clipping ${el.textContent?.slice(0, 45)}`);
                                return { text: el.textContent, left: r.left, right: r.right, width: r.width, height: r.height,
                                    clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight };
                            });
                            observations.push({ state, documentWidth, copy });
                        });
                        cy.get(focus).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.screenshot(`signup-state-${id}-${state}-focus`, { capture: 'viewport' });
                        cy.window().then((win) => win.scrollTo({ top: win.document.documentElement.scrollHeight, behavior: 'instant' }));
                        cy.screenshot(`signup-state-${id}-${state}-bottom`, { capture: 'viewport' });
                        cy.then(persist);
                    };
                    const control = (suffix: string, phase = 'blank') => {
                        cy.get(select(suffix)).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(select(suffix)).then(($el) => {
                            const el = $el[0] as HTMLInputElement | HTMLButtonElement | HTMLSelectElement;
                            const doc = el.ownerDocument, r = el.getBoundingClientRect(), style = doc.defaultView!.getComputedStyle(el);
                            const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                            const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                            observations.push({ control: suffix, phase, width: r.width, height: r.height, left: r.left, right: r.right,
                                disabled: el.disabled, receivesPointer, paddingLeft: style.paddingLeft, paddingRight: style.paddingRight,
                                innerWidth: doc.defaultView!.innerWidth, documentClientWidth: doc.documentElement.clientWidth,
                                hitTestId: hit?.closest('[data-testid]')?.getAttribute('data-testid'),
                                hitTag: hit?.tagName, scrollbarGutter: doc.defaultView!.getComputedStyle(doc.documentElement).scrollbarGutter });
                            if (r.width < 44 || r.height < 44 || r.left < -1 || r.right > width + 1 || (!el.disabled && !receivesPointer)
                                || (el.tagName === 'BUTTON' && el.scrollWidth > el.clientWidth + 1)
                                || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1)) findings.push(`${suffix}: size/bounds/reachability`);
                        });
                    };
                    cy.get(select('header')).should('contain.text', '회원가입');
                    cy.get(select('submit')).should('be.disabled');
                    snapshot('blank');
                    for (const suffix of ['name', 'handle', 'email', 'password', 'password-visibility', 'confirm-password', 'confirm-password-visibility', 'favorite-team', 'team-test', 'submit', 'login-link']) control(suffix);
                    cy.get(select('name')).focus();
                    cy.press(Cypress.Keyboard.Keys.TAB);
                    cy.focused().should('have.attr', 'data-testid', 'signup-handle').then(($el) => {
                        const el = $el[0], r = el.getBoundingClientRect();
                        const hit = el.ownerDocument.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                        expect(el.matches(':focus-visible')).to.equal(true);
                        expect(hit === el || Boolean(hit && el.contains(hit))).to.equal(true);
                        observations.push({ focus: 'native-tab-name-to-handle', focusVisible: true, receivesPointer: true });
                    });
                    cy.get(select('form')).find('.auth-error-text').should('contain.text', '닉네임');
                    snapshot('local-validation', select('name'));
                    // Programmatic focus keeps typed-flow evidence separate from measured input-center pointer coverage.
                    cy.get(select('name')).focus().type('합성가입자');
                    cy.get(select('password')).focus().type('Synthetic1234!Ab');
                    cy.get(select('confirm-password')).focus().type('Synthetic1234!Ab');
                    cy.get(select('email')).focus().type('synthetic@example.invalid');
                    cy.get(select('favorite-team')).select('없음');
                    cy.get(select('handle')).clear().type('synthetic_ui');
                    cy.get(select('handle-availability')).should('be.visible').and('contain.text', '핸들 중복 확인 중');
                    cy.get(select('submit')).should('be.disabled');
                    snapshot('handle-checking', select('handle-availability'));
                    cy.then(() => releaseHandle());
                    cy.get(select('handle-availability')).should('be.visible').and('contain.text', '핸들 확인 중 오류');
                    snapshot('handle-error', select('handle-availability'));
                    cy.get(select('handle')).clear().type('synthetic_ok');
                    cy.get(select('handle-availability')).should('be.visible').and('contain.text', '사용 가능한 핸들');
                    cy.get(select('no-team-warning')).should('be.visible');
                    cy.get(select('submit')).should('be.enabled');
                    cy.get(select('password-visibility')).click();
                    cy.get(select('password')).should('have.attr', 'type', 'text');
                    cy.get(select('password-visibility')).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                    cy.screenshot(`signup-state-${id}-password-field`, { capture: 'viewport' });
                    cy.get(select('password-visibility')).click();
                    snapshot('available-no-team', select('no-team-warning'));
                    control('submit', 'available-no-team');
                    // Freeze only after debounce/availability complete, to inspect success before the existing3s redirect.
                    cy.clock(Date.now(), ['setTimeout', 'clearTimeout']);
                    cy.get(select('submit')).click();
                    cy.get(select('submit')).should('be.disabled').and('contain.text', '처리 중');
                    cy.get(select('name')).should('be.disabled');
                    cy.get(select('team-test')).should('be.disabled');
                    cy.wrap(null).should(() => expect(submissions, 'signup POST reached held local response').to.equal(1));
                    control('submit', 'submitting');
                    control('team-test', 'submitting');
                    snapshot('submitting', select('submit'));
                    cy.then(() => releaseSubmit());
                    cy.get(`${select('form')} [role="alert"]`).should('be.visible').and('contain.text', '회원가입 실패')
                        .and('contain.text', '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.');
                    cy.get(select('submit')).should('be.enabled');
                    control('submit', 'submit-error');
                    snapshot('submit-error', `${select('form')} [role="alert"]`);
                    cy.get(select('submit')).click();
                    cy.get(`${select('form')} [role="status"]`).first().should('contain.text', '회원가입 성공');
                    cy.get(select('submit')).should('be.disabled').and('contain.text', '성공');
                    control('submit', 'success');
                    snapshot('success', `${select('form')} [role="status"]`);
                    cy.tick(3000);
                    cy.location('pathname').should('equal', '/login');
                    cy.then(() => {
                        expect(submissions).to.equal(2);
                        expect(unknownWrites).to.equal(0);
                        observations.push({ navigation: 'success-redirect', pathname: '/login', submissions, unknownWrites });
                    });
                    cy.then(persist);
                    cy.then(() => expect(findings, 'signup visual findings').to.deep.equal([]));
                });
            }
        }
    }
});
