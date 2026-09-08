import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Footer exposes stable mobile-safe navigation and contact targets', async () => {
  const source = await readFile(new URL('./Footer.tsx', import.meta.url), 'utf8');

  assert.match(source, /data-testid="site-footer"/);
  assert.match(source, /data-testid="site-footer-home"/);
  assert.match(source, /data-testid="site-footer-email"/);
  assert.match(source, /flex min-w-0 flex-wrap items-baseline/);
  assert.match(source, /\[overflow-wrap:anywhere\]/);
  assert.match(source, /text-sm sm:text-body/);
  assert.match(source, /inline-flex min-h-11 min-w-11/);
});
