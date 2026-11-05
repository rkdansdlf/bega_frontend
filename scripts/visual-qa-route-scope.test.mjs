import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { assertCurrentSessionModels, buildRouteScopeReport, extractRouteDeclarations } from './visual-qa-route-scope.mjs';

test('AST inventory ignores comments and reads literal JSX paths', () => {
  const routes = extractRouteDeclarations(`// <Route path="/fake" />
    const view = <Routes><Route path={'/real'} element={<Page />} /></Routes>;`);
  assert.deepEqual(routes.map((route) => route.path), ['/real']);
  assert.equal(routes[0].component, 'Page');
});

test('wrapper guards are inherited without mistaking authenticated chrome for protection', () => {
  const routes = extractRouteDeclarations(`const view = <Routes>
    <Route element={<Layout authenticated={true} />}>
      <Route path="/public" element={<Page />} />
      <Route element={<ProtectedRoute />}><Route path="/private" element={<Page />} /></Route>
      <Route element={<AdminRoute />}><Route path="/admin" element={<Page />} /></Route>
    </Route>
    <Route element={<PublicOnlyAuthRoute />}><Route path="/login" element={<Login />} /></Route>
  </Routes>;`);
  assert.deepEqual(routes.map((route) => [route.path, route.access]), [
    ['/public', 'public'], ['/private', 'protected'], ['/admin', 'admin'], ['/login', 'public-only-auth'],
  ]);
});

test('relative nested paths compose and computed paths fail instead of disappearing', () => {
  const routes = extractRouteDeclarations('const view = <Route path="/parent"><Route path="child/:id" /></Route>;');
  assert.deepEqual(routes.map((route) => route.path), ['/parent', '/parent/child/:id']);
  assert.throws(() => extractRouteDeclarations('const view = <Route path={unknownPath} />;'), /non-literal route path/);
});

test('index routes fail closed until an explicit inventory contract exists', () => {
  assert.throws(() => extractRouteDeclarations('const view = <Route index element={<Page />} />;'), /index route/);
});

test('real route matching gives static paths precedence over parameters', () => {
  const declarations = extractRouteDeclarations(`const view = <Routes>
    <Route path="/cheer/:postId" /><Route element={<ProtectedRoute />}><Route path="/cheer/bookmarks" /></Route>
    <Route path="*" />
  </Routes>;`);
  const report = buildRouteScopeReport({ declarations, samples: ['/cheer/bookmarks', '/cheer/1', '/missing'],
    authedSamples: ['/cheer/bookmarks'], loggedOutSamples: [] });
  assert.deepEqual(report.samples.map((sample) => sample.routePattern), ['/cheer/bookmarks', '/cheer/:postId', '*']);
  assert.deepEqual(report.missingPatterns, []);
  assert.equal(report.visualAcceptance, 'UNVERIFIED');
});

test('query-bearing guest input exposes the existing pathname/raw-list selection mismatch', () => {
  const declarations = extractRouteDeclarations('const view = <Route path="/oauth/callback" />;');
  const sample = '/oauth/callback?state=visual-qa';
  const report = buildRouteScopeReport({ declarations, samples: [sample], authedSamples: [], loggedOutSamples: [sample] });
  assert.equal(report.samples[0].reflowSession, 'guest');
  assert.equal(report.samples[0].visualQaSession, 'synthetic-authenticated');
  assert.deepEqual(report.guestSelectionMismatches.map((entry) => entry.url), [sample]);
  assert.deepEqual(report.genericGuestMissingPatterns, ['/oauth/callback']);
});

test('public routes in the authed input cohort are not relabelled protected', () => {
  const declarations = extractRouteDeclarations('const view = <Route path="/profile/:handle" />;');
  const report = buildRouteScopeReport({ declarations, samples: ['/profile/@synthetic'],
    authedSamples: ['/profile/@synthetic'], loggedOutSamples: [] });
  assert.equal(report.routes[0].access, 'public');
  assert.equal(report.publicInAuthedCohort.length, 1);
});

test('root scope distinguishes authenticated reflow from guest visual-QA selection', () => {
  const declarations = extractRouteDeclarations('const view = <Route path="/" element={<RootEntryRoute />} />;');
  const report = buildRouteScopeReport({ declarations, samples: ['/'], authedSamples: [], loggedOutSamples: [] });
  assert.equal(report.samples[0].reflowSession, 'synthetic-authenticated');
  assert.equal(report.samples[0].visualQaSession, 'guest');
  assert.equal(report.visualAcceptance, 'UNVERIFIED');
});

test('exact internal exclusions cannot swallow a newly added adjacent route', () => {
  const declarations = extractRouteDeclarations(`const view = <Routes>
    {import.meta.env.DEV && <Route path="/test/error" />}
    <Route path="/test/error/public" />
  </Routes>;`);
  const report = buildRouteScopeReport({ declarations, samples: [], authedSamples: [], loggedOutSamples: [] });
  assert.equal(report.excluded.length, 1);
  assert.match(report.excluded[0].conditions[0], /import.meta.env.DEV/);
  assert.deepEqual(report.missingPatterns, ['/test/error/public']);
});

test('current AppRoutes declarations all have a representative or exact documented exclusion', async () => {
  const source = await readFile(new URL('../src/components/AppRoutes.tsx', import.meta.url), 'utf8');
  const report = buildRouteScopeReport({ declarations: extractRouteDeclarations(source) });
  assert.deepEqual(report.missingPatterns, []);
  assert.deepEqual(report.unmatchedSamples, []);
  assert.equal(report.routes.find((route) => route.path === '/cheer/bookmarks').access, 'protected');
  assert.equal(report.routes.find((route) => route.path === '/predictions/ranking/share/:shareId/:seasonYear').access, 'public');
  assert.equal(report.excluded.find((route) => route.path === '/internal/module-federation-design-system').reason,
    'conditional internal probe; may exist in a production build with explicit federation entry');
  assert.equal(report.visualAcceptance, 'UNVERIFIED');
});

test('session source model accepts current selectors and fails closed when either changes', async () => {
  const reflowSource = await readFile(new URL('./reflow-320-audit.mjs', import.meta.url), 'utf8');
  const visualSource = await readFile(new URL('./visual-qa-audit.mjs', import.meta.url), 'utf8');
  assert.doesNotThrow(() => assertCurrentSessionModels({ reflowSource, visualSource }));
  assert.throws(() => assertCurrentSessionModels({ reflowSource: reflowSource.replace('const needsLoggedOut =', 'const renamed ='), visualSource }), /selector changed/);
  assert.throws(() => assertCurrentSessionModels({ reflowSource, visualSource: visualSource.replace('const loggedOut =', 'const renamed =') }), /selector changed/);
});
