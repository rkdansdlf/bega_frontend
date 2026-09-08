import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateApplyTicketVerificationPanel.tsx', import.meta.url);

test('ticket verification panel exposes deterministic scanning only outside production', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /visualQaStateOverride/);
  assert.match(source, /data-testid="mate-apply-ticket-panel"/);
  assert.match(source, /visualQaStateOverride\?\.isScanning \?\? runtimeIsScanning/);
});

test('ticket upload and reset actions are keyboard reachable and mobile sized', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-ticket-upload"/);
  assert.match(source, /role="button"/);
  assert.match(source, /tabIndex=\{isScanning \? -1 : 0\}/);
  assert.match(source, /event\.key === 'Enter' \|\| event\.key === ' '/);
  assert.match(source, /focus-visible:ring-2/);
  assert.match(source, /active:scale-\[0\.98\]/);
  assert.match(source, /data-testid="mate-ticket-reset"/);
  assert.match(source, /w-full[^"\n]*sm:w-auto/);
  assert.match(source, /focus-visible:ring-inset/);
});

test('ticket scanning and pressure metadata stay announced and contained at 320px', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-ticket-scanning"/);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /min-w-0[^"\n]*\[overflow-wrap:anywhere\]/);
});
