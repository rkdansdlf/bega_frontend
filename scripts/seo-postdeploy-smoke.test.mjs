import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  escapeHtml,
  indexableRoutes,
  siteUrl,
} from './seo-policy.mjs';
import { buildSeoHeadMarkup } from './prerender-seo.mjs';
import {
  describeHttpStatusFailure,
  isRedirectToExpectedCanonical,
  resolveRedirectLocation,
  summarizeHtmlContract,
  validatePrerenderedHtmlContract,
} from './seo-postdeploy-smoke.mjs';

const route = indexableRoutes.find((entry) => entry.path === '/cheer');
const homeRoute = indexableRoutes.find((entry) => entry.path === '/');

const buildHtml = (
  routeConfig,
  siteVerification = { googleSiteVerification: '', naverSiteVerification: '' },
) => [
  '<!DOCTYPE html>',
  '<html lang="ko">',
  '<head>',
  `<title>${escapeHtml(routeConfig.title)}</title>`,
  buildSeoHeadMarkup(routeConfig, siteVerification),
  '</head>',
  '<body>',
  '<div id="root">',
  '<main data-seo-prerender="true">',
  `<h1>${escapeHtml(routeConfig.heading)}</h1>`,
  `<p>${escapeHtml(routeConfig.description)}</p>`,
  '</main>',
  '</div>',
  '</body>',
  '</html>',
].join('\n');

test('postdeploy smoke accepts exact prerendered HTML contract', () => {
  const siteVerification = {
    googleSiteVerification: 'google-token<&"\'',
    naverSiteVerification: 'naver-token',
  };
  const html = buildHtml(route, siteVerification);

  assert.deepEqual(
    validatePrerenderedHtmlContract(html, route, {
      expectedSiteUrl: siteUrl,
      ...siteVerification,
    }),
    [],
  );
});

test('postdeploy smoke report summary exposes observed static SEO contract values', () => {
  const html = buildHtml(route);

  assert.deepEqual(summarizeHtmlContract(html), {
    title: route.title,
    description: route.description,
    robots: 'index,follow',
    canonical: `${siteUrl}${route.path}`,
    h1: route.heading,
    jsonLdCount: 1,
    hasPrerenderMarker: true,
  });
});

test('postdeploy smoke rejects generic tags with wrong route policy values', () => {
  const html = buildHtml(route)
    .replace(
      `<title>${escapeHtml(route.title)}</title>`,
      '<title>Wrong but present</title>',
    )
    .replace(
      `<meta name="description" content="${escapeHtml(route.description)}">`,
      '<meta name="description" content="Wrong but present">',
    );

  const failures = validatePrerenderedHtmlContract(html, route, {
    expectedSiteUrl: siteUrl,
  });

  assert.ok(failures.some((failure) => failure.includes('title 값 불일치')));
  assert.ok(failures.some((failure) => failure.includes('description 값 불일치')));
});

test('postdeploy smoke reports redirect responses as SEO failures', () => {
  const response = Response.redirect('https://www.begabaseball.xyz/home/', 307);

  assert.equal(
    describeHttpStatusFailure(response),
    'HTTP 307 redirect location=https://www.begabaseball.xyz/home/',
  );
});

test('postdeploy smoke accepts alias redirects only when they point at the expected canonical URL', () => {
  const candidateUrl = 'https://www.begabaseball.xyz/home/';
  const canonicalUrl = 'https://www.begabaseball.xyz/home';
  const canonicalRedirect = Response.redirect(canonicalUrl, 301);
  const nonCanonicalRedirect = Response.redirect('https://www.begabaseball.xyz/other', 301);

  assert.equal(resolveRedirectLocation(candidateUrl, '/home'), canonicalUrl);
  assert.equal(isRedirectToExpectedCanonical(canonicalRedirect, candidateUrl, canonicalUrl), true);
  assert.equal(isRedirectToExpectedCanonical(nonCanonicalRedirect, candidateUrl, canonicalUrl), false);
});

test('postdeploy smoke rejects duplicate singleton SEO tags', () => {
  const html = buildHtml(route).replace(
    '</head>',
    `<meta name="description" content="${escapeHtml(route.description)}">\n</head>`,
  );

  const failures = validatePrerenderedHtmlContract(html, route, {
    expectedSiteUrl: siteUrl,
  });

  assert.ok(failures.some((failure) => failure.includes('description 태그 수 불일치')));
});

test('postdeploy smoke rejects missing prerender marker and wrong JSON-LD shape', () => {
  const html = buildHtml(homeRoute)
    .replace('data-seo-prerender="true"', 'data-seo-prerender="false"')
    .replace(
      /<script type="application\/ld\+json" data-seo-jsonld="0">[\s\S]*?<\/script>/,
      '<script type="application/ld+json" data-seo-jsonld="0">{"@type":"Thing"}</script>',
    );

  const failures = validatePrerenderedHtmlContract(html, homeRoute, {
    expectedSiteUrl: siteUrl,
  });

  assert.ok(failures.some((failure) => failure.includes('SEO 프리렌더 본문 마커 누락')));
  assert.ok(failures.some((failure) => failure.includes('JSON-LD[0] 값 불일치')));
});

test('sitemap classification accepts prerendered stadium detail URLs but still flags unexpected URLs', async () => {
  const { classifySitemapUrls } = await import('./seo-postdeploy-smoke.mjs');
  const site = 'https://www.begabaseball.xyz';
  const expectedStaticUrls = [`${site}/stadium`, `${site}/cheer`];
  const result = classifySitemapUrls([
    `${site}/stadium`,
    `${site}/stadium/JAMSIL`,
    `${site}/stadium/JAMSIL_TEMP`,
    `${site}/stadium/MOKDONG`,
    `${site}/stadium/a%20b`,
    `${site}/stadium/x/y`,
    `${site}/random`,
    'https://begabaseball.xyz/stadium/SAJIK',
  ], { expectedStaticUrls, expectedSiteUrl: site });
  assert.deepEqual(result.missing, [`${site}/cheer`]);
  assert.deepEqual(result.stadiumDetailPaths, ['/stadium/JAMSIL', '/stadium/JAMSIL_TEMP', '/stadium/MOKDONG']);
  assert.deepEqual(result.unexpected, [
    `${site}/stadium/a%20b`,
    `${site}/stadium/x/y`,
    `${site}/random`,
    'https://begabaseball.xyz/stadium/SAJIK',
  ]);
});

test('SEO_MIN_STADIUM_COUNT gate for sitemap stadium details', async () => {
  const { resolveMinStadiumDetailCount } = await import('./seo-postdeploy-smoke.mjs');
  assert.equal(resolveMinStadiumDetailCount({}), 0);
  assert.equal(resolveMinStadiumDetailCount({ SEO_MIN_STADIUM_COUNT: '22' }), 22);
  assert.equal(resolveMinStadiumDetailCount({ SEO_MIN_STADIUM_COUNT: 'x' }), 0);
});

test('stadium detail response contract: 200 html + single www canonical + index,follow', async () => {
  const { validateStadiumDetailResponse } = await import('./seo-postdeploy-smoke.mjs');
  const site = 'https://www.begabaseball.xyz';
  const good = `<link rel="canonical" href="${site}/stadium/JAMSIL">\n<meta name="robots" content="index,follow">`;
  assert.deepEqual(validateStadiumDetailResponse({ status: 200, contentType: 'text/html; charset=utf-8', html: good }, '/stadium/JAMSIL', site), []);
  assert.deepEqual(validateStadiumDetailResponse({ status: 404, contentType: 'text/html', html: '' }, '/stadium/JAMSIL', site), ['HTTP 404']);
  const wrongCanonical = good.replace(`${site}/stadium/JAMSIL`, 'https://begabaseball.xyz/stadium/JAMSIL');
  assert.equal(validateStadiumDetailResponse({ status: 200, contentType: 'text/html', html: wrongCanonical }, '/stadium/JAMSIL', site).length, 1);
  const noindex = good.replace('index,follow', 'noindex,nofollow');
  assert.match(validateStadiumDetailResponse({ status: 200, contentType: 'text/html', html: noindex }, '/stadium/JAMSIL', site)[0], /robots/);
  assert.match(validateStadiumDetailResponse({ status: 200, contentType: 'application/json', html: good }, '/stadium/JAMSIL', site)[0], /content-type/);
});
