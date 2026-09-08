import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateChatViewRuntime.tsx', import.meta.url);

test('mate chat view exposes every mobile navigation action with a stable target', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-chat-view"/);
  assert.match(source, /min-h-dvh[^"\n]*min-w-0[^"\n]*overflow-x-clip/);
  assert.match(source, /data-testid="mate-chat-view-back"/);
  assert.match(source, /data-testid="mate-chat-view-detail"/);
  assert.match(source, /data-testid="mate-chat-view-manage"/);
  assert.match(source, /data-testid="mate-chat-view-check-in"/);
  assert.match(source, /size="touch"/);
});

test('mate chat view contains unbroken summary and party metadata', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /text-base font-bold[^"\n]*\[overflow-wrap:anywhere\]/);
  assert.match(source, /text-body text-gray-500[^"\n]*\[overflow-wrap:anywhere\]/);
  assert.match(source, /font-semibold text-gray-900[^"\n]*\[overflow-wrap:anywhere\]/);
});

test('mate chat view replaces the null conversation fallback outside production only', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /visualQaConversationPhase\?: 'fallback' \| 'runtime'/);
  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /conversationPhase === 'fallback'/);
  assert.match(source, /data-testid="mate-chat-conversation-fallback"/);
  assert.match(source, /aria-label="대화 기록 준비 중"/);
  assert.doesNotMatch(source, /<Suspense fallback=\{null\}>/);
});
