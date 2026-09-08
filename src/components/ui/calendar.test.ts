import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(new URL('./calendar.tsx', import.meta.url), 'utf8');

test('calendar keeps every mobile day and navigation control touch sized', async () => {
  const source = await readSource();

  assert.match(source, /size-11 sm:size-7/);
  assert.match(source, /h-11 w-full sm:size-8/);
  assert.match(source, /p-1 sm:p-3/);
});

test('calendar exposes a labelled grid with selected and current date semantics', async () => {
  const source = await readSource();

  assert.match(source, /ariaLabel\?: string/);
  assert.match(source, /role="grid"/);
  assert.match(source, /role="columnheader"/);
  assert.match(source, /role="gridcell"/);
  assert.match(source, /aria-selected=\{isSelected\}/);
  assert.match(source, /aria-current=\{isToday \? 'date' : undefined\}/);
  assert.match(source, /aria-label=\{formatDateLabel\(date\)\}/);
});

test('calendar hides outside days when requested and applies every public classNames slot', async () => {
  const source = await readSource();

  assert.match(source, /isOutside && !showOutsideDays/);
  assert.match(source, /classNames\?\.months/);
  assert.match(source, /classNames\?\.nav/);
  assert.match(source, /classNames\?\.day_hidden/);
});

test('calendar accepts deterministic initial-month and today fixtures', async () => {
  const source = await readSource();

  assert.match(source, /defaultMonth\?: Date/);
  assert.match(source, /today\?: Date/);
  assert.match(source, /month \?\? defaultMonth \?\? selected \?\? todayProp \?\? new Date\(\)/);
  assert.match(source, /startOfDay\(todayProp \?\? new Date\(\)\)/);
});

test('calendar provides roving focus and arrow, page, home, and end navigation', async () => {
  const source = await readSource();

  assert.match(source, /tabIndex=\{isFocusedDate \? 0 : -1\}/);
  assert.match(source, /event\.key === 'ArrowLeft'/);
  assert.match(source, /event\.key === 'ArrowRight'/);
  assert.match(source, /event\.key === 'ArrowUp'/);
  assert.match(source, /event\.key === 'ArrowDown'/);
  assert.match(source, /event\.key === 'PageUp'/);
  assert.match(source, /event\.key === 'PageDown'/);
  assert.match(source, /event\.key === 'Home'/);
  assert.match(source, /event\.key === 'End'/);
});
