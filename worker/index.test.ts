import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import worker, {
  buildCanonicalRedirect,
  isApiPath,
  isHtmlNavigation,
  shouldBlockPreviewHost,
  shouldRedirectToCanonicalOrigin,
} from './index';
import { isKnownSpaRoute, isStaticAssetPath } from './spaRoutes';

const readWranglerConfig = () => JSON.parse(
  readFileSync('wrangler.jsonc', 'utf-8').replace(/^\s*\/\/.*$/gm, ''),
);

test('redirects bare domain to canonical www host with path and query intact', async () => {
  const response = buildCanonicalRedirect(new URL('http://begabaseball.xyz/auth/callback?code=123'));

  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://www.begabaseball.xyz/auth/callback?code=123');
});

test('redirects every non-canonical production origin to www HTTPS', () => {
  assert.equal(shouldRedirectToCanonicalOrigin(new URL('http://begabaseball.xyz')), true);
  assert.equal(shouldRedirectToCanonicalOrigin(new URL('https://begabaseball.xyz')), true);
  assert.equal(shouldRedirectToCanonicalOrigin(new URL('http://www.begabaseball.xyz')), true);
  assert.equal(shouldRedirectToCanonicalOrigin(new URL('https://www.begabaseball.xyz')), false);
});

test('identifies api paths that should not fall through to the SPA', () => {
  assert.equal(isApiPath('/api'), true);
  assert.equal(isApiPath('/api/auth/login'), true);
  assert.equal(isApiPath('/apis'), false);
  assert.equal(isApiPath('/auth/login'), false);
});

test('treats html accept headers as SPA navigations only for get or head requests', () => {
  assert.equal(isHtmlNavigation(new Request('https://www.begabaseball.xyz/home', {
    headers: { accept: 'text/html,application/xhtml+xml' },
  })), true);

  assert.equal(isHtmlNavigation(new Request('https://www.begabaseball.xyz/home', {
    method: 'POST',
    headers: { accept: 'text/html,application/xhtml+xml' },
  })), false);

  assert.equal(isHtmlNavigation(new Request('https://www.begabaseball.xyz/assets/app.js', {
    headers: { accept: '*/*' },
  })), false);
});

test('Cloudflare assets disable SPA not_found_handling so the worker owns soft-404 policy', () => {
  const wranglerConfig = readWranglerConfig();

  assert.equal(wranglerConfig.assets.html_handling, 'drop-trailing-slash');
  assert.equal(wranglerConfig.assets.not_found_handling, 'none');
  assert.equal(wranglerConfig.assets.run_worker_first, true);
});

test('blocks pages.dev preview hosts in production routing', () => {
  assert.equal(shouldBlockPreviewHost(new URL('https://preview.begabaseball.pages.dev')), true);
  assert.equal(shouldBlockPreviewHost(new URL('https://www.begabaseball.xyz')), false);
});

test('known SPA routes include static pages and stadium detail paths', () => {
  assert.equal(isKnownSpaRoute('/home'), true);
  assert.equal(isKnownSpaRoute('/stadium'), true);
  assert.equal(isKnownSpaRoute('/stadium/JAMSIL'), true);
  assert.equal(isKnownSpaRoute('/mate/abc/chat'), true);
  assert.equal(isKnownSpaRoute('/this-does-not-exist-xyz'), false);
  assert.equal(isKnownSpaRoute('/totally/missing/route'), false);
});

test('static asset paths are detected by file extension', () => {
  assert.equal(isStaticAssetPath('/assets/index-abc.js'), true);
  assert.equal(isStaticAssetPath('/sitemap.xml'), true);
  assert.equal(isStaticAssetPath('/home'), false);
  assert.equal(isStaticAssetPath('/stadium/JAMSIL'), false);
});

test('worker redirects bare-domain requests before touching assets', async () => {
  let assetFetchCount = 0;

  const response = await worker.fetch(
    new Request('https://begabaseball.xyz/mypage?view=accountSettings'),
    {
      ASSETS: {
        fetch: async () => {
          assetFetchCount += 1;
          return new Response('unexpected');
        },
      },
    },
  );

  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://www.begabaseball.xyz/mypage?view=accountSettings');
  assert.equal(assetFetchCount, 0);
});

test('worker upgrades canonical host HTTP requests before touching assets', async () => {
  let assetFetchCount = 0;

  const response = await worker.fetch(
    new Request('http://www.begabaseball.xyz/home?source=legacy'),
    {
      ASSETS: {
        fetch: async () => {
          assetFetchCount += 1;
          return new Response('unexpected');
        },
      },
    },
  );

  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://www.begabaseball.xyz/home?source=legacy');
  assert.equal(assetFetchCount, 0);
});

test('worker returns 404 for pages.dev preview hosts before touching assets', async () => {
  let assetFetchCount = 0;

  const response = await worker.fetch(
    new Request('https://preview.begabaseball.pages.dev/mypage'),
    {
      ASSETS: {
        fetch: async () => {
          assetFetchCount += 1;
          return new Response('unexpected');
        },
      },
    },
  );

  assert.equal(response.status, 404);
  assert.equal(assetFetchCount, 0);
});

test('worker returns 404 for api paths on the frontend host', async () => {
  const response = await worker.fetch(
    new Request('https://www.begabaseball.xyz/api/auth/login'),
    {
      ASSETS: {
        fetch: async () => new Response('unexpected'),
      },
    },
  );

  assert.equal(response.status, 404);
});

test('worker delegates indexable no-slash SEO routes to the asset binding unchanged', async () => {
  const seenUrls: string[] = [];

  const response = await worker.fetch(
    new Request('https://www.begabaseball.xyz/home', {
      headers: { accept: 'text/html,application/xhtml+xml' },
    }),
    {
      ASSETS: {
        fetch: async (input) => {
          const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
          seenUrls.push(url);

          if (url === 'https://www.begabaseball.xyz/home') {
            return new Response('<html><title>home</title></html>', {
              status: 200,
              headers: { 'content-type': 'text/html' },
            });
          }

          return new Response('unexpected', { status: 500 });
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('location'), null);
  assert.deepEqual(seenUrls, [
    'https://www.begabaseball.xyz/home',
  ]);
});

test('worker falls back to index.html for known SPA routes missing a static asset', async () => {
  const seenUrls: string[] = [];

  const response = await worker.fetch(
    new Request('https://www.begabaseball.xyz/mypage', {
      headers: { accept: 'text/html,application/xhtml+xml' },
    }),
    {
      ASSETS: {
        fetch: async (input) => {
          const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
          seenUrls.push(url);

          if (url.endsWith('/index.html')) {
            return new Response('<html>ok</html>', {
              status: 200,
              headers: { 'content-type': 'text/html' },
            });
          }

          return new Response('missing', { status: 404 });
        },
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(seenUrls, [
    'https://www.begabaseball.xyz/mypage',
    'https://www.begabaseball.xyz/index.html',
  ]);
});

test('worker returns HTTP 404 for unknown HTML routes (soft-404 fix)', async () => {
  let assetFetchCount = 0;

  const response = await worker.fetch(
    new Request('https://www.begabaseball.xyz/this-does-not-exist-xyz', {
      headers: { accept: 'text/html,application/xhtml+xml' },
    }),
    {
      ASSETS: {
        fetch: async () => {
          assetFetchCount += 1;
          return new Response('unexpected', { status: 200 });
        },
      },
    },
  );

  assert.equal(response.status, 404);
  assert.equal(assetFetchCount, 0);
  const body = await response.text();
  assert.match(body, /페이지를 찾을 수 없습니다/);
  assert.match(body, /noindex,nofollow/);
});

test('worker does not SPA-fallback missing static assets', async () => {
  const seenUrls: string[] = [];

  const response = await worker.fetch(
    new Request('https://www.begabaseball.xyz/assets/missing-chunk.js', {
      headers: { accept: '*/*' },
    }),
    {
      ASSETS: {
        fetch: async (input) => {
          const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
          seenUrls.push(url);
          return new Response('missing', { status: 404 });
        },
      },
    },
  );

  assert.equal(response.status, 404);
  assert.deepEqual(seenUrls, [
    'https://www.begabaseball.xyz/assets/missing-chunk.js',
  ]);
});

const htmlNav = (path: string) => new Request(`https://www.begabaseball.xyz${path}`, {
  headers: { accept: 'text/html,application/xhtml+xml' },
});

test('worker serves prerendered stadium detail pages with 200', async () => {
  const seen: string[] = [];
  const response = await worker.fetch(htmlNav('/stadium/JAMSIL'), {
    ASSETS: {
      fetch: async (input) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        seen.push(url);
        return new Response('<html>jamsil</html>', { status: 200 });
      },
    },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(seen, ['https://www.begabaseball.xyz/stadium/JAMSIL']);
});

test('worker returns 404 (no SPA fallback) for non-prerendered stadium ids', async () => {
  const seen: string[] = [];
  const response = await worker.fetch(htmlNav('/stadium/fake-id'), {
    ASSETS: {
      fetch: async (input) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        seen.push(url);
        return url.endsWith('/index.html')
          ? new Response('<html>shell</html>', { status: 200 })
          : new Response('missing', { status: 404 });
      },
    },
  });
  assert.equal(response.status, 404);
  assert.match(await response.text(), /noindex,nofollow/);
  assert.deepEqual(seen, ['https://www.begabaseball.xyz/stadium/fake-id']);
});

test('worker returns 404 for malformed stadium ids without touching assets', async () => {
  let calls = 0;
  const response = await worker.fetch(htmlNav('/stadium/a%20b'), {
    ASSETS: { fetch: async () => { calls += 1; return new Response('x', { status: 200 }); } },
  });
  assert.equal(response.status, 404);
  assert.equal(calls, 0);
});

test('worker spaRoutes stay in sync with AppRoutes', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const appRoutesSource = readFileSync(
    fileURLToPath(new URL('../src/components/AppRoutes.tsx', import.meta.url)),
    'utf-8',
  );
  const appPaths = [...appRoutesSource.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((p) => p !== '*');
  // Dev/editor-only routes are intentionally not served by the production worker.
  const DEV_ONLY = new Set(['/test/error', '/internal/sajik-seatmap-editor', '/internal/gwangju-seatmap-editor']);
  assert.ok(appPaths.length > 10, 'expected to parse AppRoutes paths');

  const toSample = (p: string) => p.replace(/:[A-Za-z]+/g, 'sample1').replace(/\/\*$/, '/sample1');
  for (const appPath of appPaths.filter((p) => !DEV_ONLY.has(p))) {
    assert.equal(isKnownSpaRoute(toSample(appPath)), true, `AppRoutes path not allowed by worker: ${appPath}`);
  }

  const { EXACT_SPA_ROUTES, SPA_ROUTE_PATTERNS } = await import('./spaRoutes');
  const samples = new Set(appPaths.map(toSample));
  for (const exact of EXACT_SPA_ROUTES) {
    assert.ok(samples.has(exact), `worker exact route missing from AppRoutes: ${exact}`);
  }
  for (const pattern of SPA_ROUTE_PATTERNS) {
    assert.ok([...samples].some((s) => pattern.test(s)), `worker pattern has no AppRoutes match: ${pattern}`);
  }
  assert.equal(isKnownSpaRoute('/payment'), false);
});
