import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const readComponentSource = async (componentFile: string) => {
  const sourceUrl = new URL(componentFile, import.meta.url);
  return readFile(sourceUrl, 'utf8');
};

const readNumericConstant = (source: string, constantName: string): number => {
  const match = source.match(new RegExp(`const ${constantName} = (\\d+);`));
  assert.ok(match, `${constantName} constant exists`);
  return Number(match[1]);
};

describe('navbar desktop layout contract', () => {
  it('keeps the logo visible and all desktop shells at the top in document flow', async () => {
    const [layoutSource, publicNavbarSource, authenticatedNavbarSource] = await Promise.all([
      readComponentSource('./Layout.tsx'),
      readComponentSource('./PublicNavbar.tsx'),
      readComponentSource('./Navbar.tsx'),
    ]);

    assert.doesNotMatch(layoutSource, />\s*B\s*</, 'lazy fallback must not expose the text-only B mark');
    for (const source of [layoutSource, publicNavbarSource, authenticatedNavbarSource]) {
      assert.match(source, /fetchpriority="high"/);
      assert.doesNotMatch(source, /fetchPriority="high"/);
      assert.match(source, /loading="eager"/);
      const header = source.match(/<header\b[^>]*className="([^"]+)"/s)?.[1];
      assert.ok(header, 'shell exposes its header classes');
      const classes = header.split(/\s+/);
      assert.ok(classes.includes('sticky') && classes.includes('top-0'));
      assert.ok(!classes.includes('md:fixed'), 'desktop header keeps its flow space');
      assert.ok(!classes.includes('md:top-1/2'), 'desktop header must not cover the page center');
      assert.ok(!classes.includes('md:-translate-y-1/2'), 'desktop header has no vertical centering transform');
    }
  });

  it('reserves the logged-in compact capsule width in both desktop navbar shells', async () => {
    const [publicNavbarSource, authenticatedNavbarSource] = await Promise.all([
      readComponentSource('./PublicNavbar.tsx'),
      readComponentSource('./Navbar.tsx'),
    ]);

    assert.equal(
      readNumericConstant(publicNavbarSource, 'DESKTOP_NAVBAR_AUTH_COMPACT_WIDTH'),
      1040,
      'PublicNavbar compact authenticated width',
    );
    assert.equal(
      readNumericConstant(authenticatedNavbarSource, 'DESKTOP_NAVBAR_AUTH_COMPACT_WIDTH'),
      1040,
      'Navbar compact authenticated width',
    );
  });
});
