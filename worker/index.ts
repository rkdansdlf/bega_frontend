import {
  isKnownSpaRoute,
  isPrerenderOnlyRoute,
  isValidStadiumDetailPath,
  isStaticAssetPath,
  normalizeSpaPathname,
} from './spaRoutes';

interface AssetsBinding {
  fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
}

interface Env {
  ASSETS: AssetsBinding;
}

const CANONICAL_HOST = 'www.begabaseball.xyz';
const BARE_HOST = 'begabaseball.xyz';
const BLOCKED_PREVIEW_HOST_SUFFIX = '.pages.dev';

function shouldBlockPreviewHost(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return hostname === 'pages.dev' || hostname.endsWith(BLOCKED_PREVIEW_HOST_SUFFIX);
}

function shouldRedirectToCanonicalOrigin(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return hostname === BARE_HOST
    || (hostname === CANONICAL_HOST && url.protocol !== 'https:');
}

function buildCanonicalRedirect(url: URL): Response {
  const targetUrl = new URL(url.toString());
  targetUrl.protocol = 'https:';
  targetUrl.hostname = CANONICAL_HOST;
  return Response.redirect(targetUrl.toString(), 301);
}

function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}

function isHtmlNavigation(request: Request): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return false;
  }

  const accept = request.headers.get('accept') ?? '';
  return accept.includes('text/html');
}

function buildNotFoundResponse(request: Request): Response {
  const body = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex,nofollow" />
  <title>페이지를 찾을 수 없습니다 | BEGA</title>
  <link rel="canonical" href="https://${CANONICAL_HOST}/404" />
</head>
<body>
  <main>
    <h1>404</h1>
    <p>요청하신 페이지를 찾을 수 없습니다.</p>
    <p><a href="https://${CANONICAL_HOST}/home">홈으로 이동</a></p>
  </main>
</body>
</html>`;

  return new Response(request.method === 'HEAD' ? null : body, {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

async function serveSpaAsset(request: Request, env: Env): Promise<Response> {
  const assetResponse = await env.ASSETS.fetch(request);
  if (assetResponse.status !== 404 || !isHtmlNavigation(request)) {
    return assetResponse;
  }

  const fallbackUrl = new URL('/index.html', request.url);
  return env.ASSETS.fetch(new Request(fallbackUrl.toString(), request));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = normalizeSpaPathname(url.pathname);

    if (shouldBlockPreviewHost(url)) {
      return new Response(null, { status: 404 });
    }

    if (shouldRedirectToCanonicalOrigin(url)) {
      return buildCanonicalRedirect(url);
    }

    if (isApiPath(pathname)) {
      return new Response(null, { status: 404 });
    }

    // Static assets: never SPA-fallback; missing files stay real 404s.
    if (isStaticAssetPath(pathname)) {
      return env.ASSETS.fetch(request);
    }

    // Soft-404 fix: unknown HTML navigations must not fall through to index.html (200).
    if (isHtmlNavigation(request) && !isKnownSpaRoute(pathname)) {
      return buildNotFoundResponse(request);
    }

    // Stadium details: only prerendered (known) ids get 200; everything else is a hard 404.
    if (isHtmlNavigation(request) && isPrerenderOnlyRoute(pathname)) {
      if (!isValidStadiumDetailPath(pathname)) {
        return buildNotFoundResponse(request);
      }
      const prerendered = await env.ASSETS.fetch(request);
      return prerendered.status === 404 ? buildNotFoundResponse(request) : prerendered;
    }

    return serveSpaAsset(request, env);
  },
};

export {
  buildCanonicalRedirect,
  buildNotFoundResponse,
  isApiPath,
  isHtmlNavigation,
  serveSpaAsset,
  shouldBlockPreviewHost,
  shouldRedirectToCanonicalOrigin,
};
