import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalUrlForPath,
  distDir,
  ensureDir,
  escapeHtml,
  routeToOutputFile,
  siteUrl,
  defaultOgImageUrl,
} from './seo-policy.mjs';
import { createSeoRuntimeEnvReader } from './seo-runtime-env.mjs';
import {
  buildRootMarkup,
  buildSeoHeadMarkup,
  deferPerformanceShellModule,
  deferPerformanceShellStyles,
} from './prerender-seo.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const readEnvValue = createSeoRuntimeEnvReader();

const resolveApiBaseUrl = () => {
  const fromEnv = (
    process.env.SITEMAP_API_BASE_URL
    || process.env.BACKEND_BASE_URL
    || readEnvValue('VITE_API_BASE_URL').value
    || 'https://api.begabaseball.xyz'
  ).trim().replace(/\/+$/, '');

  if (!fromEnv) {
    return 'https://api.begabaseball.xyz';
  }
  if (fromEnv === '/api') {
    return 'https://api.begabaseball.xyz';
  }
  if (fromEnv.endsWith('/api')) {
    return fromEnv.slice(0, -4);
  }
  return fromEnv;
};

const buildApiUrl = (apiBase, endpoint) => {
  const pathPart = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${apiBase}/api${pathPart}`;
};

export const fetchJson = async (url, { timeoutMs = 15000 } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'bega-frontend-seo-sitemap/1.0',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
};

const normalizeStadiumList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload && Array.isArray(payload.content)) {
    return payload.content;
  }
  return [];
};

export const fetchPublicStadiums = async (options = {}) => {
  const apiBase = resolveApiBaseUrl();
  const url = buildApiUrl(apiBase, '/stadiums');
  const payload = await fetchJson(url, options);
  return normalizeStadiumList(payload)
    .filter((item) => item && typeof item.stadiumId === 'string' && item.stadiumId.trim())
    .map((item) => ({
      stadiumId: String(item.stadiumId).trim(),
      stadiumName: String(item.stadiumName || item.stadiumId).trim(),
      team: item.team == null ? null : String(item.team),
    }));
};

// Mirror of src/utils/stadiumId.ts (kept in sync by seo-dynamic-pages.test.mjs).
export const STADIUM_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export const isSafeStadiumId = (value) => typeof value === 'string' && STADIUM_ID_PATTERN.test(value);

/**
 * Drop stadiums whose id is not a safe slug. Prevents path traversal when ids are
 * used in path.join() for prerender output and sitemap paths.
 */
export const filterSafeStadiums = (stadiums, { warn = console.warn } = {}) => stadiums.filter((stadium) => {
  if (isSafeStadiumId(stadium?.stadiumId)) {
    return true;
  }
  warn(`[seo:dynamic] skip stadium with invalid id: ${JSON.stringify(stadium?.stadiumId)}`);
  return false;
});

/** SEO_MIN_STADIUM_COUNT (default 0 = disabled): fail the build when fewer stadiums are available. */
export const resolveMinStadiumCount = (env = process.env) => {
  const raw = Number.parseInt(String(env.SEO_MIN_STADIUM_COUNT ?? '').trim(), 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
};

export const assertMinStadiumCount = (count, minCount, reason = '') => {
  if (minCount > 0 && count < minCount) {
    throw new Error(
      `[seo:dynamic] only ${count} stadium detail page(s) available, below SEO_MIN_STADIUM_COUNT=${minCount}${reason ? ` (${reason})` : ''}`,
    );
  }
};

export const buildStadiumDetailRoute = (stadium) => {
  const name = stadium.stadiumName || stadium.stadiumId;
  const teamSuffix = stadium.team ? ` (${stadium.team})` : '';
  return {
    path: `/stadium/${stadium.stadiumId}`,
    title: `${name} 구장 가이드 | BEGA`,
    description: `${name}${teamSuffix}의 좌석·주변 시설·방문 정보를 BEGA 구장 가이드에서 확인하세요.`,
    heading: `${name} 구장 가이드`,
    performanceShell: true,
    schemaType: 'page',
    changefreq: 'weekly',
    priority: '0.7',
    lastmodSource: 'stadium',
  };
};

const stripManagedSeoBlock = (html) => (
  html.replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/g, '')
);

const stripManagedRootBlock = (html) => (
  html.replace(/<!-- SEO-PRERENDER:START -->[\s\S]*?<!-- SEO-PRERENDER:END -->/g, '')
);

const injectSeoHead = (html, route) => {
  let next = stripManagedSeoBlock(html);
  next = next.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(route.title)}</title>`);
  const seoBlock = buildSeoHeadMarkup(route);
  if (/<\/head>/i.test(next)) {
    return next.replace(/<\/head>/i, `${seoBlock}\n</head>`);
  }
  throw new Error(`[seo:dynamic] missing </head> while prerendering ${route.path}`);
};

const injectSeoRoot = (html, route) => {
  const rootMarkup = buildRootMarkup(route);
  let next = stripManagedRootBlock(html);
  if (next.includes('<div id="root"></div>')) {
    return next.replace('<div id="root"></div>', `<div id="root">${rootMarkup}</div>`);
  }
  const rootTagRegex = /(<div\s+id=(['"])root\2[^>]*>)[\s\S]*?(<\/div>)/i;
  if (rootTagRegex.test(next)) {
    return next.replace(rootTagRegex, `$1${rootMarkup}$3`);
  }
  throw new Error(`[seo:dynamic] missing #root while prerendering ${route.path}`);
};

const preparePerformanceShellHtml = (html) => deferPerformanceShellModule(
  deferPerformanceShellStyles(html),
);

/**
 * Prerender public stadium detail pages into dist/ so curl sees unique title/meta.
 * Returns sitemap URL entries (path + meta). Fails soft when the API is unreachable.
 */
export const prerenderDynamicStadiumPages = async ({ fetchStadiums = fetchPublicStadiums } = {}) => {
  const minCount = resolveMinStadiumCount();
  const templatePath = path.join(distDir, 'index.html');
  if (!fs.existsSync(templatePath)) {
    console.warn('[seo:dynamic] dist/index.html missing; skip stadium prerender');
    assertMinStadiumCount(0, minCount, 'dist/index.html missing');
    return [];
  }

  let stadiums = [];
  try {
    stadiums = filterSafeStadiums(await fetchStadiums());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[seo:dynamic] stadium API unavailable (${message}); sitemap will omit stadium details`);
    assertMinStadiumCount(0, minCount, `stadium API unavailable: ${message}`);
    return [];
  }

  assertMinStadiumCount(stadiums.length, minCount);

  if (stadiums.length === 0) {
    console.warn('[seo:dynamic] stadium API returned no rows; skip stadium detail pages');
    return [];
  }

  const baseHtml = fs.readFileSync(templatePath, 'utf-8');
  const today = new Date().toISOString().split('T')[0];
  const entries = [];

  for (const stadium of stadiums) {
    const route = buildStadiumDetailRoute(stadium);
    if (!isSafeStadiumId(stadium.stadiumId)) {
      continue;
    }
    const outputPath = `/stadium/${stadium.stadiumId}`;
    const fileRoute = { ...route, path: outputPath };
    let html = injectSeoHead(baseHtml, fileRoute);
    html = injectSeoRoot(html, fileRoute);
    if (fileRoute.performanceShell) {
      html = preparePerformanceShellHtml(html);
    }
    const outputFile = routeToOutputFile(outputPath);
    const relative = path.relative(distDir, outputFile);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      console.warn(`[seo:dynamic] skip stadium outside dist: ${outputPath}`);
      continue;
    }
    ensureDir(path.dirname(outputFile));
    fs.writeFileSync(outputFile, html, 'utf-8');
    entries.push({
      path: outputPath,
      loc: canonicalUrlForPath(outputPath),
      changefreq: route.changefreq,
      priority: route.priority,
      lastmod: today,
      title: route.title,
    });
  }

  const reportPath = path.join(distDir, 'seo-dynamic-stadium-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    siteUrl,
    defaultOgImageUrl,
    count: entries.length,
    entries,
  }, null, 2), 'utf-8');

  console.log(`[seo:dynamic] prerendered ${entries.length} stadium detail page(s)`);
  return entries;
};

export { resolveApiBaseUrl, projectRoot };
