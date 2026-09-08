import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('TicketUploadModal exposes deterministic states and mobile-safe upload controls', async () => {
  const source = await readFile(new URL('./TicketUploadModal.tsx', import.meta.url), 'utf8');

  assert.match(source, /interface TicketUploadInitialState/);
  assert.match(source, /analyzeTicketFile\?: typeof analyzeTicket/);
  assert.match(source, /initialState\?: TicketUploadInitialState/);
  assert.match(source, /^    analyzeTicketFile = analyzeTicket,$/m);
  assert.match(source, /^    initialState = {},$/m);
  assert.match(source, /data-testid="ticket-upload-error"/);
  assert.match(source, /<button[\s\S]*data-testid="ticket-upload-dropzone"/);
  assert.match(source, /grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4/);
  assert.match(source, /h-11 text-body sm:h-8/);
  assert.match(source, /grid grid-cols-1 gap-2 sm:col-span-3 sm:grid-cols-3/);
  assert.match(source, /const mobileBodyScrollStyle = \{ scrollPaddingBlock: '6rem' \} as const;/);
  assert.match(source, /bodyStyle=\{mobileBodyScrollStyle\}/);
  assert.doesNotMatch(source, /style=\{mobileFieldScrollStyle\}/);
  assert.doesNotMatch(source, /scroll-pb-24/);
  assert.match(source, /flex flex-col gap-6 pb-20 pt-1 sm:pb-1/);
  for (const id of ['away-team', 'home-team', 'section', 'row', 'seat']) {
    assert.match(source, new RegExp(`id="${id}"`));
  }
});
