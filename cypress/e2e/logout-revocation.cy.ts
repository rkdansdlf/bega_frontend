/// <reference types="cypress" />

import { seedCypressAuthState, toAuthApiUser } from '../support/auth';

// UI-only: every logout response is synthetic; this does not prove backend revocation.
const user = {
  id: 987654,
  email: 'logout-regression@example.invalid',
  name: 'Logout Regression',
  handle: 'logout-regression',
  role: 'ROLE_USER',
  profileImageUrl: null,
};
const bootstrapUser = { ...user, name: 'Logout Bootstrap Ready' };
const syntheticXsrf = 'synthetic.logout.csrf';
const dialog = '[data-testid="global-error-dialog-content"]';

const surfaces = [
  // /mate now uses PublicNavbar. /messages exercises Navbar's own mobile handler.
  { name: 'Navbar mobile', path: '/messages', mobile: true, prefix: 'navbar', logout: 'navbar-menu-logout' },
  { name: 'PublicNavbar desktop', path: '/terms', mobile: false, prefix: 'public-navbar', logout: 'public-navbar-desktop-logout' },
  { name: 'PublicNavbar mobile', path: '/terms', mobile: true, prefix: 'public-navbar', logout: 'public-navbar-menu-logout' },
] as const;
type Surface = typeof surfaces[number];

function expectAuthHint(present: boolean) {
  cy.window({ log: false }).should((win) => {
    expect(win.localStorage.getItem('auth-bootstrap-hint') === '1', 'authenticated bootstrap hint')
      .to.eq(present);
    if (!present) {
      expect(win.localStorage.getItem('auth-bootstrap-meta') === null, 'bootstrap metadata cleared')
        .to.eq(true);
    }
  });
}

function visitSurface(surface: Surface, heldProfile?: ReturnType<typeof holdProfileResponse>) {
  cy.viewport(surface.mobile ? 390 : 1440, surface.mobile ? 844 : 1000);
  cy.visit(surface.path, {
    onBeforeLoad(win) {
      seedCypressAuthState(win, user, 'synthetic-logout-session', { skipPublicBootstrap: false });
      // Race cases retain the seeded UI while the real bootstrap is in flight.
      // Other cases require its response before authenticated UI can be ready.
      if (heldProfile) {
        cy.spy(win.console, 'debug').as('raceAuthTrace');
      } else {
        win.localStorage.removeItem('auth-storage');
      }
      delete (win as Window & { __BEGA_TEST_AUTH_PROFILE__?: unknown }).__BEGA_TEST_AUTH_PROFILE__;
      win.document.cookie = `XSRF-TOKEN=${encodeURIComponent(syntheticXsrf)}; path=/; SameSite=Lax`;
      // GlobalErrorDialog otherwise returns null in Cypress. Only the AUT marker
      // is hidden; the runner, real UI handlers and network interception stay intact.
      Object.defineProperty(win, 'Cypress', { configurable: true, value: undefined });

      // cy.intercept cannot guard WebSockets. Keep Vite's local HMR connection,
      // but give notification sockets an inert transport with no network access.
      const NativeWebSocket = win.WebSocket;
      win.WebSocket = new Proxy(NativeWebSocket, {
        construct(target, args) {
          const url = new URL(String(args[0]), win.location.href);
          if (args[1] === 'vite-hmr' && url.host === win.location.host) {
            return Reflect.construct(target, args);
          }
          return Object.assign(new win.EventTarget(), {
            readyState: NativeWebSocket.CLOSED,
            close() {},
            send() {},
            onopen: null,
            onclose: null,
            onerror: null,
            onmessage: null,
          });
        },
      });
    },
  });
  if (heldProfile) {
    cy.wrap(heldProfile, { log: false }).its('requests').should('eq', 1);
    cy.then(() => { expect(heldProfile.completed, 'profile held before logout click').to.eq(0); });
  } else {
    cy.wait('@logoutBootstrapProfile').its('response.statusCode').should('eq', 200);
  }
  if (surface.mobile) {
    cy.getBySel(`${surface.prefix}-menu-toggle`).should('be.visible').click();
  }
  cy.getBySel(`${surface.prefix}-${surface.mobile ? 'menu' : 'desktop'}-profile`)
    .should('be.visible').contains(`${heldProfile ? user.name : bootstrapUser.name} 님`).should('be.visible');
  cy.getBySel(surface.logout).should('be.visible');
  expectAuthHint(true);
}

function holdProfileResponse(statusCode = 200) {
  const state = { requests: 0, completed: 0, release: () => {} };
  cy.intercept({ method: 'GET', url: '**/api/auth/mypage*', times: 1 }, (req) => {
    state.requests += 1;
    return new Cypress.Promise<void>((resolve) => {
      state.release = resolve;
    }).then(() => {
      // Snapshot from before logout: same identity, distinguishable display name.
      req.reply({ statusCode, body: { success: statusCode === 200, data: toAuthApiUser(bootstrapUser) }, log: false });
      state.completed += 1;
    });
  }).as('heldLogoutProfile');
  return state;
}

function releaseProfileResponse(state: ReturnType<typeof holdProfileResponse>) {
  cy.then(() => { state.release(); });
  cy.wait('@heldLogoutProfile').its('response.statusCode').should('eq', 200);
  // Observe completion of the real bootstrap consumer, not just response delivery.
  cy.get('@raceAuthTrace').should('be.calledWithMatch', /AuthBootstrap: fetchProfileAndAuthenticate resolved/);
}

function holdLogoutResponses(statuses: readonly (200 | 503)[], onRevoked: () => void) {
  const state = { requests: 0, completed: 0, csrfMatches: [] as boolean[], release: () => {} };
  cy.intercept('POST', '**/api/auth/logout', (req) => {
    const index = state.requests++;
    // Record/assert only the comparison result, never cookie/header values.
    state.csrfMatches.push(req.headers['x-xsrf-token'] === syntheticXsrf);
    return new Cypress.Promise<void>((resolve) => {
      state.release = resolve;
    }).then(() => {
      const statusCode = statuses[index];
      if (statusCode === undefined) throw new Error('Unexpected extra logout POST');
      if (statusCode === 200) onRevoked();
      req.reply({
        statusCode,
        log: false,
        body: statusCode === 503
          ? { success: false, code: 'LOGOUT_REVOCATION_UNAVAILABLE', message: 'Synthetic revocation unavailable' }
          : { success: true },
      });
      state.completed += 1;
    });
  });
  return state;
}

function expectPending(state: ReturnType<typeof holdLogoutResponses>, attempt: number, path: string) {
  cy.wrap(state, { log: false }).its('requests', { log: false }).should('eq', attempt);
  cy.then(() => {
    expect(state.completed, 'no response released for this attempt').to.eq(attempt - 1);
    expect(state.csrfMatches.every(Boolean), 'every logout POST carries the synthetic CSRF header').to.eq(true);
  });
  cy.location('pathname').should('eq', path);
  expectAuthHint(true);
  cy.then(() => { state.release(); });
}

function expectRevocationDialog(path: string) {
  cy.get(dialog).should('be.visible').and('contain.text', 'HTTP 503')
    .and('contain.text', '로그아웃을 완료하지 못했습니다');
  cy.get(dialog).contains('button', /^다시 시도$/).should('be.enabled');
  cy.location('pathname').should('eq', path);
  expectAuthHint(true);
}

describe('Logout revocation - mocked API / real browser UI only', () => {
  let revoked = false;

  beforeEach(() => {
    revoked = false;
    const baseUrl = new URL(String(Cypress.config('baseUrl')));
    expect(baseUrl.origin, 'isolated local frontend').to.eq('http://127.0.0.1:5177');

    // Middleware blocks external resources before any narrower mock can match.
    cy.intercept({ url: '**', middleware: true }, (req) => {
      if (new URL(req.url).origin !== baseUrl.origin) {
        req.reply({ statusCode: 204, log: false });
      }
    });
    // Match the API root only: Vite also serves modules under /src/api/.
    // Registered first: narrower mocks below win; unmatched APIs never reach a proxy.
    cy.intercept({ pathname: /^\/api(?:\/|$)/ }, {
      statusCode: 503,
      body: { code: 'TEST_ONLY_UNMOCKED_REQUEST' },
      log: false,
    });
    cy.mockAPI();
    cy.intercept('GET', '**/api/auth/mypage*', (req) => {
      req.reply({
        statusCode: revoked ? 401 : 200,
        body: revoked ? { success: false } : { success: true, data: toAuthApiUser(bootstrapUser) },
        log: false,
      });
    }).as('logoutBootstrapProfile');
    cy.intercept('**/api/auth/reissue*', { statusCode: 401, body: { success: false }, log: false });
  });

  for (const surface of surfaces) {
    it(`${surface.name}: retains auth through pending, 503, repeated 503 and modal retry success`, () => {
      const state = holdLogoutResponses([503, 503, 200], () => { revoked = true; });
      visitSurface(surface);
      cy.getBySel(surface.logout).click();
      expectPending(state, 1, surface.path);
      expectRevocationDialog(surface.path);
      if (!surface.mobile) {
        cy.get(dialog).screenshot('logout-revocation-desktop-503-retry-dialog', { overwrite: true });
      }

      cy.get(dialog).contains('button', /^다시 시도$/).click();
      expectPending(state, 2, surface.path);
      expectRevocationDialog(surface.path);
      cy.get(dialog).contains('button', /^다시 시도$/).click();
      expectPending(state, 3, surface.path);

      expectAuthHint(false);
      cy.get(dialog).should('not.exist');
      // Modal retries call the store directly; they do not invoke navbar navigation.
      cy.location('pathname').should('eq', surface.path);
      if (surface.path === '/messages') {
        cy.getBySel('protected-route-login-required').should('exist').and('be.visible');
        cy.screenshot('logout-revocation-messages-login-required', { capture: 'viewport', overwrite: true });
      } else if (surface.mobile) {
        cy.getBySel('public-navbar-menu-toggle').click();
        cy.getBySel('public-navbar-menu-login').should('be.visible');
      } else {
        cy.getBySel('public-navbar-desktop-login').should('be.visible');
      }
      cy.then(() => { expect(state.requests, 'one POST per explicit attempt').to.eq(3); });
    });

    it(`${surface.name}: clears auth and navigates home only after successful logout`, () => {
      const state = holdLogoutResponses([200], () => { revoked = true; });
      visitSurface(surface);
      cy.getBySel(surface.logout).click();
      expectPending(state, 1, surface.path);

      cy.location('pathname').should('eq', '/home');
      expectAuthHint(false);
      cy.get(dialog).should('not.exist');
      if (surface.mobile) {
        // Retain a retryable query while the home route replaces its navbar.
        cy.get('[data-testid="home-date-next"]').should('be.visible');
        cy.get('[data-testid="public-navbar-menu-toggle"]').should('be.visible').click();
        cy.getBySel('public-navbar-menu-login').should('be.visible');
        cy.getBySel('public-navbar-menu-logout').should('not.exist');
      } else {
        cy.getBySel('public-navbar-desktop-login').should('be.visible');
        cy.getBySel('public-navbar-desktop-logout').should('not.exist');
      }
      if (surface.name === 'PublicNavbar mobile') {
        cy.screenshot('logout-revocation-mobile-success', { capture: 'viewport', overwrite: true });
      }
      cy.then(() => { expect(state.requests, 'single logout POST').to.eq(1); });
    });
  }

  for (const order of ['profile-first', 'logout-first'] as const) {
    for (const status of [200, 503] as const) {
      it(`PublicNavbar desktop: ignores stale profile ${order} with logout ${status}`, () => {
        const surface = surfaces[1];
        const profile = holdProfileResponse();
        const logout = holdLogoutResponses(status === 503 ? [503, 200] : [200], () => { revoked = true; });
        visitSurface(surface, profile);
        cy.getBySel(surface.logout).click();
        cy.wrap(logout, { log: false }).its('requests').should('eq', 1);
        cy.then(() => {
          expect(logout.completed, 'logout held while profile is pending').to.eq(0);
          expect(profile.completed, 'profile still held at logout intent').to.eq(0);
        });

        if (order === 'profile-first') {
          releaseProfileResponse(profile);
          cy.getBySel('public-navbar-desktop-profile').should('contain.text', `${user.name} 님`)
            .and('not.contain.text', bootstrapUser.name);
          cy.getBySel(surface.logout).should('be.visible');
        }

        expectPending(logout, 1, surface.path);
        if (status === 503) {
          expectRevocationDialog(surface.path);
        } else {
          cy.location('pathname').should('eq', '/home');
          expectAuthHint(false);
          cy.getBySel('public-navbar-desktop-login').should('be.visible');
        }

        if (order === 'logout-first') {
          cy.then(() => { expect(profile.completed, 'profile held until logout outcome is visible').to.eq(0); });
          releaseProfileResponse(profile);
        }

        if (status === 503) {
          expectRevocationDialog(surface.path);
          cy.getBySel('public-navbar-desktop-profile').should('contain.text', `${user.name} 님`)
            .and('not.contain.text', bootstrapUser.name);
          cy.get(dialog).contains('button', /^다시 시도$/).click();
          expectPending(logout, 2, surface.path);
          // A stale profile must not invalidate the modal's captured retry session.
          cy.location('pathname').should('eq', surface.path);
        } else {
          cy.location('pathname').should('eq', '/home');
        }
        expectAuthHint(false);
        cy.get(dialog).should('not.exist');
        cy.getBySel('public-navbar-desktop-login').should('be.visible');
        cy.getBySel('public-navbar-desktop-profile').should('not.exist');
        cy.getBySel(surface.logout).should('not.exist');
        cy.then(() => {
          expect(profile.completed, 'delayed profile delivered').to.eq(1);
          expect(logout.requests, 'one POST per explicit logout or retry').to.eq(status === 503 ? 2 : 1);
        });
      });
    }
  }

  for (const status of [200, 503] as const) {
    it(`PublicNavbar desktop: drains pending reissue before logout ${status}`, () => {
      const surface = surfaces[1];
      const profile = holdProfileResponse(401);
      const refresh = { requests: 0, release: () => {} };
      cy.intercept('POST', '**/api/auth/reissue', (req) => {
        refresh.requests++;
        return new Cypress.Promise<void>((resolve) => { refresh.release = resolve; })
          .then(() => { req.reply({ statusCode: 200, body: { success: true }, log: false }); });
      }).as('heldReissue');
      const logout = holdLogoutResponses(status === 503 ? [503, 200] : [200], () => { revoked = true; });
      visitSurface(surface, profile);
      cy.then(() => { profile.release(); });
      cy.wait('@heldLogoutProfile').its('response.statusCode').should('eq', 401);
      cy.wrap(refresh).its('requests').should('eq', 1);
      cy.clock(Date.now(), ['setTimeout', 'clearTimeout']);
      cy.getBySel(surface.logout).click();
      cy.tick(10_000);
      cy.get(dialog).should('be.visible').and('contain.text', '로그아웃은 아직 완료되지 않았습니다');
      cy.getBySel('global-error-dialog-title').should('not.contain.text', 'HTTP 0');
      cy.then(() => { expect(logout.requests).to.eq(0); });
      expectAuthHint(true);
      cy.location('pathname').should('eq', surface.path);
      cy.get(dialog).screenshot(`logout-reissue-${status}-pending-notice`, { overwrite: true });
      cy.then(() => { refresh.release(); });
      cy.wait('@heldReissue');
      expectPending(logout, 1, surface.path);
      if (status === 503) {
        expectRevocationDialog(surface.path);
        cy.get(dialog).contains('button', /^다시 시도$/).click();
        expectPending(logout, 2, surface.path);
      }
      expectAuthHint(false);
      cy.location('pathname').should('eq', surface.path);
      cy.then(() => { expect(logout.requests).to.eq(status === 503 ? 2 : 1); });
    });
  }

  it('PublicNavbar desktop: late logout success after 10 seconds clears auth without success navigation', () => {
    const surface = surfaces[1];
    const logout = holdLogoutResponses([200], () => { revoked = true; });
    visitSurface(surface);
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout']);
    cy.getBySel(surface.logout).click();
    cy.wrap(logout).its('requests').should('eq', 1);
    cy.tick(10_000);
    cy.get(dialog).should('be.visible').and('contain.text', '로그아웃은 아직 완료되지 않았습니다');
    cy.getBySel('global-error-dialog-title').should('not.contain.text', 'HTTP 0');
    expectAuthHint(true);
    cy.location('pathname').should('eq', surface.path);
    cy.then(() => { logout.release(); });
    expectAuthHint(false);
    cy.location('pathname').should('eq', surface.path);
    cy.then(() => { expect(logout.requests).to.eq(1); });
  });
});
