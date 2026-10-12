/// <reference types="cypress" />

export {};

type ThemeMode = 'light' | 'dark';

const viewports = [
  { width: 390, height: 844, name: 'mobile' },
  { width: 1440, height: 900, name: 'desktop' },
] as const;

const themes: ThemeMode[] = ['light', 'dark'];

const blockExternalAndUnmockedApiRequests = () => {
  const appOrigin = new URL(String(Cypress.config('baseUrl'))).origin;
  expect(new URL(appOrigin).hostname).to.eq('127.0.0.1');

  cy.intercept('**/*', (request) => {
    const requestUrl = new URL(request.url);
    if (requestUrl.origin !== appOrigin) {
      request.reply({ statusCode: 204, body: '' });
      return;
    }

    if (requestUrl.pathname.startsWith('/api/')) {
      request.reply({
        statusCode: 503,
        body: { code: 'LOCAL_VISUAL_QA_UNMOCKED_REQUEST' },
      });
    }
  });
};

const visitWithTheme = (route: string, theme: ThemeMode) => {
  cy.visit(route, {
    onBeforeLoad(win) {
      win.localStorage.setItem('kbo-theme', theme);
      win.document.documentElement.classList.add(theme);
    },
  });
  cy.get('html').should('have.class', theme);
};

const captureViewport = (name: string) => {
  cy.document().then((doc) => {
    const win = doc.defaultView!;
    expect(doc.documentElement.scrollWidth).to.be.at.most(win.innerWidth);
    expect(doc.body.scrollWidth).to.be.at.most(win.innerWidth);
    doc.documentElement.style.scrollBehavior = 'auto';
    win.scrollTo(0, 0);
  });
  cy.screenshot(`auth-secondary-pages/${name}-top`, { capture: 'viewport' });
  cy.window().then((win) => {
    const documentHeight = win.document.documentElement.scrollHeight;
    win.scrollTo(0, documentHeight);
    const maxScroll = Math.max(0, documentHeight - win.innerHeight);
    expect(win.scrollY).to.be.closeTo(maxScroll, 2);
  });
  cy.screenshot(`auth-secondary-pages/${name}-bottom`, { capture: 'viewport' });
};

describe('secondary authentication pages visual acceptance', () => {
  for (const viewport of viewports) {
    for (const theme of themes) {
      it(`captures password reset confirmation states at ${viewport.name} in ${theme}`, () => {
        cy.viewport(viewport.width, viewport.height);
        blockExternalAndUnmockedApiRequests();

        let submitCount = 0;
        cy.intercept('POST', '**/api/auth/password/reset/confirm', (request) => {
          submitCount += 1;
          expect(request.body).to.include({
            token: 'visual-only-reset-token',
            newPassword: 'Reset1234!Ab',
            confirmPassword: 'Reset1234!Ab',
          });

          if (submitCount === 1) {
            request.reply({
              statusCode: 400,
              body: {
                success: false,
                code: 'PASSWORD_RESET_TOKEN_EXPIRED',
                message: '비밀번호 재설정 링크가 만료되었습니다.',
              },
            });
            return;
          }

          request.reply({
            statusCode: 200,
            body: { success: true, message: '비밀번호가 변경되었습니다.' },
          });
        }).as('confirmPasswordReset');

        visitWithTheme('/password/reset/confirm?token=visual-only-reset-token', theme);
        cy.get('[data-testid="password-reset-confirm-form"]').should('be.visible');
        cy.get('[data-testid="password-reset-confirm-new-password"]').should('be.enabled');
        cy.get('[data-testid="password-reset-confirm-confirm-password"]').should('be.enabled');
        captureViewport(`password-reset-confirm-${viewport.name}-${theme}-form`);

        cy.get('[data-testid="password-reset-confirm-new-password"]').type('Reset1234!Ab');
        cy.get('[data-testid="password-reset-confirm-confirm-password"]').type('Reset1234!Ab');
        cy.get('[data-testid="password-reset-confirm-submit"]').click();
        cy.wait('@confirmPasswordReset');
        cy.get('[data-testid="password-reset-confirm-status-panel"]')
          .should('be.visible')
          .and('contain.text', '비밀번호 재설정 링크가 만료되었습니다.');
        captureViewport(`password-reset-confirm-${viewport.name}-${theme}-expired`);

        cy.get('[data-testid="password-reset-confirm-submit"]').click();
        cy.wait('@confirmPasswordReset');
        cy.get('[data-testid="password-reset-confirm-header"]').should('contain.text', '비밀번호 변경 완료');
        cy.get('[data-testid="password-reset-confirm-login"]').should('be.visible');
        captureViewport(`password-reset-confirm-${viewport.name}-${theme}-completed`);
      });

      it(`captures account recovery states at ${viewport.name} in ${theme}`, () => {
        cy.viewport(viewport.width, viewport.height);
        blockExternalAndUnmockedApiRequests();

        cy.intercept({ method: 'GET', pathname: '/api/auth/account/deletion/recovery' }, {
          statusCode: 200,
          body: { success: true, data: { scheduledFor: '2026-12-31T09:00:00.000Z' } },
        }).as('getRecoveryInfo');
        cy.intercept({ method: 'POST', pathname: '/api/auth/account/deletion/recovery' }, (request) => {
          expect(request.body).to.deep.equal({ token: 'visual-only-recovery-token' });
          request.reply({ statusCode: 200, body: { success: true } });
        }).as('recoverAccount');

        visitWithTheme('/account/deletion/recovery', theme);
        cy.get('[data-testid="account-recovery-status-panel"]')
          .should('have.attr', 'role', 'alert')
          .and('contain.text', '유효하지 않거나 만료된 복구 링크입니다.');
        captureViewport(`account-recovery-${viewport.name}-${theme}-invalid-link`);

        visitWithTheme('/account/deletion/recovery?token=visual-only-recovery-token', theme);
        cy.wait('@getRecoveryInfo');
        cy.get('[data-testid="account-recovery-schedule-panel"]')
          .should('be.visible')
          .and('contain.text', '최종 삭제 예정 시각');
        cy.get('[data-testid="account-recovery-submit"]').should('be.enabled');
        captureViewport(`account-recovery-${viewport.name}-${theme}-available`);

        cy.get('[data-testid="account-recovery-submit"]').click();
        cy.wait('@recoverAccount');
        cy.get('[data-testid="account-recovery-header"]').should('contain.text', '계정 복구 완료');
        cy.get('[data-testid="account-recovery-login"]').should('be.visible');
        captureViewport(`account-recovery-${viewport.name}-${theme}-completed`);
      });

      it(`captures OAuth email confirmation states at ${viewport.name} in ${theme}`, () => {
        cy.viewport(viewport.width, viewport.height);
        blockExternalAndUnmockedApiRequests();

        let confirmCount = 0;
        cy.intercept('POST', '**/api/auth/oauth2/email-challenge/confirm', (request) => {
          confirmCount += 1;
          expect(request.body).to.have.property('token');

          if (confirmCount === 1) {
            request.reply({
              statusCode: 200,
              body: { success: true, data: { confirmed: true, userId: 314159 } },
            });
            return;
          }

          request.reply({
            statusCode: 410,
            body: {
              success: false,
              code: 'OAUTH_EMAIL_CHALLENGE_EXPIRED',
              message: '이메일 확인 링크가 만료되었습니다.',
            },
          });
        }).as('confirmOAuthEmail');

        visitWithTheme('/oauth/email/confirm', theme);
        cy.get('[data-testid="oauth-email-confirm-error-state"]')
          .should('be.visible')
          .and('contain.text', '이메일 확인 토큰이 없습니다.');
        captureViewport(`oauth-email-confirm-${viewport.name}-${theme}-missing-token`);

        visitWithTheme('/oauth/email/confirm?token=visual-only-email-token', theme);
        cy.wait('@confirmOAuthEmail').its('request.body').should('deep.equal', { token: 'visual-only-email-token' });
        cy.get('[data-testid="oauth-email-confirmed-state"]').should('be.visible');
        captureViewport(`oauth-email-confirm-${viewport.name}-${theme}-verified`);

        visitWithTheme('/oauth/email/confirm?token=visual-only-expired-email-token', theme);
        cy.wait('@confirmOAuthEmail').its('request.body').should('deep.equal', { token: 'visual-only-expired-email-token' });
        cy.get('[data-testid="oauth-email-confirm-expired-state"]').should('be.visible');
        captureViewport(`oauth-email-confirm-${viewport.name}-${theme}-expired`);
      });
    }
  }
});
