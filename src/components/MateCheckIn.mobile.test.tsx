import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateCheckIn.tsx', import.meta.url);

test('mate check-in exposes deterministic route and content states only outside production', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /MateCheckInVisualQaStateOverride/);
  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /visualQaStateOverride == null && Boolean\(party\?\.id\)/);
  assert.match(source, /visualQaContentPhase/);
});

test('mate check-in replaces blank session loss with a contained recovery surface', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.doesNotMatch(source, /if \(!currentUserId\) \{\s*return null;/);
  assert.match(source, /data-testid="mate-check-in-auth-required"/);
  assert.match(source, /data-testid="mate-check-in-login"/);
  assert.match(source, /data-testid="mate-check-in-auth-list"/);
  assert.match(source, /min-h-dvh[^"\n]*min-w-0[^"\n]*overflow-x-clip/);
});

test('mate check-in exposes stable mobile controls and contains pressure errors', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  for (const testId of [
    'mate-check-in',
    'mate-check-in-loading',
    'mate-check-in-error',
    'mate-check-in-error-list',
    'mate-check-in-back',
    'mate-check-in-manual-code',
  ]) {
    assert.match(source, new RegExp(`data-testid="${testId}"`));
  }
  assert.match(source, /\[overflow-wrap:anywhere\]/);
  assert.match(source, /size="touch"/);
  assert.match(source, /className="h-11[^"\n]*min-w-0/);
});

test('mate check-in lazy content fallback is announced and never null', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-check-in-content-fallback"/);
  assert.match(source, /aria-label="체크인 화면 준비 중"/);
  assert.match(source, /contentPhase === 'fallback'/);
  assert.match(source, /data-testid="mate-check-in-back"[\s\S]{0,300}?dark:text-white/);
  assert.ok((source.match(/dark:bg-white\/10/g) ?? []).length >= 3);
  assert.doesNotMatch(source, /<Suspense fallback=\{null\}>/);
});
