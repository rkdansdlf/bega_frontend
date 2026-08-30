import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(new URL('./plain-menu.tsx', import.meta.url), 'utf8');

test('plain menu panel is bounded inside a narrow dynamic viewport', async () => {
  const source = await readSource();

  assert.match(source, /relative min-w-0 max-w-full/);
  assert.match(source, /max-w-\[calc\(100vw-2rem\)\]/);
  assert.match(source, /max-h-\[min\(70dvh,32rem\)\]/);
  assert.match(source, /overflow-x-hidden overflow-y-auto overscroll-contain/);
  assert.match(source, /\[overflow-wrap:anywhere\]/);
});

test('plain menu keeps both alignment and semantic role branches', async () => {
  const source = await readSource();

  assert.match(source, /align === 'start' \? 'left-0' : 'right-0'/);
  assert.match(source, /role=\{role\}/);
  assert.match(source, /ariaLabel\?: string/);
  assert.match(source, /aria-label=\{ariaLabel\}/);
});

test('plain menu dismisses open panels through outside pointer and Escape', async () => {
  const source = await readSource();

  assert.match(source, /document\.addEventListener\('pointerdown', handlePointerDown\)/);
  assert.match(source, /window\.addEventListener\('keydown', handleKeyDown\)/);
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /onOpenChange\(false\)/);
});
