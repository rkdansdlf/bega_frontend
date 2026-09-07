import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(
  new URL('./AdminPlaceDialogContent.tsx', import.meta.url),
  'utf8',
);

test('admin place dialog delegates viewport containment to PlainDialog and stacks paired fields on mobile', async () => {
  const source = await readSource();

  assert.match(source, /contentTestId="admin-place-dialog"/);
  assert.match(source, /initialFocus="container"/);
  assert.match(source, /className="max-w-lg[^"\n]*focus:outline-none/);
  assert.doesNotMatch(source, /max-h-\[90vh\] overflow-y-auto/);
  assert.equal(source.match(/grid grid-cols-1 gap-3 sm:grid-cols-2/g)?.length, 2);
  assert.match(source, /className="min-w-0 \[overflow-wrap:anywhere\]"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /description=\{\([\s\S]*line-clamp-3[\s\S]*title=\{dialogDescription\}/);
  assert.ok(
    source.indexOf('{stadiumError &&') < source.indexOf('<div className="grid gap-4 py-2">'),
    'the save error must be visible before the scrollable form fields',
  );
});

test('admin place dialog keeps every field labelled and every mobile action full-width', async () => {
  const source = await readSource();

  const fieldIds = [
    'name',
    'category',
    'description',
    'address',
    'phone',
    'lat',
    'lng',
    'rating',
    'open-time',
    'close-time',
  ];

  for (const fieldId of fieldIds) {
    assert.match(source, new RegExp(`htmlFor="admin-place-${fieldId}"`));
    assert.match(source, new RegExp(`id="admin-place-${fieldId}"`));
  }

  assert.match(source, /data-testid="admin-place-cancel"/);
  assert.match(source, /data-testid="admin-place-submit"/);
  assert.equal(source.match(/w-full[^"\n]*sm:w-auto/g)?.length, 2);
  assert.match(source, /h-11 min-w-0[^'\n]*text-base[^'\n]*sm:h-9[^'\n]*sm:text-body/);
});

test('admin place dialog allows deterministic input only outside production', async () => {
  const source = await readSource();

  assert.match(source, /visualQaStateOverride\?: AdminPlaceDialogVisualQaStateOverride/);
  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /visualQaStateOverride\?\.interactive === true/);
  assert.match(source, /const effectivePlaceForm = visualQaInteractive \? visualQaPlaceForm : placeForm/);
  assert.match(source, /const updatePlaceForm = visualQaInteractive \? setVisualQaPlaceForm : setPlaceForm/);
});
