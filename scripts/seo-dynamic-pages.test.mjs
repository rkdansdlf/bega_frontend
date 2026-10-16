import assert from 'node:assert/strict';
import test from 'node:test';

import { buildStadiumDetailRoute, resolveApiBaseUrl } from './seo-dynamic-pages.mjs';

test('stadium detail route builds www-canonical path and unique title', () => {
  const route = buildStadiumDetailRoute({
    stadiumId: 'JAMSIL',
    stadiumName: '잠실야구장',
    team: 'LG,OB',
  });

  assert.equal(route.path, '/stadium/JAMSIL');
  assert.match(route.title, /잠실야구장/);
  assert.match(route.description, /잠실야구장/);
  assert.equal(route.priority, '0.7');
});

test('resolveApiBaseUrl normalizes /api and absolute API origins', () => {
  const previous = process.env.VITE_API_BASE_URL;
  const previousSitemap = process.env.SITEMAP_API_BASE_URL;
  const previousBackend = process.env.BACKEND_BASE_URL;
  try {
    delete process.env.SITEMAP_API_BASE_URL;
    delete process.env.BACKEND_BASE_URL;
    process.env.VITE_API_BASE_URL = '/api';
    assert.equal(resolveApiBaseUrl(), 'https://api.begabaseball.xyz');

    process.env.VITE_API_BASE_URL = 'https://api.begabaseball.xyz/api';
    assert.equal(resolveApiBaseUrl(), 'https://api.begabaseball.xyz');

    process.env.SITEMAP_API_BASE_URL = 'https://api.example.test';
    assert.equal(resolveApiBaseUrl(), 'https://api.example.test');
  } finally {
    if (previous === undefined) delete process.env.VITE_API_BASE_URL;
    else process.env.VITE_API_BASE_URL = previous;
    if (previousSitemap === undefined) delete process.env.SITEMAP_API_BASE_URL;
    else process.env.SITEMAP_API_BASE_URL = previousSitemap;
    if (previousBackend === undefined) delete process.env.BACKEND_BASE_URL;
    else process.env.BACKEND_BASE_URL = previousBackend;
  }
});

test('stadium ids are validated before being used in prerender/sitemap paths', async () => {
  const { filterSafeStadiums, isSafeStadiumId } = await import('./seo-dynamic-pages.mjs');
  assert.equal(isSafeStadiumId('JAMSIL'), true);
  assert.equal(isSafeStadiumId('sajik_2-b'), true);
  for (const bad of ['../../etc', '..', 'a/b', 'a\\b', 'a b', '', '%2e%2e', null, 7]) {
    assert.equal(isSafeStadiumId(bad), false, String(bad));
  }
  const warnings = [];
  const kept = filterSafeStadiums(
    [{ stadiumId: 'JAMSIL' }, { stadiumId: '../../../tmp/pwn' }, { stadiumId: 'GOCHEOK' }],
    { warn: (m) => warnings.push(m) },
  );
  assert.deepEqual(kept.map((s) => s.stadiumId), ['JAMSIL', 'GOCHEOK']);
  assert.equal(warnings.length, 1);
});

test('SEO_MIN_STADIUM_COUNT gate is env-configurable and disabled by default', async () => {
  const { assertMinStadiumCount, resolveMinStadiumCount } = await import('./seo-dynamic-pages.mjs');
  assert.equal(resolveMinStadiumCount({}), 0);
  assert.equal(resolveMinStadiumCount({ SEO_MIN_STADIUM_COUNT: 'abc' }), 0);
  assert.equal(resolveMinStadiumCount({ SEO_MIN_STADIUM_COUNT: '9' }), 9);
  assert.doesNotThrow(() => assertMinStadiumCount(0, 0));
  assert.doesNotThrow(() => assertMinStadiumCount(9, 9));
  assert.throws(() => assertMinStadiumCount(0, 9, 'api down'), /SEO_MIN_STADIUM_COUNT=9/);
});

test('script STADIUM_ID_PATTERN mirrors src/utils/stadiumId.ts', async () => {
  const { STADIUM_ID_PATTERN } = await import('./seo-dynamic-pages.mjs');
  const shared = await import('../src/utils/stadiumId.ts');
  assert.equal(STADIUM_ID_PATTERN.source, shared.STADIUM_ID_PATTERN.source);
  assert.equal(STADIUM_ID_PATTERN.flags, shared.STADIUM_ID_PATTERN.flags);
});
