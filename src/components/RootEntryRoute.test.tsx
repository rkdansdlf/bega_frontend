import assert from 'node:assert/strict';
import test from 'node:test';

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import RootEntryRoute from './RootEntryRoute';
import RootEntryRouteAuthAware from './RootEntryRouteAuthAware';

test('RootEntryRoute exposes a readable full-screen Suspense fallback', () => {
  const html = renderToStaticMarkup(
    <RootEntryRoute
      landingLoader={() => new Promise<never>(() => {})}
      shouldUseAuthAwareRouteOverride={false}
    />,
  );

  assert.match(html, /data-testid="root-entry-route-loading-fallback"/);
  assert.match(html, /role="status"/);
  assert.match(html, /첫 화면을 준비하고 있습니다/);
  assert.match(html, /motion-reduce:animate-none/);
});

test('RootEntryRouteAuthAware renders both authentication loading messages without delay', () => {
  const bootstrapHtml = renderToStaticMarkup(
    <MemoryRouter>
      <RootEntryRouteAuthAware
        authStateOverride={{
          isAuthBootstrapPending: true,
          isAuthLoading: false,
          isLoggedIn: false,
        }}
        spinnerMinDurationMs={0}
      />
    </MemoryRouter>,
  );
  assert.match(bootstrapHtml, /data-testid="root-entry-auth-loading"/);
  assert.match(bootstrapHtml, /로그인 상태를 복구하는 중입니다/);

  const loadingHtml = renderToStaticMarkup(
    <MemoryRouter>
      <RootEntryRouteAuthAware
        authStateOverride={{
          isAuthBootstrapPending: false,
          isAuthLoading: true,
          isLoggedIn: false,
        }}
        spinnerMinDurationMs={0}
      />
    </MemoryRouter>,
  );
  assert.match(loadingHtml, /사용자 상태를 확인하는 중입니다/);
});

test('RootEntryRouteAuthAware exposes a deterministic landing-module fallback', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <RootEntryRouteAuthAware
        authStateOverride={{
          isAuthBootstrapPending: false,
          isAuthLoading: false,
          isLoggedIn: false,
        }}
        landingLoader={() => new Promise<never>(() => {})}
        spinnerMinDurationMs={0}
      />
    </MemoryRouter>,
  );

  assert.match(html, /data-testid="root-entry-landing-loading"/);
  assert.match(html, /랜딩 페이지를 불러오는 중입니다/);
});
