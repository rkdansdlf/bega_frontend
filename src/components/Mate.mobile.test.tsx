import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./Mate.tsx', import.meta.url);

test('mate page exposes deterministic lazy phases only outside production', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /phase: 'controls-fallback'/);
  assert.match(source, /phase: 'results-fallback'/);
  assert.match(source, /phase: 'results-fallback' \| 'runtime'/);
  assert.match(source, /data-testid="mate-page"/);
  assert.match(source, /min-w-0[^"\n]*overflow-x-clip/);
});

test('mate lazy fallbacks announce progress and stay bounded on mobile', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-controls-fallback"/);
  assert.match(source, /aria-label="메이트 화면 준비 중"/);
  assert.match(source, /data-testid="mate-results-fallback"/);
  assert.match(source, /aria-label="메이트 파티 목록 준비 중"/);
  assert.match(source, /h-11 w-20 shrink-0/);
  assert.match(source, /min-w-0[^"\n]*h-\[304px\]/);
  assert.match(source, /aria-hidden="true"/);
});

test('mate fallback skeletons remain visible against the dark page surface', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  const darkSkeletonSurfaces = source.match(/dark:bg-white\/(?:10|15)/g) ?? [];

  assert.ok(darkSkeletonSurfaces.length >= 8);
});

test('mate controls fallback keeps the resolved page title stable while modules load', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /Mate Flow/);
  assert.match(source, /직관 메이트 찾기/);
  assert.doesNotMatch(source, /같이가요/);
});
