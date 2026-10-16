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
