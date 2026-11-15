import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/dm/DirectMessageRuntime.tsx'),
  'utf8',
);

// 메시지 끝 요소에 scrollIntoView를 쓰면 메시지 영역뿐 아니라 창(window)까지 스크롤된다.
// 낮은 화면(가로로 눕힌 폰, 844x390 등)에서는 로드 직후 창이 54~258px 내려가
// "프로필로 돌아가기"가 sticky 상단바 뒤로 가려지거나 화면 밖으로 밀렸다.
test('DM 메시지 자동 스크롤은 창이 아니라 메시지 영역 안에서만 일어난다', () => {
  assert.match(source, /<div ref=\{messageViewportRef\} data-testid="dm-message-viewport"/);
  assert.match(source, /viewport\?\.scrollTo\(\{ top: viewport\.scrollHeight/);
  assert.doesNotMatch(source, /messagesEndRef/);
  // 입력창 포커스용 scrollIntoView(block: 'center')는 허용하고, 끝 정렬(block: 'end')만 막는다.
  assert.doesNotMatch(source, /scrollIntoView\(\{[^)]*block:\s*'end'/);
});
