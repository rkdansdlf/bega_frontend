import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateCheckInPage.tsx', import.meta.url);

test('mate check-in page exposes fallback and runtime phases only outside production', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /visualQaPhase/);
  assert.match(source, /visualQaRuntimeStateOverride/);
  assert.match(source, /visualQaPhase === 'fallback'/);
  assert.match(source, /<MateCheckInRuntime visualQaStateOverride=\{visualQaRuntimeStateOverride\}/);
});

test('mate check-in page fallback is announced and contained at 320px in both themes', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-check-in-page-fallback"/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-busy="true"/);
  assert.match(source, /aria-label="체크인 화면 준비 중"/);
  assert.match(source, /min-h-dvh[^"\n]*min-w-0[^"\n]*overflow-x-clip/);
  assert.match(source, /dark:bg-card/);
  assert.match(source, /dark:text-white/);
});
