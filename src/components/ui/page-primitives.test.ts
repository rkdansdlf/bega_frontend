import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./page-primitives.tsx', import.meta.url), 'utf8');

test('page primitives keep every layout slot width-bounded under content pressure', () => {
  assert.match(source, /ds-container min-w-0 max-w-full \[overflow-wrap:anywhere\]/);
  assert.match(source, /ds-section min-w-0 max-w-full \[overflow-wrap:anywhere\]/);
  assert.match(source, /flex min-w-0 max-w-full flex-col gap-4 \[overflow-wrap:anywhere\]/);
  assert.match(source, /flex min-w-0 max-w-full flex-col/);
  assert.match(source, /landing-hero-panel min-w-0 max-w-full overflow-hidden \[overflow-wrap:anywhere\]/);
});

test('section header and CTA spacing reflow at the mobile breakpoint', () => {
  assert.match(source, /mx-auto mb-8 flex min-w-0 max-w-full flex-col sm:mb-12/);
  assert.match(source, /ds-section-title break-words \[overflow-wrap:anywhere\]/);
  assert.match(source, /ds-section-copy break-words \[overflow-wrap:anywhere\]/);
  assert.match(source, /flex min-w-0 w-full flex-col gap-3 sm:w-auto sm:max-w-full sm:flex-row sm:flex-wrap/);
});
