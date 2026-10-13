import test from 'node:test';
import assert from 'node:assert/strict';
import { getBlockedUsers, toggleBlockByHandle } from './blockApi';

test('toggleBlockByHandle는 handle 기반 액션 경로를 호출한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return new Response(JSON.stringify({
      blocked: true,
      blockedCount: 2,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await toggleBlockByHandle('@slug');

  assert.equal(response.blocked, true);
  assert.match(requestUrl, /\/api\/users\/profile\/%40slug\/block$/);
  assert.equal(requestInit?.method, 'POST');
});

test('getBlockedUsers는 handle 기반 목록 응답을 정규화한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return new Response(JSON.stringify({
      content: [
        {
          handle: '@blocked',
          name: 'Blocked User',
          profileImageUrl: null,
          favoriteTeam: 'LG',
          isFollowedByMe: false,
        },
      ],
      last: true,
      totalPages: 1,
      totalElements: 1,
      size: 20,
      number: 0,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await getBlockedUsers();

  assert.equal(response.content[0]?.handle, '@blocked');
  assert.equal(response.content[0]?.id, null);
  assert.match(requestUrl, /\/api\/users\/me\/blocked\?page=0&size=20$/);
});

test('getBlockedUsers forwards an explicit next page and custom page size', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return new Response(JSON.stringify({
      content: [{ handle: '@next-page', name: 'Next Page User' }],
      last: false,
      totalPages: 4,
      totalElements: 18,
      size: 5,
      number: 1,
    }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    });
  });

  const response = await getBlockedUsers(1, 5);

  assert.match(requestUrl, /\/api\/users\/me\/blocked\?page=1&size=5$/);
  assert.equal(response.content[0]?.handle, '@next-page');
  assert.equal(response.number, 1);
  assert.equal(response.size, 5);
  assert.equal(response.last, false);
});

test('getBlockedUsers normalizes nested page metadata in a response envelope', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    success: true,
    data: {
      content: [{ handle: '@enveloped', name: 'Enveloped User' }],
      page: {
        size: '5',
        number: '2',
        totalElements: '18',
        totalPages: '4',
      },
    },
  }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  }));

  const response = await getBlockedUsers(2, 5);

  assert.deepEqual(response, {
    content: [{
      id: null,
      handle: '@enveloped',
      name: 'Enveloped User',
      profileImageUrl: null,
      favoriteTeam: null,
      isFollowedByMe: false,
    }],
    last: false,
    totalPages: 4,
    totalElements: 18,
    size: 5,
    number: 2,
  });
});

test('getBlockedUsers marks the last valid nonempty page as terminal without an explicit last flag', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    content: [{ handle: '@last-page', name: 'Last Page User' }],
    page: { size: 5, number: 3, totalElements: 18, totalPages: 4 },
  }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  }));

  const response = await getBlockedUsers(3, 5);

  assert.equal(response.number, 3);
  assert.equal(response.content.length, 1);
  assert.equal(response.last, true);
});

test('getBlockedUsers marks an empty page beyond the available pages as terminal', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    success: true,
    data: {
      content: [],
      page: {
        size: 5,
        number: 4,
        totalElements: 18,
        totalPages: 4,
      },
    },
  }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  }));

  const response = await getBlockedUsers(4, 5);

  assert.deepEqual(response, {
    content: [],
    last: true,
    totalPages: 4,
    totalElements: 18,
    size: 5,
    number: 4,
  });
});
