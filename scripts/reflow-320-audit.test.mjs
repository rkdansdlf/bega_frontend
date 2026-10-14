import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { findFixture } from './reflow-320-fixtures.mjs';
import { resolveReflowBrowser } from './reflow-320-audit.mjs';

test('reflow browser selection preserves Chromium default and rejects unsupported engines', () => {
  assert.equal(resolveReflowBrowser(), 'chromium');
  assert.equal(resolveReflowBrowser('chromium'), 'chromium');
  assert.equal(resolveReflowBrowser('webkit'), 'webkit');
  assert.throws(() => resolveReflowBrowser('unknown'), /Unsupported reflow browser/);
});

import { AUTHED_ROUTES, DEFAULT_ROUTES, LOGGED_OUT_ROUTES, PUBLIC_ROUTES, activateDeferredSurfaces, evaluateKeyboard, evaluateRoute, isApiRequestUrl, isExpectedRoutePath, installOfflineBoundary, stubApi, summarize } from './reflow-320-audit.mjs';

test('API stubbing matches API paths without intercepting Vite source modules', () => {
  assert.equal(isApiRequestUrl('http://127.0.0.1:5181/api/auth/mypage'), true);
  assert.equal(isApiRequestUrl('http://127.0.0.1:5181/api'), true);
  assert.equal(isApiRequestUrl('http://127.0.0.1:5181/api/home?date=2026-09-09'), true);
  assert.equal(isApiRequestUrl('http://127.0.0.1:5181/apiary/home'), false);
  assert.equal(isApiRequestUrl('http://127.0.0.1:5181/src/api/homeCore.ts'), false);
  assert.equal(isApiRequestUrl('https://evil.example/api/home', 'http://127.0.0.1:5181'), false);
  assert.equal(isApiRequestUrl('http://127.0.0.1:5181/api/home', 'http://127.0.0.1:5181'), true);
});

test('every API stub matcher stays inside the allowed origin', async () => {
  const matchers = [];
  const context = {
    route: async (matcher) => {
      matchers.push(matcher);
    },
  };
  await stubApi(context, { allowedOrigin: 'http://127.0.0.1:5181' });
  assert.equal(matchers.length, 3);
  for (const matcher of matchers) {
    assert.equal(matcher('https://evil.example/api/home'), false);
    assert.equal(matcher('http://127.0.0.1:5181/src/api/homeCore.ts'), false);
  }
  assert.equal(matchers[0]('http://127.0.0.1:5181/api/home?date=2026-09-09'), true);
  assert.equal(matchers[1]('http://127.0.0.1:5181/api/home?date=2026-09-09'), true);
  assert.equal(matchers[2]('http://127.0.0.1:5181/api/auth/mypage'), true);
  assert.equal(matchers[2]('http://127.0.0.1:5181/api/other'), false);
});

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

test('loading placeholders are untrusted, never a substitute for loaded UI', () => {
  const loading = evaluateRoute({
    route: '/home', viewportWidth: 320, scrollWidthNormal: 320, scrollWidthZoomed: 626, skeletonCount: 5,
  });
  assert.equal(loading.measuredState, 'loading');
  assert.equal(loading.status, 'untrusted');
  assert.match(loading.reason, /loading placeholders/);

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

test('offline production audit fulfills cross-origin API profiles with credentialed CORS', async () => {
  const handlers = [];
  let websocketHandler;
  const context = {
    route: async (matcher, handler) => handlers.push({ matcher, handler }),
    routeWebSocket: async (_matcher, handler) => { websocketHandler = handler; },
  };
  await installOfflineBoundary(context, 'http://127.0.0.1:5186');
  await stubApi(context, { pageOrigin: 'http://127.0.0.1:5186' });
  const requestUrl = new URL('https://api.example/api/auth/mypage');
  const profile = handlers.findLast(({ matcher }) => matcher(requestUrl));
  let fulfilled;
  await profile.handler({ fulfill: async (response) => { fulfilled = response; } });
  assert.equal(fulfilled.status, 200);
  assert.equal(JSON.parse(fulfilled.body).data.email, 'test@example.com');
  assert.equal(fulfilled.headers['access-control-allow-origin'], 'http://127.0.0.1:5186');
  assert.equal(fulfilled.headers['access-control-allow-credentials'], 'true');
  assert.equal(handlers[0].matcher(new URL('https://external.example/image.png')), true);
  assert.equal(handlers[0].matcher(new URL('http://127.0.0.1:5186/assets/app.js')), false);
  let aborted;
  await handlers[0].handler({ abort: async (reason) => { aborted = reason; } });
  assert.equal(aborted, 'blockedbyclient');
  let socketClosed = false;
  websocketHandler({ close: () => { socketClosed = true; } });
  assert.equal(socketClosed, true);
  assert.equal(handlers.slice(1).some(({ matcher }) => matcher(new URL('http://127.0.0.1:5186/src/api/auth.ts'))), false);
});


test('route trust requires the requested pathname, including similar prefixes', () => {
  assert.equal(isExpectedRoutePath('/mate/1', '/mate/10'), false);
  assert.equal(isExpectedRoutePath('/mate/1/apply', '/mate/1'), false);
  assert.equal(isExpectedRoutePath('/mypage', '/login'), false);
  assert.equal(isExpectedRoutePath('/mypage', '/mypage'), true);
  assert.equal(isExpectedRoutePath('/', '/home'), true);
  assert.equal(isExpectedRoutePath('/', '/login'), false);
});


test('conversation route fixtures provide the bootstrap and messages contracts', () => {
  const roomUrl = 'https://api.example/api/dm/rooms';
  const messagesUrl = `${roomUrl}/1/messages`;
  const room = findFixture(roomUrl).body(roomUrl);
  const messages = findFixture(messagesUrl).body(messagesUrl);
  assert.equal(room.success, true);
  assert.equal(room.data.membershipState, 'ACTIVE');
  assert.equal(room.data.roomId, 1);
  assert.equal(messages.success, true);
  assert.equal(messages.data.length, 2);
  assert.ok(messages.data.every((message) => message.roomId === room.data.roomId));
});


test('mate list fixtures resolve the page and supplementary loading surfaces', () => {
  const url = 'http://127.0.0.1:5186/api/parties?page=0';
  const response = findFixture(url).body(url);
  assert.equal(response.last, true);
  assert.equal(response.content.length, 1);
  assert.equal(response.content[0].id, 1);
  assert.deepEqual(findFixture('http://127.0.0.1:5186/api/parties/my').body(), []);
  assert.deepEqual(findFixture('http://127.0.0.1:5186/api/parties/search-terms/popular?limit=5').body(), []);
});


test('deferred content activation visits offscreen placeholders and restores scroll', async () => {
  const positions = [0, 1200, null];
  const scrolled = [];
  const page = {
    evaluate: async (_fn, top) => {
      if (top !== undefined) { scrolled.push(top); return; }
      return positions.shift();
    },
    waitForTimeout: async () => {},
  };
  await activateDeferredSurfaces(page);
  assert.deepEqual(scrolled, [1200, 0]);
  assert.equal(positions.length, 0);
});


test('contained conversation text overflow fails even when the document fits', () => {
  const result = evaluateRoute({ route: '/messages/@testuser', viewportWidth: 320,
    scrollWidthNormal: 320, scrollWidthZoomed: 320,
    contentOverflows: [{ selector: '[data-testid="dm-message-viewport"]', normal: 80, zoomed: 120 }] });
  assert.equal(result.status, 'fail');
  assert.match(result.reason, /dm-message-viewport.*text scroll 80px/);
});
