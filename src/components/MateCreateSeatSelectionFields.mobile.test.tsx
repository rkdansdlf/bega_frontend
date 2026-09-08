import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateCreateSeatSelectionFields.tsx', import.meta.url);

test('seat selection interactive fixture state is disabled in production', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /import\.meta\.env\?\.PROD !== true/);
  assert.match(source, /visualQaInteractive/);
  assert.match(source, /useState\(formData\)/);
  assert.match(source, /effectiveFormData/);
  assert.match(source, /effectiveUpdateFormData/);
});

test('seat selection fields expose every stable selection and input target', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-create-seat-selection-fields"/);
  assert.match(source, /data-selected-side=\{effectiveFormData\.cheeringSide \|\| 'none'\}/);
  assert.match(source, /data-selected-category=\{selectedCategoryKey \|\| 'none'\}/);
  for (const target of ['home', 'neutral', 'away']) {
    assert.match(source, new RegExp(`data-testid="mate-create-cheering-${target}"`));
  }
  assert.match(source, /data-testid=\{`mate-create-seat-category-\$\{key\}`\}/);
  for (const target of ['block', 'row', 'seat']) {
    assert.match(source, new RegExp(`data-testid="mate-create-seat-${target}"`));
  }
});

test('seat selection controls own pressed semantics, focus visibility, and bounded mobile geometry', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /role="group"[\s\S]*?aria-labelledby="mate-create-cheering-side-label"/);
  assert.match(source, /aria-pressed=\{effectiveFormData\.cheeringSide === 'HOME'\}/);
  assert.match(source, /aria-pressed=\{effectiveFormData\.cheeringSide === 'NEUTRAL'\}/);
  assert.match(source, /aria-pressed=\{effectiveFormData\.cheeringSide === 'AWAY'\}/);
  assert.match(source, /aria-pressed=\{isSelected\}/);
  assert.match(source, /mate-create-seat-selection-fields"[^>]*className="[^"]*min-w-0[^"]*space-y-6[^"]*\[overflow-wrap:anywhere\]/);
  assert.match(source, /focus-visible:outline-none[^"\n]*focus-visible:ring-2/);
  assert.match(source, /min-h-\[7rem\]/);
  assert.doesNotMatch(source, /ring-4|scale-\[1\.02\]/);
});

test('seat detail fields expose labels, mobile input hints, and the database length boundary', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /const SEAT_DETAIL_MAX_LENGTH = 100/);
  assert.match(source, /htmlFor="seatDetailBlock"/);
  assert.match(source, /htmlFor="seatDetailRow"/);
  assert.match(source, /htmlFor="seatDetailSeat"/);
  assert.match(source, /id="seatDetailBlock"[\s\S]*?maxLength=\{SEAT_DETAIL_MAX_LENGTH\}/);
  assert.match(source, /id="seatDetailRow"[\s\S]*?maxLength=\{SEAT_DETAIL_MAX_LENGTH\}/);
  assert.match(source, /id="seatDetailSeat"[\s\S]*?maxLength=\{SEAT_DETAIL_MAX_LENGTH\}/);
  assert.match(source, /inputMode="text"/);
  assert.match(source, /id="seat-detail-help"/);
  assert.match(source, /aria-describedby="seat-detail-help"/);
});

test('seat cards and preview contain pressure copy with dark-theme contrast', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /min-w-0 flex-1/);
  assert.match(source, /\[overflow-wrap:anywhere\][^"\n]*dark:text-gray-300/);
  assert.match(source, /data-testid="mate-create-seat-preview"/);
  assert.match(source, /break-words[^"\n]*\[overflow-wrap:anywhere\][^"\n]*dark:text-white/);
  assert.match(source, /dark:border-gray-600[^"\n]*dark:text-white/);
});
