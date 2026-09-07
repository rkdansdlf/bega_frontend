import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateApply.tsx', import.meta.url);

test('mate apply exposes deterministic route and ticket phases only outside production', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /visualQaStateOverride/);
  assert.match(source, /ticketPanelPhase/);
  assert.match(source, /paymentCapability/);
  assert.match(source, /data-testid="mate-apply"/);
  assert.match(source, /enabled: visualQaStateOverride == null/);
});

test('mate apply contains route errors, metadata, and amounts inside 320px', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /min-h-dvh[^"\n]*min-w-0[^"\n]*overflow-x-clip/);
  assert.match(source, /data-testid="mate-apply-error"/);
  assert.match(source, /\[overflow-wrap:anywhere\]/);
  assert.match(source, /max-w-full[^"\n]*whitespace-normal/);
  assert.match(source, /data-testid="mate-apply-back"/);
  assert.match(source, /data-testid="mate-apply-submit-mobile"/);
  assert.match(source, /break-all[^"\n]*text-right|text-right[^"\n]*break-all/);
});

test('mate apply ticket fallback is visible and announced in both themes', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-apply-ticket-fallback"/);
  assert.match(source, /aria-label="티켓 인증 화면 준비 중"/);
  assert.match(source, /dark:bg-white\/10/);
});

test('mate apply back action keeps explicit contrast in dark mode', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(
    source,
    /data-testid="mate-apply-back"[\s\S]*?className="[^"]*text-gray-800[^"]*dark:text-gray-100[^"]*"/,
  );
});
