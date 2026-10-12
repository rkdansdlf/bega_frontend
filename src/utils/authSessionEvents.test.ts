import assert from 'node:assert/strict';
import test from 'node:test';

import {
  handleAuthSessionExpiredEvent,
  publishAuthSessionChanged,
  subscribeToAuthSessionChanges,
} from './authSessionEvents';

test('루트 auth session handler는 로컬 세션을 비우고 로그인 요구 상태를 연다', () => {
  const calls: string[] = [];

  handleAuthSessionExpiredEvent(new Event('auth-session-expired'), {
    logout: (skipServerLogout) => calls.push(`logout:${skipServerLogout}`),
    requireLogin: () => calls.push('requireLogin'),
  });

  assert.deepEqual(calls, ['logout:true', 'requireLogin']);
});

test('교차 탭 알림은 opaque storage 신호만 보내고 지정 키의 변경만 전달한다', () => {
  const tabBEvents = new EventTarget();
  let syncs = 0;
  const stopListening = subscribeToAuthSessionChanges(() => { syncs += 1; }, tabBEvents as unknown as Window);
  const tabAStorage = {
    setItem: (key: string, value: string) => {
      assert.equal(key, 'bega-auth-session-changed');
      assert.match(value, /^\d+:[a-z0-9]+$/);
      const event = Object.assign(new Event('storage'), { key, oldValue: null, newValue: value });
      tabBEvents.dispatchEvent(event);
    },
  };

  publishAuthSessionChanged(tabAStorage);
  tabBEvents.dispatchEvent(Object.assign(new Event('storage'), {
    key: 'unrelated-storage-key', oldValue: null, newValue: 'changed',
  }));
  stopListening();
  publishAuthSessionChanged(tabAStorage);

  assert.equal(syncs, 1);
});
