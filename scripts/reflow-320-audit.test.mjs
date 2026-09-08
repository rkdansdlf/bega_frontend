import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { AUTHED_ROUTES, DEFAULT_ROUTES, LOGGED_OUT_ROUTES, PUBLIC_ROUTES, evaluateKeyboard, evaluateRoute, summarize } from './reflow-320-audit.mjs';

test('route that fits at both text sizes passes', () => {
  const result = evaluateRoute({
    route: '/home', viewportWidth: 320, scrollWidthNormal: 320, scrollWidthZoomed: 320,
  });
  assert.equal(result.status, 'pass');
  assert.equal(result.overflowNormal, 0);
  assert.equal(result.overflowZoomed, 0);
});

test('horizontal scroll at normal text size fails', () => {
  const result = evaluateRoute({
    route: '/rank', viewportWidth: 320, scrollWidthNormal: 480, scrollWidthZoomed: 480,
  });
  assert.equal(result.status, 'fail');
  assert.match(result.reason, /160px at 100% text/);
});

test('a route that only breaks at 200% text still fails — this is the /home footer regression', () => {
  const result = evaluateRoute({
    route: '/home', viewportWidth: 320, scrollWidthNormal: 320, scrollWidthZoomed: 499,
  });
  assert.equal(result.status, 'fail');
  assert.match(result.reason, /179px at 200% text/);
  assert.doesNotMatch(result.reason, /100% text/);
});

test('a collapsed viewport is reported as untrusted, never as a pass or a phantom failure', () => {
  const result = evaluateRoute({
    route: '/cheer', viewportWidth: 0, scrollWidthNormal: 260, scrollWidthZoomed: 260,
  });
  assert.equal(result.status, 'untrusted');
  assert.match(result.reason, /viewport collapsed/);
  assert.equal(result.overflowNormal, undefined);
});

test('summary treats an unmeasurable route as not ok, so a broken run cannot look green', () => {
  const summary = summarize([
    { status: 'pass' }, { status: 'pass' }, { status: 'untrusted' },
  ]);
  assert.equal(summary.ok, false);
  assert.deepEqual(summary.counts, { pass: 2, fail: 0, untrusted: 1 });
});

test('summary is ok only when every route passes', () => {
  assert.equal(summarize([{ status: 'pass' }, { status: 'pass' }]).ok, true);
  assert.equal(summarize([{ status: 'pass' }, { status: 'fail' }]).ok, false);
});

test('a failure measured on skeletons is labelled, so it is not mistaken for the loaded UI', () => {
  const loading = evaluateRoute({
    route: '/home', viewportWidth: 320, scrollWidthNormal: 320, scrollWidthZoomed: 626, skeletonCount: 5,
  });
  assert.equal(loading.measuredState, 'loading');
  assert.match(loading.reason, /measured while still loading/);

  const loaded = evaluateRoute({
    route: '/home', viewportWidth: 320, scrollWidthNormal: 320, scrollWidthZoomed: 626, skeletonCount: 0,
  });
  assert.equal(loaded.measuredState, 'loaded');
  assert.doesNotMatch(loaded.reason, /still loading/);
});

test('the default route list covers both the public and the protected surface', () => {
  assert.ok(DEFAULT_ROUTES.includes('/home'));
  assert.ok(DEFAULT_ROUTES.includes('/cheer'));
  assert.ok(DEFAULT_ROUTES.includes('/mypage'));
  assert.ok(DEFAULT_ROUTES.includes('/admin'));
  assert.equal(new Set(DEFAULT_ROUTES).size, DEFAULT_ROUTES.length, 'no duplicate routes');
});

test('a submit reachable above the keyboard line passes', () => {
  const r = evaluateKeyboard({
    route: '/login', name: 'k', found: true, submitBottom: 300, keyboardTop: 360, submitFixed: false,
  });
  assert.equal(r.status, 'pass');
});

test('a submit pinned to the bottom fails — the keyboard would sit on top of it', () => {
  const r = evaluateKeyboard({
    route: '/login', name: 'k', found: true, submitBottom: 300, keyboardTop: 360, submitFixed: true,
  });
  assert.equal(r.status, 'fail');
  assert.match(r.reason, /position:fixed/);
});

test('a submit that stays below the keyboard line after scrolling fails', () => {
  const r = evaluateKeyboard({
    route: '/signup', name: 'k', found: true, submitBottom: 700, keyboardTop: 360, submitFixed: false,
  });
  assert.equal(r.status, 'fail');
  assert.match(r.reason, /below the ~360px keyboard line/);
});

test('routes that must be visited logged out are all inside the public list', () => {
  for (const route of LOGGED_OUT_ROUTES) {
    assert.ok(PUBLIC_ROUTES.includes(route), `${route} must be audited, not just excluded`);
    assert.ok(!AUTHED_ROUTES.includes(route), `${route} would be redirected away by a session`);
  }
});

test('every route in AppRoutes.tsx is either audited or explicitly excluded', () => {
  const source = readFileSync(new URL('../src/components/AppRoutes.tsx', import.meta.url), 'utf8');
  const declared = [...source.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);

  // Not auditable, with the reason each is out of scope.
  const EXCLUDED = new Set([
    '*',                                  // covered as the 404 catch-all by hand
    '/oauth/callback',                    // redirect-only, renders no UI
    '/password/reset/confirm',            // needs a live token
    '/account/deletion/recovery',         // needs a live recovery link
    '/mypage/:handle',                    // redirects to /profile/:handle
    '/test/error',                        // dev-only error harness
    '/internal/sajik-seatmap-editor',     // dev-only internal tool
    '/internal/gwangju-seatmap-editor',   // dev-only internal tool
    '/internal/module-federation-design-system',
  ]);

  // Compare on the pattern, since the audit fills in concrete ids.
  // Order matters: the specific ids have to be collapsed before the generic
  // digit rule, or it eats their leading digits and mangles the pattern.
  const auditedPatterns = new Set(DEFAULT_ROUTES.map((r) => r
    .replace(/\/20\d{6}[A-Z]+\d/g, '/:gameId')
    .replace(/\/abc\/2026/, '/:shareId/:seasonYear')
    .replace(/\/@[^/]+/g, '/:handle')
    .replace(/\/\d+/g, '/:id')));

  const missing = declared.filter((p) => {
    if (EXCLUDED.has(p)) return false;
    const normalized = p.replace(/:[a-zA-Z]+/g, (m) => m);
    return !auditedPatterns.has(normalized)
      && !auditedPatterns.has(normalized.replace(/:postId|:id/g, ':id'))
      && !auditedPatterns.has(normalized.replace(/:handle/g, ':handle'));
  });

  assert.deepEqual(missing, [], `new route(s) added without gate coverage: ${missing.join(', ')}`);
});

test('public and protected route lists stay disjoint', () => {
  const overlap = PUBLIC_ROUTES.filter((r) => AUTHED_ROUTES.includes(r));
  assert.deepEqual(overlap, [], 'a route listed as both would be auth-checked on a page that needs no session');
});
