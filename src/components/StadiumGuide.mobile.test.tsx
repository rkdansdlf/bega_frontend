import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./StadiumGuide.tsx', import.meta.url);

test('stadium guide keeps the lazy runtime and exposes a development-only fallback boundary', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /const StadiumGuideRuntime = lazy\(\(\) => import\('\.\/StadiumGuideRuntime'\)\)/);
  assert.match(source, /visualQaPhase\?: 'fallback' \| 'runtime'/);
  assert.match(source, /visualQaRuntimeOverride\?: ReactNode/);
  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /visualQaPhase === 'fallback'/);
  assert.match(source, /data-testid="stadium-guide-route-fallback"/);
  assert.match(source, /visualQaRuntimeOverride \?\? <StadiumGuideRuntime \/>/);
});

test('stadium guide fallback preserves the mobile-safe page shell in both themes', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /min-h-screen bg-white dark:bg-background/);
  assert.match(source, /max-w-7xl px-4 py-8 sm:px-6 lg:px-8/);
  assert.match(source, /break-words|overflow-wrap/);
  assert.match(source, /구장 가이드를 준비하고 있습니다/);
});
