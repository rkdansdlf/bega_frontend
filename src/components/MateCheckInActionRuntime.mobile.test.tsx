import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateCheckInActionRuntime.tsx', import.meta.url);

test('mate check-in action keeps the mobile summary and chat route in every state', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-check-in-mobile-bar"/);
  assert.match(source, /data-testid="mate-check-in-mobile-chat"/);
  assert.match(source, /const mobileSummary =/);
  assert.match(source, /다른 참여자의 체크인을 기다리는 중/);
  assert.doesNotMatch(source, /\{primaryMobileAction \? \(\s*<div[^>]+mateMobileBarClass/);
});

test('mate check-in action exposes stable desktop and mobile action targets', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  for (const testId of [
    'mate-check-in-action-runtime',
    'mate-check-in-desktop-check-in',
    'mate-check-in-desktop-complete',
    'mate-check-in-desktop-chat',
    'mate-check-in-mobile-primary',
  ]) {
    assert.match(source, new RegExp(`data-testid="${testId}"`));
  }
});

test('mate check-in mobile action contains pressure content and preserves touch targets', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /min-w-0[^"\n]*overflow-hidden/);
  assert.match(source, /\[overflow-wrap:anywhere\]/);
  assert.ok((source.match(/size="touch"/g) ?? []).length >= 2);
  assert.match(source, /aria-live="polite"/);
});

