import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateChat.tsx', import.meta.url);
const accessStateSourceUrl = new URL('./MateChatAccessStateRuntime.tsx', import.meta.url);

test('mate chat exposes deterministic route and approval states only outside production', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /MateChatVisualQaStateOverride/);
  assert.match(source, /visualQaStateOverride == null && Boolean\(party\?\.id/);
  assert.match(source, /approvedPhase: 'fallback'/);
});

test('mate chat loading and approval checks announce progress at mobile width', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-chat-loading"/);
  assert.match(source, /data-testid="mate-chat-approval-loading"/);
  assert.ok((source.match(/role="status"/g) ?? []).length >= 3);
  assert.ok((source.match(/aria-busy="true"/g) ?? []).length >= 3);
  assert.match(source, /min-h-dvh[^"\n]*min-w-0[^"\n]*overflow-x-clip/);
});

test('mate chat approved lazy fallback is stable, announced, and horizontally contained', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-chat-approved-fallback"/);
  assert.match(source, /aria-label="승인된 메이트 채팅 화면 준비 중"/);
  assert.match(source, /min-w-0[^"\n]*overflow-x-clip/);
  assert.match(source, /dark:bg-white\/10/);
});

test('mate chat access states contain pressure copy and expose every action target', async () => {
  const source = await readFile(accessStateSourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-chat-access-state"/);
  assert.match(source, /min-h-dvh[^"\n]*min-w-0[^"\n]*overflow-x-clip/);
  assert.match(source, /min-w-0[^"\n]*\[overflow-wrap:anywhere\]/);
  for (const testId of [
    'mate-chat-party-error-list',
    'mate-chat-login',
    'mate-chat-approval-retry',
    'mate-chat-approval-detail',
    'mate-chat-not-approved-back',
    'mate-chat-not-approved-detail',
  ]) {
    assert.match(source, new RegExp(`data-testid="${testId}"`));
  }
  assert.match(source, /data-testid="mate-chat-not-approved-back"[\s\S]*?dark:text-white/);
  assert.match(source, /mt-4 flex flex-col gap-2 sm:flex-row/);
  assert.ok((source.match(/min-h-11 w-full sm:w-auto/g) ?? []).length >= 2);
});
