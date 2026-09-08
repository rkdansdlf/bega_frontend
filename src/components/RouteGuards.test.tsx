import assert from 'node:assert/strict';
import test from 'node:test';

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import ProtectedRoute, {
  resolveProtectedRoutePresentation,
} from './ProtectedRoute';
import PublicOnlyAuthRoute, {
  resolvePublicOnlyAuthRouteOutcome,
} from './PublicOnlyAuthRoute';

test('protected route resolves loading, bootstrap, login-required, and outlet states', () => {
  assert.equal(resolveProtectedRoutePresentation({
    isAuthLoading: true,
    isLoggedIn: false,
    shouldAttemptBootstrap: false,
  }), 'loading');
  assert.equal(resolveProtectedRoutePresentation({
    isAuthLoading: false,
    isLoggedIn: false,
    shouldAttemptBootstrap: true,
  }), 'loading');
  assert.equal(resolveProtectedRoutePresentation({
    isAuthLoading: false,
    isLoggedIn: false,
    shouldAttemptBootstrap: false,
  }), 'login-required');
  assert.equal(resolveProtectedRoutePresentation({
    isAuthLoading: true,
    isLoggedIn: true,
    shouldAttemptBootstrap: false,
  }), 'outlet');
});

test('public-only auth route separates loading, error bypass, outlet, and redirect outcomes', () => {
  assert.deepEqual(resolvePublicOnlyAuthRouteOutcome({
    authBootstrapMode: 'immediate',
    isAuthLoading: true,
    isLoggedIn: false,
    redirectTarget: '/home',
    shouldBypassAuthenticatedRedirect: false,
  }), { presentation: 'loading' });
  assert.deepEqual(resolvePublicOnlyAuthRouteOutcome({
    authBootstrapMode: 'immediate',
    isAuthLoading: false,
    isLoggedIn: false,
    redirectTarget: '/home',
    shouldBypassAuthenticatedRedirect: false,
  }), { presentation: 'outlet' });
  assert.deepEqual(resolvePublicOnlyAuthRouteOutcome({
    authBootstrapMode: 'immediate',
    isAuthLoading: false,
    isLoggedIn: true,
    redirectTarget: '/messages/@bega?from=login#thread',
    shouldBypassAuthenticatedRedirect: false,
  }), {
    presentation: 'loading',
    redirectTarget: '/messages/@bega?from=login#thread',
  });
  assert.deepEqual(resolvePublicOnlyAuthRouteOutcome({
    authBootstrapMode: 'immediate',
    isAuthLoading: false,
    isLoggedIn: true,
    redirectTarget: '/home',
    shouldBypassAuthenticatedRedirect: true,
  }), { presentation: 'outlet' });
});

test('protected route renders deterministic loading, login-required, and outlet presentations', () => {
  const render = (stateOverride: {
    isAuthLoading: boolean;
    isLoggedIn: boolean;
    shouldAttemptBootstrap: boolean;
  }) => renderToStaticMarkup(
    <MemoryRouter initialEntries={['/messages/@bega?from=protected#thread']}>
      <ProtectedRoute
        stateOverride={stateOverride}
        spinnerMinDurationMs={0}
        outletOverride={<div data-testid="protected-route-outlet">보호된 화면</div>}
      />
    </MemoryRouter>,
  );

  assert.match(render({
    isAuthLoading: true,
    isLoggedIn: false,
    shouldAttemptBootstrap: false,
  }), /인증 상태를 확인하고 있습니다/);
  assert.match(render({
    isAuthLoading: false,
    isLoggedIn: false,
    shouldAttemptBootstrap: false,
  }), /data-testid="protected-route-login-required"/);
  assert.match(render({
    isAuthLoading: true,
    isLoggedIn: true,
    shouldAttemptBootstrap: false,
  }), /data-testid="protected-route-outlet"/);
});

test('public-only route renders deterministic loading and outlet presentations', () => {
  const render = ({
    initialEntry,
    isAuthLoading,
    isLoggedIn,
  }: {
    initialEntry: string;
    isAuthLoading: boolean;
    isLoggedIn: boolean;
  }) => renderToStaticMarkup(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PublicOnlyAuthRoute
        authStateOverride={{
          authBootstrapMode: 'immediate',
          isAuthLoading,
          isLoggedIn,
        }}
        spinnerMinDurationMs={0}
        outletOverride={<div data-testid="public-only-route-outlet">공개 인증 화면</div>}
      />
    </MemoryRouter>,
  );

  assert.match(render({
    initialEntry: '/login',
    isAuthLoading: true,
    isLoggedIn: false,
  }), /로그인 상태를 확인하고 있습니다/);
  assert.match(render({
    initialEntry: '/login',
    isAuthLoading: false,
    isLoggedIn: false,
  }), /data-testid="public-only-route-outlet"/);
  assert.match(render({
    initialEntry: '/login?error=oauth2_auth_failed',
    isAuthLoading: false,
    isLoggedIn: true,
  }), /data-testid="public-only-route-outlet"/);
});
