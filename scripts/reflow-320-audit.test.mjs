import assert from 'node:assert/strict';
import test from 'node:test';

import { AUTHED_ROUTES, DEFAULT_ROUTES, PUBLIC_ROUTES, evaluateRoute, summarize } from './reflow-320-audit.mjs';

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

test('public and protected route lists stay disjoint', () => {
  const overlap = PUBLIC_ROUTES.filter((r) => AUTHED_ROUTES.includes(r));
  assert.deepEqual(overlap, [], 'a route listed as both would be auth-checked on a page that needs no session');
});
