import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (relativePath: string) => readFile(new URL(relativePath, import.meta.url), 'utf8');

// These layouts were measured at 320/390/1280px with 200% root text. The asserts pin the
// rem-aware treatments so a refactor cannot silently bring back syllable-column wrapping.

test('Admin tabs derive their column count from rem track width, not viewport breakpoints', async () => {
  const source = await read('./AdminPageRuntimeContent.tsx');

  assert.match(source, /grid-cols-\[repeat\(auto-fit,minmax\(6\.5rem,1fr\)\)\]/);
  assert.doesNotMatch(source, /xl:grid-cols-10/);
  assert.match(source, /break-keep[^"]*\[overflow-wrap:break-word\][^>]*>\{label\}/);
});

test('Admin console title wraps by phrase beside its icon', async () => {
  const source = await read('./AdminPage.tsx');

  assert.match(source, /flex flex-wrap items-center gap-4/);
  assert.match(source, /basis-\[12rem\]/);
  assert.match(source, /<h1 className="break-keep /);
});

test('Mate chat hero lets the title drop below the team logo instead of squeezing it', async () => {
  const source = await read('./MateChatViewRuntime.tsx');

  assert.match(source, /flex min-w-0 flex-wrap gap-3 sm:gap-4/);
  assert.match(source, /min-w-0 flex-1 basis-\[12rem\]/);
  assert.match(source, /<h1 className="mt-2 break-keep /);
});

test('My Page scrolling nav keeps focus rings inside the clipped row', async () => {
  const styles = await read('./mypage/MyPageSeason.css');

  assert.match(styles, /scroll-padding-inline: 12px;/);
  assert.match(
    styles,
    /\.mypage-season-nav-sub a:focus-visible\s*\{\s*outline-offset: -2px;/,
  );
});

test('Desktop admin navbar button is wide enough for its full label', async () => {
  const source = await read('./PublicNavbarDesktopAuthControls.tsx');

  assert.match(source, /style=\{authButtonStyle\(98\)\}/);
  assert.match(source, /style=\{labelStyle\(50\)\}/);
});

test('Desktop navbar auth buttons keep px heights and icon sizes under text zoom', async () => {
  const source = await read('./PublicNavbarDesktopAuthControls.tsx');

  assert.doesNotMatch(source, /\bh-10\b/);
  assert.match(source, /min-h-\[40px\] sm:min-h-\[40px\]/);
  // `.bf svg:not([class*='size-'])` forces 1rem; only a size-* class opts out of it.
  assert.match(source, /<ShieldAlertIcon className="size-\[16px\] shrink-0" \/>/);
  assert.match(source, /<LogOutIcon className="size-\[16px\] shrink-0" \/>/);
});

test('Mobile scroll-padding keeps focused controls clear of the sticky header and bottom tab bar', async () => {
  const styles = await readFile(new URL('../index.css', import.meta.url), 'utf8');

  assert.match(
    styles,
    /@media \(max-width: 767px\) \{\s*html \{\s*scroll-padding-top: calc\(var\(--mobile-chrome-height\) \+ 1\.5rem\);\s*scroll-padding-bottom: calc\(\s*var\(--mobile-chrome-height\) \+ var\(--mobile-chrome-bottom-offset\) \+ env\(safe-area-inset-bottom\) \+ 1rem\s*\);/,
  );
});
