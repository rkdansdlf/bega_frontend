import assert from 'node:assert/strict';
import test from 'node:test';

import {
  claimAuthSessionExpiry,
  getAuthSessionGeneration,
  markAuthSessionEstablished,
} from './authSessionGeneration';

test('auth session expiry claim은 같은 세대에서 한 번만 성공한다', () => {
  markAuthSessionEstablished();

  assert.equal(claimAuthSessionExpiry(), true);
  assert.equal(claimAuthSessionExpiry(), false);
});

test('새 인증 세션이 수립되면 expiry claim이 다시 열린다', () => {
  markAuthSessionEstablished();
  assert.equal(claimAuthSessionExpiry(), true);

  markAuthSessionEstablished();
  assert.equal(claimAuthSessionExpiry(), true);
});

test('이전 세대에서 늦게 도착한 실패는 새 세션을 만료시키지 않는다', () => {
  markAuthSessionEstablished();
  const previousGeneration = getAuthSessionGeneration();

  markAuthSessionEstablished();

  assert.equal(claimAuthSessionExpiry(previousGeneration), false);
  assert.equal(claimAuthSessionExpiry(), true);
});
