import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('mate create confirmation remains top-reachable when its mobile content exceeds the viewport', async () => {
  const source = await readFile(new URL('./MateCreateConfirmDialog.tsx', import.meta.url), 'utf8');

  assert.match(source, /absolute inset-0 overflow-y-auto p-4/);
  assert.match(source, /flex min-h-full items-start justify-center sm:items-center/);
  assert.match(source, /overflow-x-clip/);
  assert.match(source, /focus:outline-none/);
  assert.match(source, /useFocusTrap\(dialogRef, \{ active: true, initialFocus: 'container' \}\)/);
  assert.match(source, /data-testid="mate-create-confirm-dialog"/);
  assert.match(source, /aria-busy=\{isSubmitting\}/);
  assert.match(source, /data-testid="mate-create-confirm-cancel"/);
  assert.match(source, /data-testid="mate-create-confirm-submit"/);
  assert.match(source, /\[overflow-wrap:anywhere\]/);
  assert.equal(source.match(/text-foreground/g)?.length, 8);
});
