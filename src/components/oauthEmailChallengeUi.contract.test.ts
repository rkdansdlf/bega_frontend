import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (relativePath: string) => readFile(new URL(relativePath, import.meta.url), 'utf8');

test('로그인 화면은 OAuth 이메일 챌린지 query를 전용 패널로 연결한다', async () => {
  const source = await readSource('./Login.tsx');

  assert.match(source, /getOAuthEmailChallengeEntry\(location\.search\)/);
  assert.match(source, /<OAuthEmailChallengePanel/);
});

test('이메일 확인 링크는 공개 confirm 화면으로 라우팅한다', async () => {
  const [routesSource, confirmSource] = await Promise.all([
    readSource('./AppRoutes.tsx'),
    readSource('./OAuthEmailChallengeConfirm.tsx'),
  ]);

  assert.match(routesSource, /path="\/oauth\/email\/confirm"/);
  assert.match(confirmSource, /confirmOAuthEmailChallengeFromSearch/);
  assert.match(confirmSource, /replaceState/);
});
