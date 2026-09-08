import assert from 'node:assert/strict';
import test from 'node:test';

import {
  confirmOAuthEmailChallengeFromSearch,
  getOAuthEmailChallengeEntry,
  removeOAuthEmailChallengeTokenFromSearch,
} from './oauthEmailChallenge';

test('지원하는 OAuth 이메일 오류와 challengeId만 챌린지 진입으로 해석한다', () => {
  assert.deepEqual(
    getOAuthEmailChallengeEntry('?error=oauth2_email_required&challengeId=challenge-1'),
    { challengeId: 'challenge-1', reason: 'oauth2_email_required' },
  );
  assert.deepEqual(
    getOAuthEmailChallengeEntry('?error=oauth2_email_verification_required&challengeId=challenge-2'),
    { challengeId: 'challenge-2', reason: 'oauth2_email_verification_required' },
  );
  assert.equal(getOAuthEmailChallengeEntry('?error=oauth2_email_required'), null);
  assert.equal(getOAuthEmailChallengeEntry('?error=oauth2_auth_failed&challengeId=challenge-3'), null);
});

test('확인 토큰을 URL query에서 제거하고 나머지 상태는 유지한다', () => {
  assert.equal(
    removeOAuthEmailChallengeTokenFromSearch('?challengeId=challenge-1&token=top-secret&redirect=%2Fhome'),
    '?challengeId=challenge-1&redirect=%2Fhome',
  );
  assert.equal(removeOAuthEmailChallengeTokenFromSearch('?token=top-secret'), '');
});

test('query 토큰을 먼저 URL에서 제거한 뒤 확인 함수에만 전달한다', async () => {
  const calls: string[] = [];

  const result = await confirmOAuthEmailChallengeFromSearch(
    '?challengeId=challenge-1&token=top-secret',
    (nextSearch) => calls.push(`replace:${nextSearch}`),
    async (token) => {
      calls.push(`confirm:${token}`);
      return 'VERIFIED';
    },
  );

  assert.equal(result, 'VERIFIED');
  assert.deepEqual(calls, [
    'replace:?challengeId=challenge-1',
    'confirm:top-secret',
  ]);
});

test('query에 확인 토큰이 없으면 API를 호출하지 않는다', async () => {
  let confirmationCalls = 0;

  await assert.rejects(
    confirmOAuthEmailChallengeFromSearch(
      '?challengeId=challenge-1',
      () => undefined,
      async () => {
        confirmationCalls += 1;
        return 'VERIFIED';
      },
    ),
    /이메일 확인 토큰이 없습니다/,
  );
  assert.equal(confirmationCalls, 0);
});
