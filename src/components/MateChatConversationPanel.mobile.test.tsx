import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateChatConversationPanel.tsx', import.meta.url);

test('mate chat conversation contains its complete mobile surface and controls', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-chat-conversation-panel"/);
  assert.match(source, /min-w-0[^"\n]*overflow-x-clip/);
  assert.match(source, /data-testid="mate-chat-retry"/);
  assert.match(source, /data-testid="mate-chat-load-older"/);
  assert.match(source, /\[overflow-wrap:anywhere\]/);
});

test('mate chat conversation replaces an unavailable attachment with localized guidance', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /alt="채팅 첨부 이미지"/);
  assert.match(source, /onError=\{\(event\) =>/);
  assert.match(source, /data-testid="mate-chat-attachment-fallback"/);
  assert.match(source, /첨부 이미지를 불러올 수 없습니다\./);
});

test('mate chat conversation exposes a deterministic non-production composer boundary', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /visualQaComposerPhase\?: 'fallback' \| 'runtime'/);
  assert.match(source, /import\.meta\.env\?\.PROD === true/);
  assert.match(source, /composerPhase === 'fallback'/);
  assert.match(source, /data-testid="mate-chat-composer-fallback"/);
  assert.match(source, /aria-label="메시지 작성 도구 준비 중"/);
});
