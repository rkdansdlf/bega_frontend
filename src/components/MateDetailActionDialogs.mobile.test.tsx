import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateDetailActionDialogs.tsx', import.meta.url);

test('mate detail action dialog interactive fixture state is disabled in production', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /visualQaStateOverride/);
  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /visualQaInteractive/);
});

test('cancel dialog exposes contained selected reasons and mobile-sized controls', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /contentTestId="mate-detail-cancel-dialog"/);
  assert.match(source, /data-testid=\{`mate-detail-cancel-reason-\$\{option\.value\}`\}/);
  assert.match(source, /aria-pressed=\{selectedCancelReasonValue === option\.value\}/);
  assert.match(source, /min-h-11[^`"\n]*min-w-0[^`"\n]*\[overflow-wrap:anywhere\]/);
  assert.match(source, /focus-visible:ring-2/);
  assert.match(source, /data-testid="mate-detail-cancel-memo"/);
  assert.match(source, /id="mate-detail-cancel-memo"/);
  assert.match(source, /htmlFor="mate-detail-cancel-memo"/);
  assert.match(source, /data-testid="mate-detail-cancel-back"[^>]*size="touch"/);
  assert.match(source, /data-testid="mate-detail-cancel-confirm"[^>]*size="touch"/);
});

test('sale dialog connects numeric input, pressure error, and mobile actions', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /contentTestId="mate-detail-sale-dialog"/);
  assert.match(source, /data-testid="mate-detail-sale-price"/);
  assert.match(source, /id="mate-detail-sale-price"/);
  assert.match(source, /htmlFor="mate-detail-sale-price"/);
  assert.match(source, /inputMode="numeric"/);
  assert.match(source, /aria-invalid=\{Boolean\(salePriceError\)\}/);
  assert.match(source, /aria-describedby=\{salePriceError \? 'mate-detail-sale-price-error' : undefined\}/);
  assert.match(source, /id="mate-detail-sale-price-error"[^>]*role="alert"/);
  assert.match(source, /data-testid="mate-detail-sale-cancel"[^>]*size="touch"/);
  assert.match(source, /data-testid="mate-detail-sale-confirm"[^>]*size="touch"/);
});

test('both dialogs expose real Visual QA input, selection, and pending evidence', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /setVisualSelectedCancelReason/);
  assert.match(source, /setVisualCancelMemo/);
  assert.match(source, /setVisualSalePrice/);
  assert.match(source, /setVisualIsCancelling\(true\)/);
  assert.match(source, /setVisualIsConvertingToSale\(true\)/);
  assert.match(source, /data-current-value=\{cancelMemoValue\}/);
  assert.match(source, /data-current-value=\{salePriceValue\}/);
  assert.match(source, /data-pending=\{isCancellingValue\}/);
  assert.match(source, /data-pending=\{isConvertingToSaleValue\}/);
});
