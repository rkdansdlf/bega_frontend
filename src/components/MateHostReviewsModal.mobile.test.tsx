import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateHostReviewsModal.tsx', import.meta.url);

test('host reviews modal disables deterministic query state in production', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /visualQaStateOverride/);
  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /enabled: Boolean\(hostHandle\) && !visualQaStateOverride/);
});

test('host reviews modal exposes a contained dialog and mobile-sized close action', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /contentTestId="mate-host-reviews-dialog"/);
  assert.match(source, /max-w-\[calc\(100vw-2rem\)\]/);
  assert.match(source, /bodyClassName="\[overflow-wrap:anywhere\]"/);
  assert.match(source, /data-testid="mate-host-reviews-close"[^>]*size="touch"/);
  assert.match(source, /className="min-h-11 w-full sm:w-auto"/);
});

test('host reviews modal announces query states and contains pressure rows', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-host-reviews-loading"[^>]*role="status"/);
  assert.match(source, /data-testid="mate-host-reviews-error"[^>]*role="alert"/);
  assert.match(source, /data-testid="mate-host-reviews-empty"[^>]*role="status"/);
  assert.match(source, /data-testid=\{`mate-host-review-\$\{review\.id\}`\}/);
  assert.match(source, /flex flex-wrap items-center gap-x-2 gap-y-1/);
  assert.match(source, /\[overflow-wrap:anywhere\]/);
  assert.match(source, /max-h-\[60dvh\][^"\n]*overscroll-contain/);
});
