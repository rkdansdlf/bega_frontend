/// <reference types="cypress" />

export {};

const authToken = 'admin-theme-visual-only-token';
const profile = {
  id: 9317,
  email: 'admin-theme@example.invalid',
  name: 'Synthetic Admin',
  handle: 'synthetic-admin',
  favoriteTeam: 'LG',
  role: 'ROLE_SUPER_ADMIN',
  hasPassword: true,
  profileImageUrl: null,
};

describe('Admin route dark-only theme boundary', () => {
  const cases = [
    { width: 390, height: 844, theme: 'light' },
    { width: 390, height: 844, theme: 'dark' },
    { width: 1400, height: 900, theme: 'light' },
    { width: 1400, height: 900, theme: 'dark' },
  ] as const;

  for (const scenario of cases) {
    it(`keeps the full Admin route dark at ${scenario.width}px with ${scenario.theme} preference`, () => {
      cy.viewport(scenario.width, scenario.height);
      const appOrigin = new URL(String(Cypress.config('baseUrl'))).origin;
      expect(new URL(appOrigin).hostname).to.eq('127.0.0.1');

      cy.intercept({ url: '**', middleware: true }, (request) => {
        if (new URL(request.url).origin !== appOrigin) {
          request.reply({ statusCode: 204, body: '', log: false });
        }
      });
      cy.intercept('GET', '**/auth/mypage*', {
        statusCode: 200,
        body: { success: true, data: profile },
      });
      cy.intercept('GET', '**/api/admin/stats*', {
        statusCode: 200,
        body: { success: true, data: { totalUsers: 0, totalPosts: 0, totalMates: 0 } },
      });
      cy.intercept('GET', '**/api/admin/users*', {
        statusCode: 200,
        body: { success: true, data: [] },
      });
      cy.intercept('GET', '**/api/chat/my/unread-counts', {
        statusCode: 200,
        body: { success: true, data: 0 },
      });
      cy.intercept('GET', '**/api/notifications/my/unread-count', { statusCode: 200, body: 0 });
      cy.intercept('GET', '**/api/notifications/my*', { statusCode: 200, body: [] });

      cy.visit('/admin', {
        onBeforeLoad(win) {
          win.localStorage.setItem('auth-storage', JSON.stringify({
            state: { user: profile, isLoggedIn: true, isAdmin: true },
            version: 0,
          }));
          win.localStorage.setItem('accessToken', authToken);
          win.localStorage.setItem('auth-bootstrap-hint', '1');
          win.localStorage.setItem('bega_has_visited', 'true');
          win.localStorage.setItem('bega_dont_show_guide', 'true');
          win.localStorage.setItem('kbo-theme', scenario.theme);
          win.localStorage.removeItem('bega-theme');
          win.localStorage.removeItem('theme');
          win.document.documentElement.classList.toggle('dark', scenario.theme === 'dark');
        },
      });
      cy.setCookie('Authorization', authToken);

      cy.getBySel('admin-tab-users', { timeout: 20000 }).should('be.visible');
      cy.getBySel('admin-route-theme').should(($scope) => {
        const scope = $scope[0] as HTMLElement;
        const document = scope.ownerDocument;
        const view = document.defaultView!;
        const main = document.querySelector('main');
        const navbar = document.querySelector('[data-testid="navbar-capsule"]');
        const bounds = scope.getBoundingClientRect();

        expect(scope.classList.contains('dark'), 'Admin theme boundary is always dark').to.eq(true);
        expect(view.getComputedStyle(scope).backgroundColor).to.eq('rgb(2, 6, 23)');
        expect(view.getComputedStyle(document.documentElement).backgroundColor, 'document canvas is dark').to.eq('rgb(2, 6, 23)');
        expect(view.getComputedStyle(document.body).backgroundColor, 'body canvas is dark').to.eq('rgb(2, 6, 23)');
        expect(view.getComputedStyle(document.body).colorScheme, 'native controls use dark scheme').to.eq('dark');
        expect(main && view.getComputedStyle(main).backgroundColor).to.eq('rgb(2, 6, 23)');
        expect(main && scope.contains(main), 'Admin main is inside the dark boundary').to.eq(true);
        expect(navbar && scope.contains(navbar), 'shared navbar is inside the dark boundary').to.eq(true);
        expect(bounds.width).to.be.at.least(document.documentElement.clientWidth - 1);
        expect(bounds.height).to.be.at.least(view.innerHeight);
      });
      cy.get('[data-testid="site-footer"]', { timeout: 20000 }).should(($footer) => {
        const footer = $footer[0] as HTMLElement;
        const view = footer.ownerDocument.defaultView!;
        expect(footer.closest('[data-testid="admin-route-theme"]')).not.to.eq(null);
        expect(view.getComputedStyle(footer).backgroundColor).to.eq('rgb(17, 24, 39)');
      });
      cy.document().should((document) => {
        expect(document.defaultView?.localStorage.getItem('kbo-theme')).to.eq(scenario.theme);
      });
      cy.screenshot(`admin-dark-only/${scenario.width}px-${scenario.theme}-preference`, { capture: 'viewport' });
    });
  }
});
