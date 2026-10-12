/// <reference types="cypress" />

import {
    DEFAULT_CYPRESS_AUTH_TOKEN,
    seedCypressAuthState,
    toAuthApiUser,
    type CypressAuthUser,
} from '../support/auth';

const baseUser: CypressAuthUser & { provider: 'GOOGLE' } = {
    id: 123,
    email: 'social-user@example.com',
    name: 'Social User',
    handle: '@social-user',
    favoriteTeam: 'HH',
    role: 'ROLE_USER',
    profileImageUrl: null,
    provider: 'GOOGLE',
};

const visitProfileSettings = (hasPassword: boolean) => {
    const user = { ...baseUser, hasPassword };
    cy.mockAPI();
    cy.failOnUnexpectedApi401();
    cy.intercept('GET', '**/api/auth/mypage*', {
        statusCode: 200,
        body: {
            success: true,
            data: {
                ...toAuthApiUser(user),
                provider: user.provider,
            },
        },
    });

    cy.visit('/mypage?view=editProfile', {
        onBeforeLoad: (win) => seedCypressAuthState(win, user, DEFAULT_CYPRESS_AUTH_TOKEN, {
            skipPublicBootstrap: true,
            theme: 'dark',
        }),
    });
    cy.contains('Social User', { timeout: 20000 }).should('be.visible');
}

const passSecurityConfirmation = () => {
    cy.contains('button', '안전하게 진행').should('be.visible').click();
    cy.url().should('include', 'view=changePassword');
};

describe('MyPage social account password entry', () => {
    it('lets a social account without a password set one through the security flow', () => {
        cy.intercept('PUT', '**/api/auth/password', {
            statusCode: 200,
            body: { success: true },
        }).as('setPassword');

        visitProfileSettings(false);
        cy.contains('button', '비밀번호 설정').should('be.visible').click();
        passSecurityConfirmation();

        cy.contains('h2', '비밀번호 설정').should('be.visible');
        cy.get('input#currentPassword').should('not.exist');
        cy.get('input#newPassword').type('new-password-123');
        cy.get('input#confirmPassword').type('new-password-123');
        cy.contains('button', '비밀번호 설정').click();

        cy.wait('@setPassword').its('response.statusCode').should('eq', 200);
        cy.location('pathname').should('eq', '/login');
    });

    it('lets a social account that already has a password change it', () => {
        visitProfileSettings(true);
        cy.contains('button', '비밀번호 변경').should('be.visible').click();
        passSecurityConfirmation();

        cy.contains('h2', '비밀번호 변경').should('be.visible');
        cy.get('input#currentPassword').should('be.visible');
    });
});
