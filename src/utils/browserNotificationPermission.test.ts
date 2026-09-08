import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
} from './browserNotificationPermission';

test('브라우저 알림 권한은 지원 여부를 안전하게 판별한다', () => {
  assert.equal(getBrowserNotificationPermission(undefined), 'unsupported');
  assert.equal(getBrowserNotificationPermission({ permission: 'denied' }), 'denied');
});

test('명시 호출 시에만 브라우저 알림 권한을 요청한다', async () => {
  let requestCount = 0;
  const permission = await requestBrowserNotificationPermission({
    permission: 'default',
    requestPermission: async () => {
      requestCount += 1;
      return 'granted';
    },
  });

  assert.equal(permission, 'granted');
  assert.equal(requestCount, 1);
});
