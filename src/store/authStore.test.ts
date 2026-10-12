import test from 'node:test';
import assert from 'node:assert/strict';
import { createJSONStorage } from 'zustand/middleware';
import type { GlobalApiErrorDetail } from '../types/error';

import {
  getPersistedAuthBootstrapMeta,
  setPersistedAuthBootstrapMeta,
} from '../utils/authBootstrap';
import {
  claimAuthSessionExpiry,
  getAuthSessionGeneration,
  markAuthSessionEstablished,
} from '../api/authSessionGeneration';
import {
  AUTH_SESSION_CHANGED_STORAGE_KEY,
  publishAuthSessionChanged,
  subscribeToAuthSessionChanges,
} from '../utils/authSessionEvents';
import { refreshSessionFromSharedCookie } from '../utils/authSessionSyncRuntime';

const createStorage = () => {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    clear: () => {
      values.clear();
    },
  };
};

const installGlobalLocalStorage = (storage: ReturnType<typeof createStorage>) => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: storage,
  });
};

const initialStorage = createStorage();
installGlobalLocalStorage(initialStorage);

const { queryClient } = await import('../lib/queryClient');
const { authStoreApi, useAuthStore } = await import('./authStore');

const installPersistStorage = (storage: ReturnType<typeof createStorage>) => {
  useAuthStore.persist.setOptions({
    storage: createJSONStorage(() => storage),
  });
};

installPersistStorage(initialStorage);

test.afterEach(() => {
  queryClient.clear();
  useAuthStore.getState().reset();
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { localStorage?: unknown }).localStorage;
  installPersistStorage(createStorage());
});

test('fetchProfileAndAuthenticate는 성공한 프로필을 MyPage 쿼리 캐시에 저장한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage, '/mypage');

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => ({
    id: 7,
    email: 'slugger@example.com',
    name: 'Slugger',
    handle: 'slugger',
    favoriteTeam: 'LG',
    favoriteTeamColor: '#c00',
    role: 'ROLE_USER',
    profileImageUrl: null,
    provider: 'KAKAO',
    providerId: 'provider-1',
    bio: '직관 기록 중',
    cheerPoints: 120,
    hasPassword: false,
  }) as never);

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate();
  const cachedProfile = queryClient.getQueryData(['userProfile', 7]);

  assert.equal(didAuthenticate, true);
  assert.deepEqual(cachedProfile, {
    id: 7,
    email: 'slugger@example.com',
    name: 'Slugger',
    handle: 'slugger',
    favoriteTeam: 'LG',
    favoriteTeamColor: '#c00',
    role: 'ROLE_USER',
    profileImageUrl: null,
    provider: 'KAKAO',
    providerId: 'provider-1',
    bio: '직관 기록 중',
    cheerPoints: 120,
    hasPassword: false,
  });
});

test('login and initial guest profile bootstrap establish a new session generation', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage, '/mypage');

  markAuthSessionEstablished();
  assert.equal(claimAuthSessionExpiry(), true);
  useAuthStore.getState().login('login@example.com', 'Login User', null, 'ROLE_USER', undefined, 11);
  assert.equal(claimAuthSessionExpiry(), true);

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => ({
    id: 11,
    email: 'login@example.com',
    name: 'Login User',
    handle: 'login-user',
    favoriteTeam: 'LG',
    favoriteTeamColor: '#c00',
    role: 'ROLE_USER',
    profileImageUrl: null,
    provider: 'KAKAO',
    providerId: 'provider-11',
    bio: null,
    cheerPoints: 0,
    hasPassword: false,
  }) as never);

  useAuthStore.getState().reset();
  await useAuthStore.getState().fetchProfileAndAuthenticate();
  assert.equal(claimAuthSessionExpiry(), true);
});

test('a successful login clears a stale login-required dialog from the previous session', async () => {
  const storage = createStorage();
  withWindowLocalStorage(storage, '/mate/create');
  useAuthStore.getState().requireLogin('/mate/create');
  assert.equal(useAuthStore.getState().showLoginRequiredDialog, true);
  assert.equal(useAuthStore.getState().pendingLoginRedirect, '/mate/create');

  useAuthStore.getState().login(
    'viewer-b@example.invalid',
    'Viewer B',
    null,
    'ROLE_USER',
    undefined,
    202,
  );
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.equal(useAuthStore.getState().user?.id, 202);
  assert.equal(useAuthStore.getState().showLoginRequiredDialog, false);
  assert.equal(useAuthStore.getState().pendingLoginRedirect, null);
  assert.ok(storage.getItem(AUTH_SESSION_CHANGED_STORAGE_KEY));
});

const withWindowLocalStorage = (
  storage: ReturnType<typeof createStorage>,
  pathname = '/prediction',
) => {
  installPersistStorage(storage);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      localStorage: storage,
      location: {
        pathname,
      },
    } as Window & { localStorage: typeof storage },
  });
};

test('다른 탭의 계정 변경은 사용자 캐시를 먼저 비우고 공유 쿠키로 재인증한다', async (t) => {
  withWindowLocalStorage(createStorage(), '/mypage');
  const tabBEvents = new EventTarget();
  let syncRequest: Promise<boolean> | null = null;
  const stopListening = subscribeToAuthSessionChanges(() => {
    syncRequest = refreshSessionFromSharedCookie();
  }, tabBEvents as unknown as Window);
  t.after(stopListening);

  useAuthStore.getState().login('viewer-a@example.invalid', 'Viewer A', null, 'ROLE_USER', undefined, 101);
  queryClient.setQueryData(['userProfile', 101], { id: 101, email: 'viewer-a@example.invalid' });

  let stateAtProfileRequest: { userId: number | null; isAuthLoading: boolean; staleProfile: unknown } | null = null;
  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    stateAtProfileRequest = {
      userId: useAuthStore.getState().user?.id ?? null,
      isAuthLoading: useAuthStore.getState().isAuthLoading,
      staleProfile: queryClient.getQueryData(['userProfile', 101]),
    };
    return {
      id: 202,
      email: 'viewer-b@example.invalid',
      name: 'Viewer B',
      handle: 'viewer-b',
      favoriteTeam: null,
      favoriteTeamColor: null,
      role: 'ROLE_USER',
      profileImageUrl: null,
      provider: 'LOCAL',
      providerId: null,
      bio: null,
      cheerPoints: 0,
      hasPassword: true,
    } as never;
  });

  const tabAStorage = {
    setItem: (key: string, value: string) => {
      const event = Object.assign(new Event('storage'), {
        key,
        oldValue: null,
        newValue: value,
      });
      tabBEvents.dispatchEvent(event);
    },
  };

  publishAuthSessionChanged(tabAStorage);

  assert.equal(useAuthStore.getState().user, null);
  assert.equal(useAuthStore.getState().isAuthLoading, true);
  assert.equal(queryClient.getQueryData(['userProfile', 101]), undefined);
  assert.ok(syncRequest, 'the other tab should begin a cookie-backed profile check');

  assert.equal(await syncRequest, true);
  assert.deepEqual(stateAtProfileRequest, {
    userId: null,
    isAuthLoading: true,
    staleProfile: undefined,
  });
  assert.equal(useAuthStore.getState().user?.id, 202);
});

test('다른 탭의 로그아웃은 재인증 실패 뒤에도 이전 사용자와 캐시를 복구하지 않는다', async (t) => {
  withWindowLocalStorage(createStorage(), '/mypage');
  const tabBEvents = new EventTarget();
  let syncRequest: Promise<boolean> | null = null;
  const stopListening = subscribeToAuthSessionChanges(() => {
    syncRequest = refreshSessionFromSharedCookie();
  }, tabBEvents as unknown as Window);
  t.after(stopListening);

  useAuthStore.getState().login('viewer-a@example.invalid', 'Viewer A', null, 'ROLE_USER', undefined, 101);
  queryClient.setQueryData(['userProfile', 101], { id: 101, email: 'viewer-a@example.invalid' });
  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    throw Object.assign(new Error('session expired'), { status: 401 });
  });

  publishAuthSessionChanged({
    setItem: (key, value) => tabBEvents.dispatchEvent(Object.assign(new Event('storage'), {
      key,
      oldValue: null,
      newValue: value,
    })),
  });

  assert.ok(syncRequest);
  assert.equal(await syncRequest, false);
  assert.equal(useAuthStore.getState().user, null);
  assert.equal(useAuthStore.getState().isAuthLoading, false);
  assert.equal(queryClient.getQueryData(['userProfile', 101]), undefined);
});

for (const transition of ['account-switch', 'local-logout', 'server-logout'] as const) {
  test(`auth ${transition} drops ownerless drafts but preserves viewer-scoped drafts`, async (t) => {
    const localStorage = createStorage();
    const sessionStorage = createStorage();
    withWindowLocalStorage(localStorage, '/mate/77/apply');
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      writable: true,
      value: sessionStorage,
    });

    useAuthStore.getState().login('viewer-a@example.invalid', 'Viewer A', null, 'ROLE_USER', undefined, 71);
    sessionStorage.setItem('mateApplyDraft:77', 'ownerless-session-draft');
    sessionStorage.setItem('mateApplyDraft:77:viewer:71', 'viewer-a-session-draft');
    localStorage.setItem('prediction-storage', 'ownerless-local-draft');
    localStorage.setItem('prediction-storage:viewer:71', 'viewer-a-local-draft');

    if (transition === 'account-switch') {
      useAuthStore.getState().login('viewer-b@example.invalid', 'Viewer B', null, 'ROLE_USER', undefined, 202);
      assert.equal(useAuthStore.getState().user?.id, 202);
    } else if (transition === 'local-logout') {
      assert.equal(await useAuthStore.getState().logout(true), true);
      assert.equal(useAuthStore.getState().user, null);
    } else {
      t.mock.method(authStoreApi, 'logoutUser', async () => {});
      assert.equal(await useAuthStore.getState().logout(), true);
      assert.equal(useAuthStore.getState().user, null);
    }

    assert.equal(sessionStorage.getItem('mateApplyDraft:77'), null);
    assert.equal(localStorage.getItem('prediction-storage'), null);
    assert.equal(sessionStorage.getItem('mateApplyDraft:77:viewer:71'), 'viewer-a-session-draft');
    assert.equal(localStorage.getItem('prediction-storage:viewer:71'), 'viewer-a-local-draft');
  });
}

const AUTH_BOOTSTRAP_HINT_KEY = 'auth-bootstrap-hint';

const setAuthBootstrapHint = (storage: ReturnType<typeof createStorage>, enabled: boolean) => {
  if (enabled) {
    storage.setItem(AUTH_BOOTSTRAP_HINT_KEY, '1');
    return;
  }

  storage.removeItem(AUTH_BOOTSTRAP_HINT_KEY);
};

const hasAuthBootstrapHint = (storage: ReturnType<typeof createStorage>) => storage.getItem(AUTH_BOOTSTRAP_HINT_KEY) === '1';

const getAuthBootstrapMeta = () => getPersistedAuthBootstrapMeta();

const flushLogoutRequest = () => new Promise<void>((resolve) => setImmediate(resolve));
const flushAuthSessionSignal = () => new Promise<void>((resolve) => setImmediate(resolve));

const installLogoutSession = () => {
  const storage = createStorage();
  withWindowLocalStorage(storage, '/mypage');
  const errors: GlobalApiErrorDetail[] = [];
  window.dispatchEvent = (event: Event) => {
    assert.equal(event.type, 'global-api-error');
    errors.push((event as CustomEvent<GlobalApiErrorDetail>).detail);
    return true;
  };
  useAuthStore.getState().login('logout@example.com', 'Logout User', null, 'ROLE_USER', undefined, 71);
  const user = useAuthStore.getState().user;
  queryClient.setQueryData(['userProfile', 71], user);
  return { storage, errors, user };
};

const logoutUnavailable = {
  status: 503,
  data: { code: 'LOGOUT_REVOCATION_UNAVAILABLE' },
};

for (const mode of ['success', 'retry', 'local-only', 'guest'] as const) {
  test(`logout completion ends protected-route loading after ${mode}`, async (t) => {
    const { storage, errors } = installLogoutSession();
    window.location.pathname = '/messages';
    let calls = 0;
    t.mock.method(authStoreApi, 'logoutUser', async () => {
      if (++calls === 1 && mode === 'retry') throw logoutUnavailable;
    });

    if (mode === 'guest') {
      useAuthStore.getState().reset();
      assert.equal(useAuthStore.getState().isAuthLoading, true);
    }
    if (mode === 'retry') {
      assert.equal(await useAuthStore.getState().logout(), false);
      assert.equal(useAuthStore.getState().isAuthLoading, false);
      assert.equal(hasAuthBootstrapHint(storage), true);
      await errors[0].onRetry?.();
    } else {
      assert.equal(await useAuthStore.getState().logout(mode === 'local-only'), true);
    }

    assert.equal(useAuthStore.getState().user, null);
    assert.equal(useAuthStore.getState().isAuthLoading, false);
    assert.equal(useAuthStore.getState().publicAuthBootstrapPhase, 'idle');
    assert.equal(hasAuthBootstrapHint(storage), false);
    assert.equal(getAuthBootstrapMeta(), null);
    assert.equal(queryClient.getQueryData(['userProfile', 71]), undefined);
    assert.equal(calls, mode === 'retry' ? 2 : mode === 'success' ? 1 : 0);
  });
}

test('protected-route reset still initializes bootstrap loading', async () => {
  installLogoutSession();
  window.location.pathname = '/messages';
  await useAuthStore.getState().logout(true);
  useAuthStore.getState().reset();
  assert.equal(useAuthStore.getState().user, null);
  assert.equal(useAuthStore.getState().isAuthLoading, true);
});

test('logout keeps the session pending, deduplicates requests and clears it on success', async (t) => {
  const { storage, errors, user } = installLogoutSession();
  await flushAuthSessionSignal();
  const signalBeforeLogout = storage.getItem(AUTH_SESSION_CHANGED_STORAGE_KEY);
  let resolve!: () => void;
  const request = new Promise<void>((done) => { resolve = done; });
  const logout = t.mock.method(authStoreApi, 'logoutUser', () => request);
  t.after(async () => { resolve(); await flushLogoutRequest(); });

  const result = useAuthStore.getState().logout();
  assert.ok(result instanceof Promise);
  assert.equal(useAuthStore.getState().logout(), result);
  let settled = false;
  void result.then(() => { settled = true; });
  await flushLogoutRequest();
  await flushAuthSessionSignal();
  assert.equal(settled, false);
  assert.equal(logout.mock.callCount(), 1);
  assert.equal(useAuthStore.getState().user, user);
  assert.equal(hasAuthBootstrapHint(storage), true);
  assert.deepEqual(queryClient.getQueryData(['userProfile', 71]), user);
  assert.equal(storage.getItem(AUTH_SESSION_CHANGED_STORAGE_KEY), signalBeforeLogout);

  resolve();
  assert.equal(await result, true);
  await flushLogoutRequest();
  await flushAuthSessionSignal();

  assert.equal(useAuthStore.getState().user, null);
  assert.equal(hasAuthBootstrapHint(storage), false);
  assert.notEqual(storage.getItem(AUTH_SESSION_CHANGED_STORAGE_KEY), signalBeforeLogout);
  assert.equal(queryClient.getQueryData(['userProfile', 71]), undefined);
  assert.equal(errors.length, 0);
});

for (const [shape, failure] of [
  ['private client', logoutUnavailable],
  ['response wrapper', { response: logoutUnavailable }],
] as const) {
  test(`logout preserves authentication and offers a working retry on 503 (${shape})`, async (t) => {
    const { storage, errors, user } = installLogoutSession();
    await flushAuthSessionSignal();
    const signalBeforeLogout = storage.getItem(AUTH_SESSION_CHANGED_STORAGE_KEY);
    const meta = getAuthBootstrapMeta();
    let calls = 0;
    t.mock.method(authStoreApi, 'logoutUser', async () => {
      if (++calls === 1) throw failure;
    });

    const result = useAuthStore.getState().logout();
    assert.equal(useAuthStore.getState().logout(), result);
    assert.equal(await result, false);
    await flushLogoutRequest();
    await flushAuthSessionSignal();

    assert.equal(calls, 1);
    assert.equal(useAuthStore.getState().user, user);
    assert.equal(useAuthStore.getState().isAuthLoading, false);
    assert.equal(hasAuthBootstrapHint(storage), true);
    assert.deepEqual(getAuthBootstrapMeta(), meta);
    assert.deepEqual(queryClient.getQueryData(['userProfile', 71]), user);
    assert.equal(storage.getItem(AUTH_SESSION_CHANGED_STORAGE_KEY), signalBeforeLogout);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].statusCode, 503);
    assert.equal(errors[0].responseCode, 'LOGOUT_REVOCATION_UNAVAILABLE');
    assert.equal(errors[0].endpoint, '/auth/logout');
    assert.match(errors[0].message, /로그아웃.*못.*다시/);
    assert.equal(typeof errors[0].onRetry, 'function');

    await errors[0].onRetry?.();
    await flushLogoutRequest();
    await flushAuthSessionSignal();

    assert.equal(calls, 2);
    assert.equal(useAuthStore.getState().user, null);
    assert.equal(hasAuthBootstrapHint(storage), false);
    assert.notEqual(storage.getItem(AUTH_SESSION_CHANGED_STORAGE_KEY), signalBeforeLogout);
    assert.equal(queryClient.getQueryData(['userProfile', 71]), undefined);
    assert.equal(errors.length, 1);
  });
}

for (const [name, failure] of [
  ['expired session', { status: 401, data: { code: 'TOKEN_EXPIRED' } }],
  ['unrelated server error', { status: 503, data: { code: 'OTHER_ERROR' } }],
] as const) {
  test(`logout retains legacy local cleanup for ${name}`, async (t) => {
    const { storage, errors } = installLogoutSession();
    t.mock.method(authStoreApi, 'logoutUser', async () => { throw failure; });

    assert.equal(await useAuthStore.getState().logout(), true);
    await flushLogoutRequest();

    assert.equal(useAuthStore.getState().user, null);
    assert.equal(hasAuthBootstrapHint(storage), false);
    assert.equal(queryClient.getQueryData(['userProfile', 71]), undefined);
    assert.equal(errors.length, 0);
  });
}

test('logout(true) and guest logout clear local state without a server request', async (t) => {
  const { storage, errors } = installLogoutSession();
  await flushAuthSessionSignal();
  const signalBeforeLogout = storage.getItem(AUTH_SESSION_CHANGED_STORAGE_KEY);
  const logout = t.mock.method(authStoreApi, 'logoutUser', async () => {});

  const result = useAuthStore.getState().logout(true);
  assert.equal(useAuthStore.getState().user, null);
  assert.equal(hasAuthBootstrapHint(storage), false);
  assert.equal(queryClient.getQueryData(['userProfile', 71]), undefined);
  assert.equal(await result, true);
  await flushAuthSessionSignal();
  assert.notEqual(storage.getItem(AUTH_SESSION_CHANGED_STORAGE_KEY), signalBeforeLogout);
  assert.equal(await useAuthStore.getState().logout(), true);
  assert.equal(logout.mock.callCount(), 0);
  assert.equal(errors.length, 0);
});

for (const outcome of ['success', 'unavailable'] as const) {
  for (const transition of ['expired', 'new login', 'reset'] as const) {
    test(`late logout ${outcome} cannot overwrite ${transition}`, async (t) => {
      const { errors } = installLogoutSession();
      let resolve!: () => void;
      let reject!: (error: unknown) => void;
      const request = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
      t.mock.method(authStoreApi, 'logoutUser', () => request);
      t.after(async () => { resolve(); await flushLogoutRequest(); });

      const result = useAuthStore.getState().logout();
      await flushLogoutRequest();
      if (transition === 'expired') useAuthStore.getState().logout(true);
      if (transition === 'reset') useAuthStore.getState().reset();
      if (transition === 'new login') {
        useAuthStore.getState().login('new@example.com', 'New User', null, 'ROLE_USER', undefined, 72);
      }
      const currentUser = useAuthStore.getState().user;
      if (outcome === 'success') resolve();
      else reject(logoutUnavailable);
      assert.equal(await result, false);
      await flushLogoutRequest();

      assert.equal(useAuthStore.getState().user, currentUser);
      assert.equal(errors.length, 0);
    });
  }
}

test('a stale logout retry cannot log out a newly established session', async (t) => {
  const { errors } = installLogoutSession();
  const logout = t.mock.method(authStoreApi, 'logoutUser', async () => { throw logoutUnavailable; });
  useAuthStore.getState().logout();
  await flushLogoutRequest();
  assert.equal(errors.length, 1);

  useAuthStore.getState().login('new@example.com', 'New User', null, 'ROLE_USER', undefined, 72);
  errors[0].onRetry?.();
  await flushLogoutRequest();

  assert.equal(logout.mock.callCount(), 1);
  assert.equal(useAuthStore.getState().user?.id, 72);
});

test('logout returns a fresh successful result when retrying a failed revocation', async (t) => {
  installLogoutSession();
  let calls = 0;
  t.mock.method(authStoreApi, 'logoutUser', async () => {
    if (++calls === 1) throw logoutUnavailable;
  });

  const first = useAuthStore.getState().logout();
  assert.equal(await first, false);
  const retry = useAuthStore.getState().logout();
  assert.notEqual(retry, first);
  assert.equal(useAuthStore.getState().logout(), retry);
  assert.equal(await retry, true);
  assert.equal(calls, 2);
});

test('local-only logout clears synchronously and invalidates the pending result', async (t) => {
  installLogoutSession();
  let resolve!: () => void;
  const request = new Promise<void>((done) => { resolve = done; });
  t.mock.method(authStoreApi, 'logoutUser', () => request);
  t.after(async () => { resolve(); await flushLogoutRequest(); });

  const pending = useAuthStore.getState().logout();
  const local = useAuthStore.getState().logout(true);
  assert.equal(useAuthStore.getState().user, null);
  assert.equal(await local, true);
  const guest = useAuthStore.getState().logout();
  resolve();
  assert.equal(await guest, true);
  assert.equal(await pending, false);
});

test('logout converts synchronous API failures into a resolved false result', async (t) => {
  const { user, errors } = installLogoutSession();
  t.mock.method(authStoreApi, 'logoutUser', () => { throw logoutUnavailable; });

  assert.equal(await useAuthStore.getState().logout(), false);
  assert.equal(useAuthStore.getState().user, user);
  assert.equal(errors.length, 1);
});

const deferredLogout = () => {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};

const deferredProfile = () => {
  type Profile = Awaited<ReturnType<typeof authStoreApi.fetchCurrentUserProfile>>;
  let resolve!: (profile: Profile) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<Profile>((done, fail) => { resolve = done; reject = fail; });
  return {
    promise,
    resolve: (profile: Pick<Profile, 'id' | 'email'> & Partial<Profile>) => resolve({
      ...profile,
      profileImageUrl: profile.profileImageUrl ?? null,
      cheerPoints: profile.cheerPoints ?? 0,
    }),
    reject,
  };
};

test('profile race: same-user revalidation preserves generation and an existing logout retry', async (t) => {
  const { user, errors } = installLogoutSession();
  const generation = getAuthSessionGeneration();
  let calls = 0;
  t.mock.method(authStoreApi, 'logoutUser', async () => {
    if (++calls === 1) throw logoutUnavailable;
  });
  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => ({ ...user!, name: 'Revalidated' }));
  assert.equal(await useAuthStore.getState().logout(), false);
  assert.equal(await useAuthStore.getState().fetchProfileAndAuthenticate(), true);
  assert.equal(getAuthSessionGeneration(), generation);
  await errors[0].onRetry?.();
  assert.equal(calls, 2);
  assert.equal(useAuthStore.getState().user, null);
});

for (const order of ['profile-first', 'logout-first'] as const) {
  for (const outcome of ['success', '503'] as const) {
    test(`profile race: ${order} ${outcome} cannot undo logout intent`, async (t) => {
      const { user, errors, storage } = installLogoutSession();
      const profile = deferredProfile();
      const logout = deferredLogout();
      let isCurrentRequest: (() => boolean) | undefined;
      t.mock.method(authStoreApi, 'fetchCurrentUserProfile', (options: Parameters<typeof authStoreApi.fetchCurrentUserProfile>[0]) => {
        isCurrentRequest = options?.isCurrentRequest;
        return profile.promise;
      });
      let calls = 0;
      t.mock.method(authStoreApi, 'logoutUser', () => ++calls === 1 ? logout.promise : Promise.resolve());
      t.after(async () => { profile.resolve(user!); logout.resolve(); await flushLogoutRequest(); });
      const profileResult = useAuthStore.getState().fetchProfileAndAuthenticate();
      assert.equal(typeof isCurrentRequest, 'function');
      assert.equal(isCurrentRequest?.(), true);
      const logoutResult = useAuthStore.getState().logout();
      assert.equal(isCurrentRequest?.(), false);
      if (order === 'profile-first') {
        profile.resolve(user!);
        assert.equal(await profileResult, false);
      }
      if (outcome === 'success') logout.resolve();
      else logout.reject(logoutUnavailable);
      assert.equal(await logoutResult, outcome === 'success');
      if (order === 'logout-first') {
        profile.resolve(user!);
        assert.equal(await profileResult, false);
      }
      if (outcome === '503') {
        assert.equal(useAuthStore.getState().user, user);
        assert.equal(hasAuthBootstrapHint(storage), true);
        assert.equal(errors.length, 1);
        await errors[0].onRetry?.();
        assert.equal(calls, 2);
      }
      assert.equal(useAuthStore.getState().user, null);
      assert.equal(useAuthStore.getState().isAuthLoading, false);
      assert.equal(getAuthBootstrapMeta(), null);
      assert.equal(queryClient.getQueryData(['userProfile', 71]), undefined);
    });
  }
}

for (const transition of ['same-user-login', 'other-user-login', 'local-logout', 'reset'] as const) {
  for (const outcome of ['success', 'failure'] as const) {
    test(`profile race: late ${outcome} cannot overwrite ${transition}`, async (t) => {
      const { user, storage } = installLogoutSession();
      const pending = deferredProfile();
      t.mock.method(authStoreApi, 'fetchCurrentUserProfile', () => pending.promise);
      t.after(async () => { pending.resolve(user!); await flushLogoutRequest(); });
      const result = useAuthStore.getState().fetchProfileAndAuthenticate();
      if (transition === 'local-logout') await useAuthStore.getState().logout(true);
      else if (transition === 'reset') useAuthStore.getState().reset();
      else useAuthStore.getState().login('next@example.invalid', 'Next', null, 'ROLE_USER', undefined,
        transition === 'same-user-login' ? 71 : 72);
      const state = useAuthStore.getState();
      const meta = getAuthBootstrapMeta();
      const hint = hasAuthBootstrapHint(storage);
      const cache = queryClient.getQueryData(['userProfile', 71]);
      if (outcome === 'success') pending.resolve({ ...user!, name: 'Obsolete' });
      else pending.reject({ status: 401 });
      assert.equal(await result, false);
      assert.equal(useAuthStore.getState(), state);
      assert.deepEqual(getAuthBootstrapMeta(), meta);
      assert.equal(hasAuthBootstrapHint(storage), hint);
      assert.equal(queryClient.getQueryData(['userProfile', 71]), cache);
    });
  }
}

test('profile race: obsolete optional finally cannot clear a newer request or its phase', async (t) => {
  const { user } = installLogoutSession();
  window.location.pathname = '/home';
  const first = deferredProfile();
  const second = deferredProfile();
  let calls = 0;
  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', () => ++calls === 1 ? first.promise : second.promise);
  t.after(async () => { first.resolve(user!); second.resolve(user!); await flushLogoutRequest(); });
  const a = useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });
  useAuthStore.getState().login('next@example.invalid', 'Next', null, 'ROLE_USER', undefined, 72);
  const b = useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });
  assert.equal(calls, 2);
  first.resolve(user!);
  assert.equal(await a, false);
  assert.equal(useAuthStore.getState().publicAuthBootstrapPhase, 'running');
  const duplicate = useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });
  assert.equal(calls, 2);
  second.resolve({ ...user!, id: 72 });
  assert.equal(await b, true);
  assert.equal(await duplicate, true);
  assert.equal(useAuthStore.getState().publicAuthBootstrapPhase, 'idle');
});

test('profile race: same-session fetch is blocked while logout is pending and resumes after 503', async (t) => {
  const { user } = installLogoutSession();
  const logout = deferredLogout();
  t.mock.method(authStoreApi, 'logoutUser', () => logout.promise);
  const profile = t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => user!);
  t.after(async () => { logout.resolve(); await flushLogoutRequest(); });
  const result = useAuthStore.getState().logout();
  assert.equal(await useAuthStore.getState().fetchProfileAndAuthenticate(), false);
  assert.equal(profile.mock.callCount(), 0);
  logout.reject(logoutUnavailable);
  assert.equal(await result, false);
  assert.equal(await useAuthStore.getState().fetchProfileAndAuthenticate(), true);
  assert.equal(profile.mock.callCount(), 1);
});

for (const firstOutcome of ['success', 'unavailable'] as const) {
  test(`a new session logout waits for the previous ${firstOutcome} then sends its own request`, async (t) => {
    const { errors } = installLogoutSession();
    const first = deferredLogout();
    const second = deferredLogout();
    const requestedUsers: Array<number | undefined> = [];
    t.mock.method(authStoreApi, 'logoutUser', () => {
      requestedUsers.push(useAuthStore.getState().user?.id);
      return requestedUsers.length === 1 ? first.promise : second.promise;
    });
    t.after(async () => { first.resolve(); second.resolve(); await flushLogoutRequest(); });

    const a = useAuthStore.getState().logout();
    await flushLogoutRequest();
    useAuthStore.getState().login('b@example.com', 'B', null, 'ROLE_USER', undefined, 72);
    const b = useAuthStore.getState().logout();
    assert.notEqual(b, a);
    assert.equal(useAuthStore.getState().logout(), b);
    await flushLogoutRequest();
    assert.deepEqual(requestedUsers, [71]);

    if (firstOutcome === 'success') first.resolve();
    else first.reject(logoutUnavailable);
    assert.equal(await a, false);
    await flushLogoutRequest();
    assert.deepEqual(requestedUsers, [71, 72]);
    assert.equal(useAuthStore.getState().user?.id, 72);
    assert.equal(useAuthStore.getState().logout(), b);

    second.resolve();
    assert.equal(await b, true);
    assert.equal(useAuthStore.getState().user, null);
    assert.equal(errors.length, 0);
  });
}

for (const transition of ['new user', 'same user new session', 'expired', 'reset'] as const) {
  test(`a queued logout sends no request after ${transition}`, async (t) => {
    const { errors } = installLogoutSession();
    const first = deferredLogout();
    const logout = t.mock.method(authStoreApi, 'logoutUser', () => first.promise);
    t.after(async () => { first.resolve(); await flushLogoutRequest(); });

    const a = useAuthStore.getState().logout();
    await flushLogoutRequest();
    useAuthStore.getState().login('b@example.com', 'B', null, 'ROLE_USER', undefined, 72);
    const b = useAuthStore.getState().logout();
    assert.notEqual(b, a);
    if (transition === 'new user' || transition === 'same user new session') {
      useAuthStore.getState().login('next@example.com', 'Next', null, 'ROLE_USER', undefined,
        transition === 'new user' ? 73 : 72);
    } else if (transition === 'expired') {
      const local = useAuthStore.getState().logout(true);
      assert.equal(useAuthStore.getState().user, null);
      assert.equal(await local, true);
    } else {
      useAuthStore.getState().reset();
    }
    const currentUser = useAuthStore.getState().user;
    first.resolve();

    assert.equal(await a, false);
    assert.equal(await b, false);
    assert.equal(logout.mock.callCount(), 1);
    assert.equal(useAuthStore.getState().user, currentUser);
    assert.equal(errors.length, 0);
  });
}

test('a third session logout skips an obsolete queued session and stays serialized', async (t) => {
  installLogoutSession();
  const first = deferredLogout();
  const third = deferredLogout();
  const requestedUsers: Array<number | undefined> = [];
  t.mock.method(authStoreApi, 'logoutUser', () => {
    requestedUsers.push(useAuthStore.getState().user?.id);
    return requestedUsers.length === 1 ? first.promise : third.promise;
  });
  t.after(async () => { first.resolve(); third.resolve(); await flushLogoutRequest(); });

  const a = useAuthStore.getState().logout();
  await flushLogoutRequest();
  useAuthStore.getState().login('b@example.com', 'B', null, 'ROLE_USER', undefined, 72);
  const b = useAuthStore.getState().logout();
  useAuthStore.getState().login('c@example.com', 'C', null, 'ROLE_USER', undefined, 73);
  const c = useAuthStore.getState().logout();
  assert.notEqual(c, b);
  assert.equal(useAuthStore.getState().logout(), c);
  await flushLogoutRequest();
  assert.deepEqual(requestedUsers, [71]);

  first.resolve();
  assert.equal(await a, false);
  assert.equal(await b, false);
  await flushLogoutRequest();
  assert.deepEqual(requestedUsers, [71, 73]);
  assert.equal(useAuthStore.getState().logout(), c);
  third.resolve();
  assert.equal(await c, true);
});

test('익명 prediction 초기화는 auth loading을 즉시 해제한다', () => {
  const storage = createStorage();
  withWindowLocalStorage(storage, '/prediction');

  useAuthStore.getState().reset();

  assert.equal(useAuthStore.getState().isAuthLoading, false);
});

test('fetchProfileAndAuthenticate는 프로필 조회 성공 시 true를 반환하고 user를 저장한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage);

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => ({
    id: 7,
    email: 'slugger@example.com',
    name: 'Slugger',
    handle: 'slugger',
    favoriteTeam: 'LG',
    favoriteTeamColor: '#c00',
    role: 'ROLE_USER',
    profileImageUrl: null,
    provider: 'KAKAO',
    providerId: 'provider-1',
    bio: null,
    cheerPoints: 120,
    hasPassword: false,
  }) as never);

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate();
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, true);
  assert.equal(state.user?.email, 'slugger@example.com');
  assert.equal(state.user?.handle, 'slugger');
  assert.equal(state.isAuthLoading, false);
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
  assert.equal(hasAuthBootstrapHint(storage), true);
  assert.deepEqual(getAuthBootstrapMeta(), {
    version: 1,
    lastSuccessAt: getAuthBootstrapMeta()?.lastSuccessAt ?? null,
    lastFailureAt: null,
  });
});

test('fetchProfileAndAuthenticate는 401 실패 시 auth bootstrap hint를 초기화한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage);
  setAuthBootstrapHint(storage, true);

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    throw { response: { status: 401 } };
  });

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate();
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, false);
  assert.equal(state.user, null);
  assert.equal(state.isAuthLoading, false);
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
  assert.equal(hasAuthBootstrapHint(storage), false);
  assert.deepEqual(getAuthBootstrapMeta(), {
    version: 1,
    lastSuccessAt: null,
    lastFailureAt: getAuthBootstrapMeta()?.lastFailureAt ?? null,
  });
});

test('fetchProfileAndAuthenticate는 5xx 실패 시 auth bootstrap hint는 유지한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage);
  setAuthBootstrapHint(storage, true);

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    throw { response: { status: 502 } };
  });

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate();
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, false);
  assert.equal(state.user, null);
  assert.equal(state.isAuthLoading, false);
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
  assert.equal(hasAuthBootstrapHint(storage), true);
  assert.deepEqual(getAuthBootstrapMeta(), {
    version: 1,
    lastSuccessAt: null,
    lastFailureAt: getAuthBootstrapMeta()?.lastFailureAt ?? null,
  });
});

test('fetchProfileAndAuthenticate는 프로필 조회 실패 시 false를 반환하고 auth state를 비운다', async (t) => {
  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    throw new Error('profile failed');
  });

  useAuthStore.getState().login(
    'before@example.com',
    'Before',
    null,
    'ROLE_USER',
    undefined,
    3,
    0,
    'before',
  );

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate();
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, false);
  assert.equal(state.user, null);
  assert.equal(state.isAuthLoading, false);
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
});

test('public-optional bootstrap 401 실패는 사용자 state를 비우지 않고 hint/meta만 정리한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage);
  setAuthBootstrapHint(storage, true);
  const fetchOptions: Array<{ retryOn401?: boolean } | undefined> = [];

  useAuthStore.getState().login(
    'viewer@example.com',
    'Viewer',
    null,
    'ROLE_USER',
    undefined,
    11,
    0,
    'viewer',
  );

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async (options?: { retryOn401?: boolean }) => {
    fetchOptions.push(options);
    throw { response: { status: 401 } };
  });

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, false);
  assert.equal(state.user?.email, 'viewer@example.com');
  assert.equal(state.isAuthLoading, false);
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
  assert.equal(fetchOptions.length, 1);
  assert.equal(fetchOptions[0]?.retryOn401, false);
  assert.equal(hasAuthBootstrapHint(storage), false);
  assert.deepEqual(getAuthBootstrapMeta(), {
    version: 1,
    lastSuccessAt: null,
    lastFailureAt: getAuthBootstrapMeta()?.lastFailureAt ?? null,
  });
});

test('cheer public-optional bootstrap 401 실패는 공개 페이지 사용자 state를 비우지 않는다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage, '/cheer');
  setAuthBootstrapHint(storage, true);
  const fetchOptions: Array<{ retryOn401?: boolean } | undefined> = [];

  useAuthStore.getState().login(
    'cheer-viewer@example.com',
    'Cheer Viewer',
    null,
    'ROLE_USER',
    undefined,
    31,
    0,
    'cheer-viewer',
  );

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async (options?: { retryOn401?: boolean }) => {
    fetchOptions.push(options);
    throw { response: { status: 401 } };
  });

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, false);
  assert.equal(state.user?.email, 'cheer-viewer@example.com');
  assert.equal(state.isAuthLoading, false);
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
  assert.equal(fetchOptions.length, 1);
  assert.equal(fetchOptions[0]?.retryOn401, false);
  assert.equal(hasAuthBootstrapHint(storage), false);
  assert.deepEqual(getAuthBootstrapMeta(), {
    version: 1,
    lastSuccessAt: null,
    lastFailureAt: getAuthBootstrapMeta()?.lastFailureAt ?? null,
  });
});

test('public-optional bootstrap 5xx 실패는 hint를 유지하고 cooldown만 갱신한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage);
  useAuthStore.getState().login(
    'viewer@example.com',
    'Viewer',
    null,
    'ROLE_USER',
    undefined,
    11,
    0,
    'viewer',
  );

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    throw { response: { status: 503 } };
  });

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, false);
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
  assert.equal(hasAuthBootstrapHint(storage), true);
  assert.equal(getAuthBootstrapMeta()?.lastSuccessAt !== null, true);
  assert.equal(getAuthBootstrapMeta()?.lastFailureAt !== null, true);
});

test('public-optional bootstrap 성공은 running 이후 idle로 정리하고 user를 복구한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage, '/home');
  setAuthBootstrapHint(storage, true);

  type MockAuthProfile = Awaited<ReturnType<typeof authStoreApi.fetchCurrentUserProfile>>;
  let resolveProfile: ((value: MockAuthProfile) => void) | undefined;

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => new Promise<MockAuthProfile>((resolve) => {
    resolveProfile = resolve;
  }));

  const authenticatePromise = useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });

  assert.equal(useAuthStore.getState().publicAuthBootstrapPhase, 'running');

  assert.ok(resolveProfile);
  resolveProfile({
    id: 21,
    email: 'refresh@example.com',
    name: 'Refresh User',
    handle: 'refresh-user',
    favoriteTeam: 'HH',
    favoriteTeamColor: '#f60',
    role: 'ROLE_USER',
    profileImageUrl: null,
    provider: 'LOCAL',
    providerId: 'refresh-user',
    bio: null,
    cheerPoints: 5,
    hasPassword: true,
  });

  const didAuthenticate = await authenticatePromise;
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, true);
  assert.equal(state.user?.email, 'refresh@example.com');
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
});

test('public-optional bootstrap timeout 오류 후에도 idle로 복귀한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage, '/home');
  setAuthBootstrapHint(storage, true);

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    throw new Error('Request timed out after 10000ms');
  });

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });
  const state = useAuthStore.getState();

  assert.equal(didAuthenticate, false);
  assert.equal(state.publicAuthBootstrapPhase, 'idle');
});

test('public-optional bootstrap 연속 호출은 짧은 중복 윈도우에서 한 번만 요청한다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage);
  setAuthBootstrapHint(storage, true);
  let fetchCount = 0;

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    fetchCount += 1;
    throw { response: { status: 401 } };
  });

  const firstAttempt = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });
  const secondAttempt = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });

  assert.equal(firstAttempt, false);
  assert.equal(secondAttempt, false);
  assert.equal(fetchCount, 1);
  assert.equal(useAuthStore.getState().publicAuthBootstrapPhase, 'idle');
});

test('guest public-optional bootstrap은 persisted hint가 남아 있어도 짧은 중복 윈도우에서 재요청하지 않는다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage);
  setAuthBootstrapHint(storage, true);
  setPersistedAuthBootstrapMeta({
    version: 1,
    lastSuccessAt: Date.now(),
    lastFailureAt: null,
  });
  let fetchCount = 0;

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    fetchCount += 1;
    throw { response: { status: 503 } };
  });

  const firstAttempt = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });
  setAuthBootstrapHint(storage, true);
  setPersistedAuthBootstrapMeta({
    version: 1,
    lastSuccessAt: Date.now(),
    lastFailureAt: null,
  });
  const secondAttempt = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });

  assert.equal(firstAttempt, false);
  assert.equal(secondAttempt, false);
  assert.equal(fetchCount, 1);
  assert.equal(hasAuthBootstrapHint(storage), true);
  assert.equal(useAuthStore.getState().publicAuthBootstrapPhase, 'idle');
});

test('public-optional bootstrap은 현재 경로가 defer 대상이 아니면 요청하지 않는다', async (t) => {
  const storage = createStorage();
  withWindowLocalStorage(storage);
  let fetchCount = 0;

  Object.defineProperty(globalThis.window, 'location', {
    configurable: true,
    value: {
      pathname: '/prediction',
    },
  });

  t.mock.method(authStoreApi, 'fetchCurrentUserProfile', async () => {
    fetchCount += 1;
    throw { response: { status: 401 } };
  });

  const didAuthenticate = await useAuthStore.getState().fetchProfileAndAuthenticate({ mode: 'public-optional' });

  assert.equal(didAuthenticate, false);
  assert.equal(fetchCount, 0);
  assert.equal(useAuthStore.getState().publicAuthBootstrapPhase, 'idle');
});
