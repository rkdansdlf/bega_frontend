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
