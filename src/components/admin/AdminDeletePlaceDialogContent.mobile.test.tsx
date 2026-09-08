import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(
  new URL('./AdminDeletePlaceDialogContent.tsx', import.meta.url),
  'utf8',
);

test('admin delete-place dialog keeps its destructive copy readable in either app theme', async () => {
  const source = await readSource();

  assert.match(source, /contentTestId="admin-delete-place-dialog"/);
  assert.match(source, /text-foreground \[overflow-wrap:anywhere\]/);
  assert.equal(source.match(/text-muted-foreground \[overflow-wrap:anywhere\]/g)?.length, 2);
  assert.doesNotMatch(source, /bg-slate-900/);
});

test('admin delete-place dialog exposes three mobile-safe action targets', async () => {
  const source = await readSource();

  assert.match(source, /data-testid="admin-delete-place-cancel"/);
  assert.match(source, /data-testid="admin-delete-place-confirm"/);
  assert.equal(source.match(/w-full[^\"]*sm:w-auto/g)?.length, 2);
  assert.match(source, /variant="destructive"/);
  assert.match(source, /onClick=\{\(\) => onOpenChange\(false\)\}/);
  assert.match(source, /onClick=\{onConfirm\}/);
});
