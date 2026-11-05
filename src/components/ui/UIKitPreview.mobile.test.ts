import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = () => readFile(new URL('./UIKitPreview.tsx', import.meta.url), 'utf8');

test('UI kit preview stacks its heading and theme control without mobile text collapse', async () => {
  const source = await readSource();

  assert.match(source, /px-4 py-6[^"']*sm:p-8/);
  assert.match(source, /flex flex-col items-start gap-4[^"']*sm:flex-row[^"']*sm:items-center/);
  assert.match(source, /text-3xl[^"']*sm:text-4xl/);
  assert.match(source, /min-h-11 w-full whitespace-nowrap[^"']*sm:w-auto/);
});

test('UI kit preview keeps dense panels readable and exposes stable QA surfaces', async () => {
  const source = await readSource();

  assert.match(source, /bg-background[^"']*text-foreground/);
  assert.doesNotMatch(source, /text-neutral-500/);
  assert.match(source, /data-testid="ui-kit-preview"/);
  assert.match(source, /data-testid="ui-kit-color-palette"/);
  assert.match(source, /role="list"/);
  assert.match(source, /role="listitem"/);
  assert.match(source, /p-4 sm:p-6/);
  assert.match(source, /break-words/);
});

test('UI kit palette and button specimens reflow when enlarged text no longer fits paired columns', async () => {
  const source = await readSource();
  const adaptiveColumns = 'grid-cols-[repeat(auto-fit,minmax(min(100%,6rem),1fr))]';

  assert.equal(source.split(adaptiveColumns).length - 1, 3);
});

test('UI kit typography samples keep long retro text inside a narrow enlarged-text viewport', async () => {
  const source = await readSource();

  assert.match(source, /grid min-w-0 grid-cols-\[minmax\(0,1fr\)\] gap-6/);
  assert.match(source, /className="font-retro min-w-0"/);
  assert.match(source, /className="break-words text-lg"/);
});

test('UI kit compares real shared controls and their disabled, invalid and loading states', async () => {
  const source = await readSource();
  for (const specimen of ['ui-kit-button-comparison', 'ui-kit-form-controls', 'ui-kit-status-badges', 'ui-kit-states', 'ui-kit-dialog-open']) {
    assert.ok(source.includes(`data-testid="${specimen}"`), `missing ${specimen}`);
  }
  for (const component of ['PlainButton', 'Input', 'Textarea', 'StatusBadge', 'Skeleton', 'EmptyState', 'PlainDialog']) {
    assert.match(source, new RegExp(`<${component}(?:\\s|>)`));
  }
  assert.match(source, /aria-invalid/);
  assert.match(source, /htmlFor=/);
});
