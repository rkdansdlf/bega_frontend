/// <reference types="cypress" />

export {};

const expired = '비밀번호 재설정 링크가 만료되었습니다.';
const recoveryError = '합성 복구 요청을 처리하지 못했습니다. 다시 시도해주세요.';

describe('Reset and recovery synthetic large-text states', () => {
    beforeEach(() => {
        const origin = new URL(String(Cypress.config('baseUrl'))).origin;
        cy.intercept({ url: '**', middleware: true }, (request) => {
            if (new URL(request.url).origin !== origin) request.reply({ statusCode: 204, log: false });
        });
        cy.intercept('**/api/**', { statusCode: 503, body: { code: 'SYNTHETIC_UNMOCKED_API' } });
    });

    for (const width of [320, 390, 1280] as const) {
        for (const theme of ['light', 'dark'] as const) {
          for (const rootFont of [16, 32] as const) {
            for (const flow of ['reset', 'recovery'] as const) {
                it(`${flow} at ${width}px / ${rootFont}px in ${theme}`, () => {
                    const id = `${flow}-${width}-${rootFont}-${theme}`;
                    const prefix = flow === 'reset' ? 'password-reset-confirm' : 'account-recovery';
                    const select = (suffix: string) => `[data-testid="${prefix}-${suffix}"]`;
                    const issues: string[] = [];
                    const checkpoints: Array<Record<string, unknown>> = [];
                    let releaseInfo!: () => void;
                    let releaseSubmit!: () => void;
                    const infoGate = new Cypress.Promise<void>((resolve) => { releaseInfo = resolve; });
                    const submitGate = new Cypress.Promise<void>((resolve) => { releaseSubmit = resolve; });
                    let submits = 0;
                    const endpoint = flow === 'reset' ? '/api/auth/password/reset/confirm' : '/api/auth/account/deletion/recovery';
                    cy.intercept({ method: 'POST', pathname: '/api/auth/account/deletion/recovery/info' }, (request) => infoGate.then(() => request.reply({
                        statusCode: 200, body: { success: true, data: { scheduledFor: '2099-12-31T09:00:00Z' } },
                    }))).as('info');
                    cy.intercept({ method: 'POST', pathname: endpoint }, (request) => {
                        submits++;
                        expect(request.body.token).to.equal(`synthetic-${flow}-token`);
                        if (flow === 'reset') expect(request.body).to.include({ newPassword: 'Reset1234!Ab', confirmPassword: 'Reset1234!Ab' });
                        if (submits === 1) return submitGate.then(() => request.reply({ statusCode: 400,
                            body: { success: false, code: flow === 'reset' ? 'PASSWORD_RESET_TOKEN_EXPIRED' : 'SYNTHETIC_RECOVERY_ERROR',
                                message: flow === 'reset' ? expired : recoveryError } }));
                        request.reply({ statusCode: 200, body: { success: true } });
                    }).as('submit');
                    cy.viewport(width, width === 1280 ? 900 : 844);
                    cy.visit(`${flow === 'reset' ? '/password/reset/confirm' : '/account/deletion/recovery'}?token=synthetic-${flow}-token`, {
                        onBeforeLoad(win) {
                            win.localStorage.setItem('kbo-theme', theme);
                            win.document.documentElement.classList.toggle('dark', theme === 'dark');
                            win.document.documentElement.style.fontSize = `${rootFont}px`;
                            win.document.documentElement.style.scrollBehavior = 'auto';
                        },
                    });
                    const snapshot = (state: string) => {
                        cy.document().then((doc) => doc.fonts.ready);
                        cy.get(select('header')).then(($header) => {
                            const doc = $header[0].ownerDocument;
                            const win = doc.defaultView!;
                            expect(doc.documentElement.classList.contains('dark')).to.equal(theme === 'dark');
                            expect(win.getComputedStyle(doc.documentElement).fontSize).to.equal(`${rootFont}px`);
                            if (doc.documentElement.scrollWidth > width || doc.body.scrollWidth > width) issues.push(`${state}: document overflow`);
                            const container = $header[0].parentElement!;
                            const copy = Array.from(container.querySelectorAll<HTMLElement>('h1,h2,p,label,[role="alert"],[role="status"]')).map((el) => {
                                const rect = el.getBoundingClientRect();
                                const style = win.getComputedStyle(el);
                                const clipsY = ['hidden', 'clip'].includes(style.overflowY);
                                // Visible glyph overhang from tight heading line-height is not clipped content.
                                if (rect.width <= 0 || rect.height <= 0 || el.scrollWidth > el.clientWidth + 1 || (clipsY && el.scrollHeight > el.clientHeight + 1)) issues.push(`${state}: copy clipping: ${el.textContent?.slice(0, 50)}`);
                                return { text: el.textContent, left: rect.left, right: rect.right, width: rect.width,
                                    clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, height: rect.height,
                                    clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, overflowY: style.overflowY };
                            });
                            checkpoints.push({ state, documentWidth: doc.documentElement.scrollWidth, copy });
                            win.scrollTo(0, 0);
                        });
                        cy.screenshot(`auth-recovery-${id}-${state}-top`, { capture: 'viewport' });
                        cy.window().then((win) => win.scrollTo(0, win.document.documentElement.scrollHeight));
                        cy.screenshot(`auth-recovery-${id}-${state}-bottom`, { capture: 'viewport' });
                    };
                    const control = (suffix: string, disabled = false) => {
                        cy.get(select(suffix)).then(($el) => {
                            const el = $el[0];
                            el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                        }).then(($el) => {
                            const el = $el[0];
                            const doc = el.ownerDocument;
                            const rect = el.getBoundingClientRect();
                            const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                            const receivesPointer = hit === el || Boolean(hit && el.contains(hit));
                            checkpoints.push({ control: suffix, width: rect.width, height: rect.height,
                                    clientWidth: el.clientWidth, scrollWidth: el.scrollWidth,
                                    clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, receivesPointer });
                            if (rect.width < 44 || rect.height < 44 || el.scrollWidth > el.clientWidth + 1) issues.push(`${suffix}: size or internal clipping`);
                            if (['hidden', 'clip'].includes(doc.defaultView!.getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1) issues.push(`${suffix}: vertical clipping`);
                            if (!disabled && !receivesPointer) issues.push(`${suffix}: center occluded after scroll`);
                        });
                    };
                    if (flow === 'recovery') {
                        cy.get(select('status-panel')).should('contain.text', '복구 가능 여부를 확인하고 있습니다.');
                        snapshot('info-loading');
                        cy.then(() => releaseInfo());
                        cy.wait('@info');
                        cy.get(select('schedule-panel')).should('contain.text', '최종 삭제 예정 시각');
                    } else {
                        cy.get(select('form')).should('exist');
                        snapshot('initial-form');
                        cy.get(select('new-password')).then(($el) => {
                            const el = $el[0];
                            el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
                            const doc = el.ownerDocument;
                            const rect = el.getBoundingClientRect();
                            const toggle = doc.querySelector(select('new-password-visibility'))!.getBoundingClientRect();
                            const hit = doc.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
                            const style = doc.defaultView!.getComputedStyle(el);
                            cy.writeFile(`${Cypress.config('screenshotsFolder')}/auth-input-${id}.json`, {
                                input: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width,
                                    paddingLeft: style.paddingLeft, paddingRight: style.paddingRight },
                                toggle: { left: toggle.left, right: toggle.right, width: toggle.width },
                                centerHitTestId: (hit as HTMLElement | null)?.dataset.testid,
                                inputCenterReceivesPointer: hit === el || Boolean(hit && el.contains(hit)),
                            });
                        });
                        cy.screenshot(`auth-recovery-${id}-input`, { capture: 'viewport' });
                        cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/auth-initial-${id}.json`, { width, theme, flow, issues: [...issues], checkpoints: [...checkpoints] }));
                        cy.get(select('new-password')).type('Reset1234!Ab', { delay: 0 });
                        cy.get(select('confirm-password')).type('Reset1234!Ab', { delay: 0 });
                        for (const field of ['new-password', 'confirm-password']) {
                            control(`${field}-visibility`);
                            cy.get(select(`${field}-visibility`)).click();
                            cy.get(select(field)).should('have.attr', 'type', 'text').and('have.value', 'Reset1234!Ab');
                            cy.get(select(`${field}-visibility`)).click();
                            cy.get(select(field)).should('have.attr', 'type', 'password').and('have.value', 'Reset1234!Ab');
                        }
                    }
                    snapshot('available');
                    control('submit');
                    cy.get(select('submit')).click();
                    cy.get(select('submit')).should('be.disabled');
                    snapshot('pending');
                    control('submit', true);
                    cy.then(() => releaseSubmit());
                    cy.wait('@submit');
                    cy.get(select('status-panel')).should('contain.text', flow === 'reset' ? expired : recoveryError);
                    snapshot('error');
                    control('submit');
                    cy.get(select('submit')).click();
                    cy.wait('@submit');
                    cy.get(select('header')).should('contain.text', flow === 'reset' ? '비밀번호 변경 완료' : '계정 복구 완료');
                    snapshot('completed');
                    control('login');
                    cy.get('@submit.all').should('have.length', 2);
                    cy.then(() => cy.writeFile(`${Cypress.config('screenshotsFolder')}/auth-recovery-${id}.json`, { width, theme, flow, issues, checkpoints }));
                    cy.then(() => expect(issues, 'large-text content/control findings').to.deep.equal([]));
                });
            }
          }
        }
    }
});
