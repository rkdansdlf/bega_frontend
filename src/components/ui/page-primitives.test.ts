import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
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

test('every ds-* layout class the primitives render has a CSS definition', () => {
  // Container, Section and TextBlock rendered ds-container / ds-section / ds-measure* for a long
  // time without any CSS: Tailwind-style class names fail silently when nothing defines them.
  const cssDir = new URL('../../', import.meta.url);
  const defined = new Set<string>();
  const walk = (dir: URL) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
      if (entry.isDirectory()) walk(child);
      else if (entry.name.endsWith('.css')) {
        for (const match of readFileSync(child, 'utf8').matchAll(/\.(ds-[a-z0-9-]+)/g)) defined.add(match[1]);
      }
    }
  };
  walk(cssDir);

  const used = new Set([...source.matchAll(/\b(ds-[a-z0-9-]+)\b/g)].map((match) => match[1]));
  assert.ok(used.size >= 5, 'expected the primitives to render several ds-* classes');
  for (const name of used) {
    assert.ok(defined.has(name), `${name} is rendered by page-primitives.tsx but no CSS defines it`);
  }
  assert.match(source, /import "\.\/page-primitives\.css"/);
});
