/**
 * Known SPA route matcher for the Cloudflare Worker.
 * Keep in sync with src/components/AppRoutes.tsx — unknown HTML navigations must 404.
 */

const EXACT_SPA_ROUTES = new Set([
  '/',
  '/login',
  '/signup',
  '/password/reset',
  '/password/reset/confirm',
  '/account/deletion/recovery',
  '/oauth/callback',
  '/oauth/email/confirm',
  '/home',
  '/prediction',
  '/mate',
  '/offseason',
  '/offseason/list',
  '/cheer',
  '/cheer/write',
  '/cheer/bookmarks',
  '/notice',
  '/terms',
  '/privacy',
  '/leaderboard',
  '/stadium',
  '/mate/create',
  '/mypage',
  '/messages',
  '/admin',
  '/internal/module-federation-design-system',
]);

const SPA_ROUTE_PATTERNS: RegExp[] = [
  /^\/prediction\/matches\/[^/]+$/,
  /^\/cheer\/[^/]+$/,
  /^\/cheer\/edit\/[^/]+$/,
  /^\/profile\/[^/]+$/,
  /^\/mypage\/[^/]+$/,
  /^\/predictions\/ranking\/share\/[^/]+\/[^/]+$/,
  /^\/mate\/[^/]+$/,
  /^\/mate\/[^/]+\/(?:apply|checkin|chat|manage)$/,
  /^\/messages\/[^/]+$/,
  /^\/stadium\/[^/]+$/,
  /^\/payment(?:\/.*)?$/,
];

export function normalizeSpaPathname(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }
  const pathOnly = pathname.split('?')[0].split('#')[0];
  if (!pathOnly || pathOnly === '/') {
    return '/';
  }
  return pathOnly.endsWith('/') ? pathOnly.slice(0, -1) : pathOnly;
}

/** Paths that look like static files (have an extension) — never SPA-fallback. */
export function isStaticAssetPath(pathname: string): boolean {
  const normalized = normalizeSpaPathname(pathname);
  const lastSegment = normalized.split('/').pop() || '';
  return /\.[a-zA-Z0-9]{1,12}$/.test(lastSegment);
}

export function isKnownSpaRoute(pathname: string): boolean {
  const normalized = normalizeSpaPathname(pathname);
  if (EXACT_SPA_ROUTES.has(normalized)) {
    return true;
  }
  return SPA_ROUTE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export { EXACT_SPA_ROUTES, SPA_ROUTE_PATTERNS };
