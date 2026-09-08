import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateDetailContentRuntime.tsx', import.meta.url);

test('mate detail content runtime keeps action dialogs behind the intended lazy boundary', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /const LazyMateDetailActionDialogs = lazy\(\(\) => import\('\.\/MateDetailActionDialogs'\)\)/);
  assert.match(source, /\{\(showCancelDialog \|\| showSaleDialog\) \? \(/);
  assert.match(source, /<Suspense fallback=\{null\}>\s*<LazyMateDetailActionDialogs/);
});

test('mate detail content runtime forwards both complete dialog form states', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  for (const prop of [
    'showCancelDialog',
    'showSaleDialog',
    'isCancelling',
    'isConvertingToSale',
    'cancelReasonOptions',
    'selectedCancelReason',
    'cancelMemo',
    'salePrice',
    'salePriceError',
  ]) {
    assert.match(source, new RegExp(`${prop}=\\{${prop}\\}`));
  }
  assert.match(source, /onExecuteCancelApplication=\{executeCancelApplication\}/);
  assert.match(source, /onSelectCancelReason=\{setSelectedCancelReason\}/);
  assert.match(source, /onChangeCancelMemo=\{setCancelMemo\}/);
  assert.match(source, /onConfirmSale=\{handleConfirmSale\}/);
  assert.match(source, /setSalePriceError\(''\)/);
});

test('cancel and sale actions can reach their respective lazy dialog mounts', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /const handleCancelApplication = async \(\) => \{/);
  assert.match(source, /setShowCancelDialog\(true\)/);
  assert.match(source, /const handleOpenSaleDialog = \(\) => \{/);
  assert.match(source, /setShowSaleDialog\(true\)/);
  assert.match(source, /key: 'cancel',[\s\S]*?onClick: handleCancelApplication/);
  assert.match(source, /key: 'sale',[\s\S]*?onClick: handleOpenSaleDialog/);
});

test('mate detail content runtime keeps the action section behind a resolved lazy boundary', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /const LazyMateDetailActionSection = lazy\(\(\) => import\('\.\/MateDetailActionSection'\)\)/);
  assert.match(source, /<Suspense fallback=\{null\}>\s*<LazyMateDetailActionSection/);
  for (const prop of [
    'party',
    'actionContext',
    'actionButtons',
    'isAwaitingApproval',
    'primaryMobileAction',
    'canAccessCheckIn',
    'isHost',
    'isShareToCheerPending',
  ]) {
    assert.match(source, new RegExp(`${prop}=\\{${prop}\\}`));
  }
  assert.match(source, /onOpenQrPanel=\{onOpenQrPanel\}/);
  assert.match(source, /onShare=\{onShare\}/);
  assert.match(source, /onShareToCheer=\{onShareToCheer\}/);
  assert.match(source, /onBrowsePartyList=\{onBrowsePartyList\}/);
});
