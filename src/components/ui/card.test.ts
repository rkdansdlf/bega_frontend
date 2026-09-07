import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const cardSource = readFileSync(new URL('./card.tsx', import.meta.url), 'utf8');

test('card primitives contain long content and use compact mobile spacing', () => {
  assert.match(cardSource, /min-w-0 gap-4 overflow-hidden[^"\n]*sm:gap-6/);
  assert.match(cardSource, /px-4 pt-4 sm:px-6 sm:pt-6/);
  assert.match(cardSource, /px-4 sm:px-6/);
  assert.match(cardSource, /px-4 pb-4 sm:px-6 sm:pb-6/);
  assert.match(cardSource, /min-w-0 break-words \[overflow-wrap:anywhere\]/);
});

test('card header action stacks on mobile and footer actions can wrap', () => {
  assert.match(cardSource, /has-data-\[slot=card-action\]:grid-cols-1/);
  assert.match(
    cardSource,
    /sm:has-data-\[slot=card-action\]:grid-cols-\[minmax\(0,1fr\)_auto\]/,
  );
  assert.match(cardSource, /col-start-1 row-start-3/);
  assert.match(cardSource, /sm:col-start-2 sm:row-span-2 sm:row-start-1/);
  assert.match(cardSource, /flex flex-wrap items-center gap-2/);
});
