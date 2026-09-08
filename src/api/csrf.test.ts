import assert from 'node:assert/strict';
import test from 'node:test';

import { getLogoutXsrfToken, readCookieValue } from './csrf';

test('readCookieValue는 정확한 cookie 이름을 찾고 URL encoding을 해제한다', () => {
  assert.equal(
    readCookieValue('theme=dark; XSRF-TOKEN=csrf-token%2Evalue; XSRF-TOKEN-OLD=stale', 'XSRF-TOKEN'),
    'csrf-token.value',
  );
  assert.equal(readCookieValue('XSRF-TOKEN-OLD=stale', 'XSRF-TOKEN'), null);
});

test('readCookieValue는 빈 값과 control character가 포함된 값을 거부한다', () => {
  assert.equal(readCookieValue('XSRF-TOKEN=', 'XSRF-TOKEN'), null);
  assert.equal(readCookieValue('XSRF-TOKEN=unsafe%0D%0Aheader', 'XSRF-TOKEN'), null);
});

test('getLogoutXsrfToken은 document.cookie 접근이 차단되어도 토큰을 노출하지 않는다', (t) => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: Object.defineProperty({}, 'cookie', {
      get() {
        throw new Error('cookie access blocked');
      },
    }),
  });
  t.after(() => {
    delete (globalThis as { document?: unknown }).document;
  });

  assert.equal(getLogoutXsrfToken(), null);
});
