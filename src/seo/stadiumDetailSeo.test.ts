import assert from 'node:assert/strict';
import test from 'node:test';

import { buildStadiumDetailSeo } from './stadiumDetailSeo';
import { buildStadiumDetailRoute } from '../../scripts/seo-dynamic-pages.mjs';

test('runtime stadium SEO uses the Korean stadium name and matches the prerendered head', () => {
  const stadium = { stadiumId: 'JAMSIL', stadiumName: '잠실야구장', team: 'LG,OB' };
  const runtime = buildStadiumDetailSeo(stadium);
  const prerendered = buildStadiumDetailRoute(stadium);
  assert.equal(runtime.title, '잠실야구장 구장 가이드 | BEGA');
  assert.equal(runtime.title, prerendered.title);
  assert.equal(runtime.description, prerendered.description);
  assert.doesNotMatch(runtime.title, /JAMSIL/);
});

test('runtime stadium SEO falls back to the id when the name is missing', () => {
  assert.equal(buildStadiumDetailSeo({ stadiumId: 'X1', stadiumName: ' ' }).title, 'X1 구장 가이드 | BEGA');
});

test('/stadium listing copy comes from seo-routes.json headOnlyIndexableRoutes', async () => {
  const { STADIUM_INDEX_SEO } = await import('./stadiumDetailSeo');
  const { readFileSync } = await import('node:fs');
  const policy = JSON.parse(readFileSync(new URL('../../seo-routes.json', import.meta.url), 'utf-8'));
  const route = policy.headOnlyIndexableRoutes.find((entry: { path: string }) => entry.path === '/stadium');
  assert.equal(STADIUM_INDEX_SEO.title, route.title);
  assert.equal(STADIUM_INDEX_SEO.description, route.description);
  assert.equal(policy.indexableRoutes.some((entry: { path: string }) => entry.path === '/stadium'), false);
});
