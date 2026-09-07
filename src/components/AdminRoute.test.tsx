import assert from 'node:assert/strict';
import test from 'node:test';

import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import AdminRoute, { resolveAdminRouteAccess } from './AdminRoute';

test('admin route resolves every declared permission without losing the requested location', () => {
  assert.deepEqual(resolveAdminRouteAccess({
    currentLocation: '/admin?tab=ai#release',
    isLoggedIn: false,
  }), {
    kind: 'redirect',
    to: '/login?redirect=%2Fadmin%3Ftab%3Dai%23release',
  });
  assert.deepEqual(resolveAdminRouteAccess({
    currentLocation: '/admin',
    isLoggedIn: true,
    userRole: 'ROLE_USER',
  }), {
    kind: 'redirect',
    to: '/',
  });
  assert.deepEqual(resolveAdminRouteAccess({
    currentLocation: '/admin',
    isLoggedIn: true,
    userRole: 'ROLE_ADMIN',
  }), { kind: 'allow' });
  assert.deepEqual(resolveAdminRouteAccess({
    currentLocation: '/admin',
    isLoggedIn: true,
    userRole: 'ROLE_SUPER_ADMIN',
  }), { kind: 'allow' });
});

test('admin route exposes an injected outlet only for an authorized deterministic state', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          element={(
            <AdminRoute
              accessOverride={{ isLoggedIn: true, userRole: 'ROLE_ADMIN' }}
              outletOverride={<div data-testid="admin-route-outlet">관리자 화면</div>}
            />
          )}
        >
          <Route path="/admin" element={<div>실제 outlet</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

  assert.match(html, /data-testid="admin-route-outlet"/);
  assert.match(html, /관리자 화면/);
  assert.doesNotMatch(html, /실제 outlet/);
});

test('AppRoutes keeps the admin page behind the lazy admin guard', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => (
    readFile(new URL('./AppRoutes.tsx', import.meta.url), 'utf8')
  ));

  assert.match(source, /const AdminRoute = lazy\(\(\) => import\('\.\/AdminRoute'\)\)/);
  assert.match(source, /<Route element=\{<AdminRoute \/>\}>[\s\S]*<Route path="\/admin" element=\{<AdminPagePage \/>\} \/>/);
});
