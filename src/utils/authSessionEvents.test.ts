import assert from 'node:assert/strict';
import test from 'node:test';

import { handleAuthSessionExpiredEvent } from './authSessionEvents';

test('루트 auth session handler는 로컬 세션을 비우고 로그인 요구 상태를 연다', () => {
  const calls: string[] = [];

  handleAuthSessionExpiredEvent(new Event('auth-session-expired'), {
    logout: (skipServerLogout) => calls.push(`logout:${skipServerLogout}`),
    requireLogin: () => calls.push('requireLogin'),
  });

  assert.deepEqual(calls, ['logout:true', 'requireLogin']);
});
