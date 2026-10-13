import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (name: string) => readFileSync(
  new URL(`./${name}`, import.meta.url),
  'utf8',
);

test('cheer detail resets the viewport after the lazy post becomes available', () => {
  const source = readSource('CheerDetail.tsx');

  assert.match(source, /const useIsomorphicLayoutEffect = typeof window === 'undefined' \? useEffect : useLayoutEffect;/);
  assert.match(
    source,
    /useIsomorphicLayoutEffect\(\(\) => \{\s*window\.scrollTo\(\{ top: 0, left: 0, behavior: 'instant' \}\);\s*\}, \[parsedPostId, selectedPost\?\.id\]\);/,
  );

  const articleSource = readSource('CheerDetailArticleRuntime.tsx');
  assert.match(articleSource, /const useIsomorphicLayoutEffect = typeof window === 'undefined' \? useEffect : useLayoutEffect;/);
  assert.match(articleSource, /useIsomorphicLayoutEffect\(\(\) => \{\s*window\.scrollTo\(\{ top: 0, left: 0, behavior: 'instant' \}\);\s*\}, \[selectedPost\.id\]\);/);
});

test('cheer detail author metadata can wrap unbroken names and handles within the card', () => {
  const source = readSource('CheerDetailArticleRuntime.tsx');

  assert.match(source, /className="block min-w-0 max-w-full break-words[^\"]*\[overflow-wrap:anywhere\]/);
  assert.match(source, /className="min-w-0 max-w-full break-words \[overflow-wrap:anywhere\]"\>\{displayAuthorHandleLabel\}/);
  assert.equal(
    (source.match(/flex min-w-0 max-w-full items-center gap-1 break-words \[overflow-wrap:anywhere\]/g) ?? []).length,
    2,
  );
});
