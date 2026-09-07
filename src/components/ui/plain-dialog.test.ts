import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(new URL('./plain-dialog.tsx', import.meta.url), 'utf8');

test('plain dialog bounds every placement to the dynamic mobile viewport', async () => {
  const source = await readSource();

  assert.match(source, /max-h-\[calc\(100dvh-2rem\)\]/);
  assert.match(source, /max-h-\[calc\(100dvh-1rem\)\]/);
  assert.match(source, /h-dvh/);
  assert.match(source, /overflow-hidden/);
  assert.match(source, /min-h-0 flex-1 overflow-y-auto overscroll-contain/);
  assert.match(source, /max-h-\[35dvh\]/);
  assert.match(source, /max-h-\[35dvh\] shrink-0[^"']*overflow-hidden/);
  assert.match(source, /max-h-\[45dvh\]/);
});

test('plain dialog keeps long header copy and the close control in separate bounds', async () => {
  const source = await readSource();

  assert.match(source, /\[overflow-wrap:anywhere\]/);
  assert.match(source, /min-h-0 max-h-\[calc\(35dvh-2rem\)\] min-w-0 overflow-y-auto/);
  assert.match(source, /shrink-0 p-0/);
  assert.match(source, /aria-label="닫기"/);
  assert.match(source, /initialFocus\?: 'container' \| 'first'/);
  assert.match(source, /useFocusTrap\(dialogRef, \{ active: open, initialFocus \}\)/);
});

test('plain dialog gives bottom-sheet actions safe-area space and unnamed dialogs a fallback label', async () => {
  const source = await readSource();

  assert.match(source, /pb-\[calc\(1rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(source, /const resolvedAriaLabel/);
  assert.match(source, /'대화상자'/);
});

test('plain dialog accepts inline scroll padding for fixed-footer forms', async () => {
  const source = await readSource();

  assert.match(source, /bodyStyle\?: CSSProperties/);
  assert.match(source, /^  bodyStyle,$/m);
  assert.match(source, /style=\{bodyStyle\}/);
});
