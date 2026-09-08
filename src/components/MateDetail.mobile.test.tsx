import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateDetail.tsx', import.meta.url);
const runtimeSourceUrl = new URL('./MateDetailRuntime.tsx', import.meta.url);

test('mate detail exposes fallback and resolved runtime phases only outside production', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /visualQaPhase/);
  assert.match(source, /visualQaPhase === 'fallback'/);
  assert.match(source, /<MateDetailRuntime \/>/);
});

test('mate detail fallback is announced and contained at 320px in both themes', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-detail-page-fallback"/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-busy="true"/);
  assert.match(source, /aria-label="메이트 상세 화면 준비 중"/);
  assert.match(source, /min-h-dvh[^"\n]*min-w-0[^"\n]*overflow-x-clip/);
  assert.match(source, /px-4[^"\n]*sm:px-6/);
  assert.match(source, /dark:bg-card/);
  assert.match(source, /dark:text-white/);
});

test('mate detail runtime exposes stable loading, error, and populated capture states', async () => {
  const source = await readFile(runtimeSourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-detail-runtime"/);
  assert.match(source, /data-phase="loading"/);
  assert.match(source, /data-phase="error"/);
  assert.match(source, /data-phase="populated"/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-busy="true"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /flex-wrap[^"\n]*justify-center/);
  assert.match(source, /size="touch"[^>]*className="min-h-11"/);
  assert.match(source, /data-testid="mate-detail-back"[^>]*className="[^"]*min-h-11/);
  assert.match(source, /data-testid="mate-detail-share"[^>]*className="[^"]*min-h-11/);
});
