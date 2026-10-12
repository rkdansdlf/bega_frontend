#!/usr/bin/env node
import assert from 'node:assert/strict';

import { chromium } from 'playwright';

const BASE_URL = process.env.AUTH_SESSION_CROSS_TAB_BASE_URL ?? 'http://127.0.0.1:5183';
const APP_ORIGIN = new URL(BASE_URL).origin;
const VIEWER_A = {
  id: 101,
  email: 'viewer-a@example.test',
  name: 'Viewer A',
  handle: 'viewer-a',
  profileImageUrl: null,
  cheerPoints: 0,
};
const VIEWER_B = {
  id: 202,
  email: 'viewer-b@example.test',
  name: 'Viewer B',
  handle: 'viewer-b',
  profileImageUrl: null,
  cheerPoints: 0,
};

const waitFor = async (promise, label, timeoutMs = 15_000) => {
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const blockedExternalOrigins = [];
const syntheticApiRequests = [];
let releaseProfileResponse;
const profileResponseGate = new Promise((resolve) => { releaseProfileResponse = resolve; });
let profileRequestHeaders;
let markProfileRequestSeen;
const profileRequestSeen = new Promise((resolve) => { markProfileRequestSeen = resolve; });

try {
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== APP_ORIGIN) {
      blockedExternalOrigins.push(url.origin);
      await route.abort();
      return;
    }

    if (!url.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }

    syntheticApiRequests.push(url.pathname);
    if (url.pathname === '/api/auth/mypage') {
      profileRequestHeaders ??= route.request().headers();
      markProfileRequestSeen(profileRequestHeaders);
      await profileResponseGate;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: VIEWER_B }),
      });
      return;
    }

    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'SYNTHETIC_CROSS_TAB_TEST_ONLY' }),
    });
  });

  const sender = await context.newPage();
  const receiver = await context.newPage();
  const syncModuleRequest = receiver.waitForRequest(
    (request) => decodeURIComponent(request.url()).includes('/src/components/AuthSessionSync.tsx'),
  );

  await Promise.all([
    sender.goto(BASE_URL, { waitUntil: 'domcontentloaded' }),
    receiver.goto(BASE_URL, { waitUntil: 'domcontentloaded' }),
  ]);
  const syncRequest = await waitFor(syncModuleRequest, 'receiver auth-sync module');
  const syncResponse = await syncRequest.response();
  assert.equal(syncResponse?.status(), 200, 'receiver loads the app-root cross-tab sync component');
  await receiver.waitForTimeout(100);

  const oldProfileKey = await receiver.evaluate(async (viewer) => {
    const [{ useAuthStore }, { queryClient }, { profileQueryKeys }] = await Promise.all([
      import('/src/store/authStore.ts'),
      import('/src/lib/queryClient.ts'),
      import('/src/hooks/profileQueryKeys.ts'),
    ]);
    useAuthStore.setState({ user: viewer, isAuthLoading: false });
    const queryKey = profileQueryKeys.publicProfile('@viewer-a');
    queryClient.setQueryData(queryKey, {
      id: viewer.id,
      handle: viewer.handle,
      privateSentinel: 'viewer-a-profile-cache',
    });
    return JSON.stringify(queryKey);
  }, VIEWER_A);

  const signalBeforeLogin = await sender.evaluate(() => (
    localStorage.getItem('bega-auth-session-changed')
  ));
  await context.addCookies([{
    name: 'Authorization',
    value: 'synthetic-viewer-b-cookie',
    domain: new URL(BASE_URL).hostname,
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }]);

  await sender.evaluate(async (viewer) => {
    const { useAuthStore } = await import('/src/store/authStore.ts');
    useAuthStore.getState().login(
      viewer.email,
      viewer.name,
      null,
      'USER',
      undefined,
      viewer.id,
      viewer.cheerPoints,
      viewer.handle,
    );
  }, VIEWER_B);

  await sender.waitForFunction((previousValue) => (
    localStorage.getItem('bega-auth-session-changed') !== previousValue
  ), signalBeforeLogin);
  const cookieHeader = await waitFor(profileRequestSeen, 'receiver profile reauthentication');
  assert.match(cookieHeader.cookie ?? '', /(?:^|;\s*)Authorization=synthetic-viewer-b-cookie(?:;|$)/);

  const clearedState = await receiver.evaluate(async (serializedKey) => {
    const [{ useAuthStore }, { queryClient }] = await Promise.all([
      import('/src/store/authStore.ts'),
      import('/src/lib/queryClient.ts'),
    ]);
    return {
      userId: useAuthStore.getState().user?.id ?? null,
      isAuthLoading: useAuthStore.getState().isAuthLoading,
      oldProfileStillCached: queryClient.getQueryData(JSON.parse(serializedKey)) !== undefined,
    };
  }, oldProfileKey);
  assert.deepEqual(clearedState, {
    userId: null,
    isAuthLoading: true,
    oldProfileStillCached: false,
  }, 'receiver clears viewer A state before the shared-cookie profile request completes');

  releaseProfileResponse();
  await receiver.waitForFunction(async () => {
    const { useAuthStore } = await import('/src/store/authStore.ts');
    return useAuthStore.getState().user?.id === 202;
  });

  const finalState = await receiver.evaluate(async (serializedKey) => {
    const [{ useAuthStore }, { queryClient }] = await Promise.all([
      import('/src/store/authStore.ts'),
      import('/src/lib/queryClient.ts'),
    ]);
    return {
      userId: useAuthStore.getState().user?.id ?? null,
      isAuthLoading: useAuthStore.getState().isAuthLoading,
      oldProfileStillCached: queryClient.getQueryData(JSON.parse(serializedKey)) !== undefined,
    };
  }, oldProfileKey);
  assert.deepEqual(finalState, {
    userId: VIEWER_B.id,
    isAuthLoading: false,
    oldProfileStillCached: false,
  }, 'receiver authenticates viewer B without retaining viewer A private cache');
  assert.ok(syntheticApiRequests.includes('/api/auth/mypage'));
  process.stdout.write(JSON.stringify({
    result: 'PASS',
    senderViewer: VIEWER_B.id,
    receiverViewer: finalState.userId,
    oldViewerCacheClearedBeforeResponse: !clearedState.oldProfileStillCached,
    profileRequestUsedSharedSyntheticCookie: true,
    apiRequests: syntheticApiRequests,
    blockedExternalOrigins,
  }, null, 2) + '\n');
} finally {
  releaseProfileResponse();
  await browser.close();
}
