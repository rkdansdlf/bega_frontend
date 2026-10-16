import assert from 'node:assert/strict';
import test from 'node:test';

import { getDedupeSelector } from './react-helmet-async';

test('helmet shim replaces prerendered/other meta by key instead of duplicating', () => {
  assert.equal(getDedupeSelector('meta', { name: 'description', content: 'x' }), 'meta[name="description"]');
  assert.equal(getDedupeSelector('meta', { property: 'og:title', content: 'x' }), 'meta[property="og:title"]');
  assert.equal(getDedupeSelector('link', { rel: 'canonical', href: 'x' }), 'link[rel="canonical"]');
  assert.equal(getDedupeSelector('script', { type: 'application/ld+json' }), 'script[data-seo-jsonld]');
  assert.equal(getDedupeSelector('meta', { charSet: 'utf-8' }), null);
  assert.equal(getDedupeSelector('link', { rel: 'preload' }), null);
});
