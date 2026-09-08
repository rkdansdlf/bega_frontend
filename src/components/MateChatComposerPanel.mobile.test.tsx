import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceUrl = new URL('./MateChatComposerPanel.tsx', import.meta.url);

test('mate chat composer keeps every mobile control reachable and named', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /data-testid="mate-chat-composer-panel"/);
  assert.match(source, /min-w-0[^"\n]*overflow-x-clip/);
  assert.match(source, /aria-label="선택한 이미지 제거"/);
  assert.match(source, /size="iconTouch"/);
  assert.match(source, /aria-label="메시지 전송"/);
  assert.match(source, /className="h-11 min-w-0 flex-1"/);
  assert.match(source, /'연결 중… 전송 가능'/);
});

test('mate chat composer announces image upload and replaces a broken preview', async () => {
  const source = await readFile(sourceUrl, 'utf8');

  assert.match(source, /previewLoadFailed/);
  assert.match(source, /setPreviewLoadFailed\(false\)/);
  assert.match(source, /onError=\{\(\) => setPreviewLoadFailed\(true\)\}/);
  assert.match(source, /data-testid="mate-chat-preview-fallback"/);
  assert.match(source, /items-end[^"\n]*pb-2/);
  assert.match(source, /이미지를 미리볼 수 없습니다\./);
  assert.match(source, /role="status"/);
  assert.match(source, /aria-label="채팅 이미지 업로드 중"/);
});
