/// <reference types="cypress" />

export {};

// Fictional credentials/profile only. Provider buttons are measured, never activated.
describe('Login synthetic responsive state flow', () => {
    for (const width of [320, 390, 1280]) {
        for (const font of [16, 32]) {
            for (const theme of ['light', 'dark'] as const) {
                it(`${width}px / ${font}px / ${theme}`, () => {
                    const id = `${width}-${font}-${theme}`;
                    const origin = new URL(String(Cypress.config('baseUrl')));
                    expect(origin.hostname).to.equal('127.0.0.1');
                    const findings: string[] = [];
                    const observations: Array<Record<string, unknown>> = [];
                    let submissions = 0, unknownWrites = 0, authenticated = false, authenticatedProfileReads = 0;
                    let release!: () => void;
                    const gate = new Cypress.Promise<void>((resolve) => { release = resolve; });
                    const profile = { id: 981234, email: 'synthetic@example.invalid', name: '합성로그인',
                        handle: '@synthetic_login', role: 'ROLE_USER', favoriteTeam: '없음', hasPassword: true, cheerPoints: 0 };
                    const select = (suffix: string) => suffix === 'remember-label'
                        ? 'label[for="remember-email"]' : `[data-testid="login-${suffix}"]`;
                    const persist = () => cy.writeFile(`${Cypress.config('screenshotsFolder')}/login-state-${id}.json`, {
                        width, font, theme, findings, observations,
                    });
                    cy.intercept({ url: '**', middleware: true }, (req) => {
                        if (new URL(req.url).origin !== origin.origin) req.reply({ statusCode: 204, log: false });
                    });
                    cy.intercept('**/api/**', (req) => {
                        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) unknownWrites++;
                        req.reply({ statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
                    });
                    cy.intercept('GET', '**/auth/mypage*', (req) => {
                        if (authenticated) {
                            authenticatedProfileReads++;
                            req.reply({ statusCode: 200, body: { success: true, data: profile } });
                        } else req.reply({ statusCode: 401, body: {} });
                    });
                    cy.intercept('POST', '**/auth/reissue*', { statusCode: 401, body: {} });
                    cy.intercept('POST', '**/api/auth/login', (req) => {
                        submissions++;
                        expect(req.body).to.deep.equal({ email: profile.email, password: 'Synthetic1234!Ab' });
                        if (submissions === 1) return gate.then(() => req.reply({ statusCode: 401, body: { message: 'Synthetic invalid credentials' } }));
                        if (submissions === 2) return req.reply({ statusCode: 503, body: { code: 'SYNTHETIC_LOGIN_UNAVAILABLE' } });
                        authenticated = true;
                        req.reply({ statusCode: 200, body: { success: true, data: profile } });
                    });
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    cy.visit('/login?redirect=%2Fterms', { onBeforeLoad(win) {
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
                        for (const provider of ['google', 'naver', 'kakao']) cy.get(select(`social-${provider}-label`)).should('be.visible');
                        cy.get(select('header')).then(($header) => {
                            const doc = $header[0].ownerDocument, win = doc.defaultView!;
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${font}px`);
                            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                            const documentWidth = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth);
                            if (documentWidth > width + 1) findings.push(`${state}: document overflow`);
                            const copy = Array.from($header[0].parentElement!.querySelectorAll<HTMLElement>('h1,h2,p,label,.auth-provider-label'))
                                .filter((el) => el.getClientRects().length).map((el) => {
                                    const r = el.getBoundingClientRect(), style = win.getComputedStyle(el);
                                    if (r.width <= 0 || r.height <= 0 || r.left < -1 || r.right > width + 1 || el.scrollWidth > el.clientWidth + 1
                                        || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1)) {
                                        findings.push(`${state}: copy bounds/clipping ${el.textContent?.slice(0, 45)}`);
                                    }
                                    return { text: el.textContent, width: r.width, height: r.height, left: r.left, right: r.right,
                                        clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, clientHeight: el.clientHeight,
                                        scrollHeight: el.scrollHeight, overflowY: style.overflowY, visibility: style.visibility };
                                });
                            observations.push({ state, documentWidth, innerWidth: win.innerWidth, clientWidth: doc.documentElement.clientWidth, copy });
                            win.scrollTo({ top: 0, behavior: 'instant' });
                        });
                        cy.screenshot(`login-state-${id}-${state}-top`, { capture: 'viewport' });
                        cy.get(select('header')).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.screenshot(`login-state-${id}-${state}-header`, { capture: 'viewport' });
                        cy.window().then((win) => win.scrollTo({ top: win.document.documentElement.scrollHeight, behavior: 'instant' }));
                        cy.screenshot(`login-state-${id}-${state}-bottom`, { capture: 'viewport' });
                        cy.then(persist);
                    };
                    const control = (suffix: string, phase: string) => {
                        cy.get(select(suffix)).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                        cy.get(select(suffix)).then(($el) => {
                            const el = $el[0] as HTMLInputElement | HTMLButtonElement, doc = el.ownerDocument;
                            const r = el.getBoundingClientRect(), style = doc.defaultView!.getComputedStyle(el);
                            const disabled = suffix === 'remember-label' ? doc.querySelector<HTMLInputElement>('#remember-email')!.disabled : el.disabled;
                            const hit = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                            const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                            if (suffix === 'password' && width < 640) {
                                const toggle = doc.querySelector<HTMLElement>(select('password-visibility'))!;
                                const toggleRect = toggle.getBoundingClientRect();
                                observations.push({ phase, layout: 'mobile-password-separated', inputBottom: r.bottom,
                                    toggleTop: toggleRect.top, paddingLeft: style.paddingLeft, paddingRight: style.paddingRight });
                                if (toggleRect.top < r.bottom || style.paddingRight !== style.paddingLeft) {
                                    findings.push(`${phase}: mobile password/toggle overlap or asymmetric padding`);
                                }
                            }
                            observations.push({ control: suffix, phase, width: r.width, height: r.height, left: r.left, right: r.right,
                                disabled, receivesPointer, hitTestId: hit?.closest('[data-testid]')?.getAttribute('data-testid'),
                                paddingRight: style.paddingRight, innerWidth: doc.defaultView!.innerWidth, clientWidth: doc.documentElement.clientWidth });
                            if (r.width < 44 || r.height < 44 || r.left < -1 || r.right > width + 1 || (!disabled && !receivesPointer)
                                || (el.tagName === 'BUTTON' && el.scrollWidth > el.clientWidth + 1)
                                || (['hidden', 'clip'].includes(style.overflowY) && el.scrollHeight > el.clientHeight + 1)) {
                                findings.push(`${phase}: ${suffix} size/bounds/reachability`);
                            }
                        });
                    };
                    const controls = ['email', 'password', 'password-visibility', 'remember-label', 'password-reset-link',
                        'submit', 'signup-link', 'social-google', 'social-naver', 'social-kakao'];
                    snapshot('blank');
                    for (const suffix of controls) control(suffix, 'blank');
                    cy.get(select('email')).focus();
                    cy.press(Cypress.Keyboard.Keys.TAB);
                    cy.focused().should('have.attr', 'data-testid', 'login-password').then(($el) => {
                        expect($el[0].matches(':focus-visible')).to.equal(true);
                        observations.push({ focus: 'native-tab-email-to-password', focusVisible: true });
                    });
                    cy.get(select('password')).blur();
                    cy.get(`${select('form')} .auth-error-text`).should('be.visible');
                    snapshot('local-validation');
                    cy.then(() => expect(submissions, 'blank blur sends no login').to.equal(0));
                    // Preserve state-flow evidence even when separately measured input centers are occluded.
                    cy.get(select('email')).focus().type(profile.email);
                    cy.get(select('password')).focus().type('Synthetic1234!Ab');
                    cy.get(select('password-visibility')).click();
                    cy.get(select('password')).should('have.attr', 'type', 'text').and('have.value', 'Synthetic1234!Ab');
                    cy.get(select('password-visibility')).then(($el) => $el[0].scrollIntoView({ block: 'center', behavior: 'instant' }));
                    cy.screenshot(`login-state-${id}-password-field`, { capture: 'viewport' });
                    cy.get(select('password-visibility')).click();
                    cy.get(select('password')).should('have.attr', 'type', 'password');
                    cy.get('#remember-email').check();
                    snapshot('ready');
                    cy.get(select('submit')).click();
                    cy.wrap(null).should(() => expect(submissions, 'POST reached held response').to.equal(1));
                    cy.get(select('submit')).should('be.disabled').and('have.attr', 'aria-busy', 'true').and('contain.text', '로그인 중');
                    for (const suffix of controls.filter((x) => x !== 'remember-label')) cy.get(select(suffix)).should('be.disabled');
                    cy.get('#remember-email').should('be.disabled');
                    snapshot('pending');
                    for (const suffix of controls) control(suffix, 'pending');
                    cy.then(() => release());
                    cy.get(select('status-panel')).should('be.visible').and('have.attr', 'role', 'alert')
                        .and('contain.text', '이메일 또는 비밀번호가 일치하지 않습니다.');
                    cy.get(select('submit')).should('be.enabled');
                    snapshot('credential-error');
                    control('submit', 'credential-error');
                    cy.get(select('submit')).click();
                    cy.get(select('status-panel')).should('be.visible').and('contain.text', '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.');
                    snapshot('server-error');
                    for (const suffix of controls) control(suffix, 'server-error');
                    cy.get(select('submit')).click();
                    cy.location('pathname').should('equal', '/terms');
                    cy.get(select('form')).should('not.exist');
                    cy.then(() => {
                        expect(submissions).to.equal(3);
                        expect(authenticatedProfileReads).to.be.greaterThan(0);
                        expect(unknownWrites).to.equal(0);
                    });
                    cy.window().then((win) => {
                        expect(win.localStorage.getItem('savedEmail')).to.equal(profile.email);
                        observations.push({ navigation: 'synthetic-login-terms', submissions, authenticatedProfileReads, unknownWrites, savedEmail: true });
                    });
                    cy.then(persist);
                    cy.then(() => expect(findings, 'login visual findings').to.deep.equal([]));
                });
            }
        }
    }
});
