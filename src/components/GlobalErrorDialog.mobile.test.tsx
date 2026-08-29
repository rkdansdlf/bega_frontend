import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type Plugin, type ViteDevServer } from 'vite';

const frontendRoot = fileURLToPath(new URL('../../', import.meta.url));
const testPagePath = '/__global-error-dialog-test.html';
const testEntryPath = '/__global-error-dialog-test.tsx';
const testModuleId = '\0virtual:global-error-dialog-test';
const staleRetryCompletionMutation = process.env.GLOBAL_ERROR_DIALOG_MUTATE_STALE_CLOSE === '1';

const createGlobalErrorDialogTestPlugin = (): Plugin => ({
  name: 'global-error-dialog-actual-mount-test',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (request.url?.split('?')[0] !== testPagePath) {
        next();
        return;
      }
      try {
        const html = await server.transformIndexHtml(
          testPagePath,
          `<!doctype html><html><body><button id="outside-sentinel" type="button">외부 포커스</button><div id="root"></div><script type="module" src="${testEntryPath}"></script></body></html>`,
        );
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(html);
      } catch (error) {
        next(error);
      }
    });
  },
  resolveId(id) {
    return id === testEntryPath ? testModuleId : undefined;
  },
  load(id) {
    if (id !== testModuleId) return undefined;
    return `
      import React, { StrictMode, createElement } from 'react';
      import { createRoot } from 'react-dom/client';
      import GlobalErrorDialog from '/src/components/GlobalErrorDialog.tsx';
      import GlobalErrorDialogContent from '/src/components/GlobalErrorDialogContent.tsx';
      import '/src/index.css';

      const params = new URLSearchParams(window.location.search);
      const kind = params.get('kind') || 'root';
      const calls = {
        actionLog: [],
        close: 0,
        feedback: 0,
        feedbackPayloads: [],
        listenerAdds: 0,
        listenerRemoves: 0,
        network: 0,
        retry: 0,
        retryByErrorId: {},
        unrelated: 0,
      };
      const globalErrorListeners = new Set();
      const originalAdd = window.addEventListener.bind(window);
      const originalRemove = window.removeEventListener.bind(window);
      window.addEventListener = (type, listener, options) => {
        if (type === 'global-api-error') {
          calls.listenerAdds += 1;
          globalErrorListeners.add(listener);
        }
        return originalAdd(type, listener, options);
      };
      window.removeEventListener = (type, listener, options) => {
        if (type === 'global-api-error') {
          calls.listenerRemoves += 1;
          globalErrorListeners.delete(listener);
        }
        return originalRemove(type, listener, options);
      };
      const originalFetch = window.fetch.bind(window);
      window.fetch = (...args) => {
        calls.network += 1;
        return Promise.reject(new Error('Visual QA actual-mount test blocked fetch: ' + String(args[0])));
      };
      const originalSendBeacon = navigator.sendBeacon?.bind(navigator);
      navigator.sendBeacon = () => {
        calls.network += 1;
        return false;
      };
      const originalXhrOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (...args) {
        calls.network += 1;
        throw new Error('Visual QA actual-mount test blocked XHR: ' + String(args[1]));
      };

      const retryMode = params.get('retry') || 'resolve';
      const feedbackMode = params.get('feedback') || 'success';
      const never = () => new Promise(() => {});
      const onRetry = () => {
        calls.retry += 1;
        if (retryMode === 'reject') return Promise.reject(new Error('MOCK retry rejected'));
        if (retryMode === 'timeout') return never();
        return Promise.resolve();
      };
      const submitFeedback = (payload) => {
        calls.feedback += 1;
        calls.feedbackPayloads.push(payload);
        if (feedbackMode === 'failure') return Promise.resolve(false);
        if (feedbackMode === 'timeout') return never();
        return Promise.resolve(true);
      };
      const root = createRoot(document.getElementById('root'));
      let pendingRetry = null;
      const baseState = {
        isOpen: true,
        message: params.get('message') || 'MOCK 비생산 전역 오류',
        statusCode: params.get('status') === 'null' ? null : Number(params.get('status') || 500),
        errorId: params.get('errorId') || 'MOCK-ERROR-ID',
        source: params.get('source') || 'api',
        onRetry: params.get('retry') === 'missing' ? null : onRetry,
      };
      const contentProps = {
        ...baseState,
        prefixText: params.get('prefix') || '🚨 시스템 오류',
        closeErrorModal: () => { calls.close += 1; },
        visualQaSubmitFeedback: submitFeedback,
      };
      const renderContent = (props) => createElement(GlobalErrorDialogContent, {
        ...props,
        visualQaSubmitFeedback: submitFeedback,
      });
      const visualQaStateOverride = {
        active: true,
        onClose: () => { calls.close += 1; },
        phase: kind === 'fallback' ? 'fallback' : 'resolved',
        state: baseState,
      };
      const visualQaRenderers = { content: renderContent };

      const renderRoot = (key = 'stable') => root.render(createElement(
        StrictMode,
        null,
        createElement(GlobalErrorDialog, {
          key,
          visualQaRenderers,
          visualQaStateOverride,
        }),
      ));

      if (params.get('cypress') === 'true') window.Cypress = {};
      if (kind === 'content') {
        root.render(createElement(StrictMode, null, createElement(GlobalErrorDialogContent, contentProps)));
      } else if (kind === 'fallback' || kind === 'resolved') {
        renderRoot();
      } else if (kind === 'missing-renderer') {
        root.render(createElement(StrictMode, null, createElement(GlobalErrorDialog, {
          visualQaStateOverride: { active: true, phase: 'resolved', state: baseState },
        })));
      } else if (kind === 'malformed') {
        root.render(createElement(StrictMode, null, createElement(GlobalErrorDialog, {
          visualQaRenderers,
          visualQaStateOverride: { active: true, phase: 'resolved', state: { isOpen: 'yes' } },
        })));
      } else {
        root.render(createElement(StrictMode, null, createElement(GlobalErrorDialog, { key: 'stable' })));
      }

      window.__GLOBAL_ERROR_DIALOG_TEST__ = {
        calls,
        dispatch: (detail) => window.dispatchEvent(new CustomEvent('global-api-error', { detail })),
        dispatchDeferredRetry: (detail) => {
          let resolveRetry;
          let rejectRetry;
          const promise = new Promise((resolve, reject) => {
            resolveRetry = resolve;
            rejectRetry = reject;
          });
          pendingRetry = { errorId: detail.errorId, rejectRetry, resolveRetry };
          calls.actionLog.push('dispatch-deferred:' + detail.errorId);
          window.dispatchEvent(new CustomEvent('global-api-error', {
            detail: {
              ...detail,
              onRetry: () => {
                calls.retry += 1;
                calls.retryByErrorId[detail.errorId] = (calls.retryByErrorId[detail.errorId] || 0) + 1;
                calls.actionLog.push('retry:' + detail.errorId);
                return promise;
              },
            },
          }));
        },
        dispatchTrackedRetry: (detail) => {
          calls.actionLog.push('dispatch-tracked:' + detail.errorId);
          window.dispatchEvent(new CustomEvent('global-api-error', {
            detail: {
              ...detail,
              onRetry: () => {
                calls.retry += 1;
                calls.retryByErrorId[detail.errorId] = (calls.retryByErrorId[detail.errorId] || 0) + 1;
                calls.actionLog.push('retry:' + detail.errorId);
                return Promise.resolve();
              },
            },
          }));
        },
        effectiveListenerCount: () => globalErrorListeners.size,
        renderRoot: (key = 'stable') => {
          if (kind === 'root') {
            root.render(createElement(StrictMode, null, createElement(GlobalErrorDialog, { key })));
            return;
          }
          renderRoot(key);
        },
        restoreNetwork: () => {
          window.fetch = originalFetch;
          if (originalSendBeacon) navigator.sendBeacon = originalSendBeacon;
          XMLHttpRequest.prototype.open = originalXhrOpen;
        },
        settleDeferredRetry: (outcome) => {
          if (!pendingRetry) throw new Error('No pending retry');
          calls.actionLog.push('settle-' + outcome + ':' + pendingRetry.errorId);
          const current = pendingRetry;
          pendingRetry = null;
          if (outcome === 'reject') {
            current.rejectRetry(new Error('MOCK deferred retry rejected'));
            return;
          }
          current.resolveRetry();
        },
        unmount: () => root.unmount(),
      };
    `;
  },
  transform(code, id) {
    if (!staleRetryCompletionMutation || !id.endsWith('/src/components/GlobalErrorDialog.tsx')) {
      return undefined;
    }
    const retryAwait = 'await state.onRetry?.();';
    assert.ok(code.includes(retryAwait), 'stale-close mutation target must exist');
    return code.replace(retryAwait, `${retryAwait}\n            setState(initialState);`);
  },
});

type TestRuntime = {
  calls: {
    actionLog: string[];
    close: number;
    feedback: number;
    feedbackPayloads: Array<{ actionTaken: string; comment: string; eventId: string }>;
    listenerAdds: number;
    listenerRemoves: number;
    network: number;
    retry: number;
    retryByErrorId: Record<string, number>;
    unrelated: number;
  };
  dispatch: (detail: Record<string, unknown>) => void;
  dispatchDeferredRetry: (detail: {
    errorId: string;
    message: string;
    statusCode: number;
  }) => void;
  dispatchTrackedRetry: (detail: {
    errorId: string;
    message: string;
    statusCode: number;
  }) => void;
  effectiveListenerCount: () => number;
  renderRoot: (key?: string) => void;
  settleDeferredRetry: (outcome: 'resolve' | 'reject') => void;
  unmount: () => void;
};

const readRuntime = (page: Page) => page.evaluate(() => (
  window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime }
).__GLOBAL_ERROR_DIALOG_TEST__);

const readCalls = (page: Page) => page.evaluate(() => (
  window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime }
).__GLOBAL_ERROR_DIALOG_TEST__.calls);

const openPage = async (page: Page, port: number, query = '') => {
  const response = await page.goto(`http://127.0.0.1:${port}${testPagePath}${query}`);
  assert.equal(response?.status(), 200);
  await page.waitForFunction(() => Boolean((window as unknown as {
    __GLOBAL_ERROR_DIALOG_TEST__?: TestRuntime;
  }).__GLOBAL_ERROR_DIALOG_TEST__));
};

const withActualBrowser = async (
  run: (context: { browser: Browser; page: Page; port: number }) => Promise<void>,
) => {
  let server: ViteDevServer | undefined;
  let browser: Browser | undefined;
  try {
    server = await createServer({
      configFile: fileURLToPath(new URL('../../vite.visual-qa.config.ts', import.meta.url)),
      logLevel: 'silent',
      plugins: [createGlobalErrorDialogTestPlugin()],
      root: frontendRoot,
      server: { host: '127.0.0.1', port: 0, strictPort: false },
    });
    await server.listen();
    const address = server.httpServer?.address();
    assert.ok(address && typeof address !== 'string');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 320, height: 844 } });
    await run({ browser, page, port: address.port });
  } finally {
    await browser?.close();
    await server?.close();
  }
};

test('actual StrictMode root owns one listener, ignores suppressed events, keeps latest, and removes it on unmount', {
  timeout: 60_000,
}, async () => {
  await withActualBrowser(async ({ page, port }) => {
    await openPage(page, port, '?kind=root');
    assert.equal(await page.evaluate(() => (
      window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime }
    ).__GLOBAL_ERROR_DIALOG_TEST__.effectiveListenerCount()), 1);
    assert.deepEqual((await readCalls(page)).listenerAdds, 2);
    assert.deepEqual((await readCalls(page)).listenerRemoves, 1);

    await page.evaluate(() => (
      window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime }
    ).__GLOBAL_ERROR_DIALOG_TEST__.renderRoot());
    assert.equal(await page.evaluate(() => (
      window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime }
    ).__GLOBAL_ERROR_DIALOG_TEST__.effectiveListenerCount()), 1);
    assert.deepEqual((await readCalls(page)).listenerAdds, 2);
    assert.deepEqual((await readCalls(page)).listenerRemoves, 1);

    const ignoredEvents = [
      { message: 'MOCK invalid author', statusCode: 403, responseCode: 'INVALID_AUTHOR' },
      { message: 'MOCK request canceled', statusCode: 0 },
    ];
    for (const detail of ignoredEvents) {
      await page.evaluate((eventDetail) => (
        window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime }
      ).__GLOBAL_ERROR_DIALOG_TEST__.dispatch(eventDetail), detail);
      await page.waitForTimeout(20);
      assert.equal(await page.locator('[role="dialog"]').count(), 0);
      await page.evaluate(() => (
        window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime }
      ).__GLOBAL_ERROR_DIALOG_TEST__.dispatch({ message: 'MOCK valid after ignored', statusCode: 500 }));
      await page.locator('[role="dialog"]').waitFor();
      await page.getByTestId('global-error-dialog-confirm').click();
    }

    await page.evaluate(() => {
      window.history.replaceState({}, '', '/home');
      (window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime })
        .__GLOBAL_ERROR_DIALOG_TEST__.dispatch({
          endpoint: '/home/bootstrap',
          message: 'MOCK ignored home endpoint',
          statusCode: 500,
        });
    });
    await page.waitForTimeout(20);
    assert.equal(await page.getByText('MOCK ignored home endpoint').count(), 0);
    await page.evaluate(() => {
      window.history.replaceState({}, '', '/');
      (window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime })
        .__GLOBAL_ERROR_DIALOG_TEST__.dispatch({ message: 'MOCK valid after home ignore', statusCode: 500 });
    });
    await page.getByText('MOCK valid after home ignore').waitFor();
    await page.getByTestId('global-error-dialog-confirm').click();

    await page.evaluate(() => {
      const runtime = (window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime })
        .__GLOBAL_ERROR_DIALOG_TEST__;
      runtime.dispatch({ message: 'MOCK event A', statusCode: 404 });
      runtime.dispatch({ message: 'MOCK event B latest', statusCode: 409 });
    });
    await page.getByText('MOCK event B latest').waitFor();
    assert.equal(await page.getByText('MOCK event A').count(), 0);

    await page.evaluate(() => (
      window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime }
    ).__GLOBAL_ERROR_DIALOG_TEST__.unmount());
    assert.equal(await page.evaluate(() => (
      window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime }
    ).__GLOBAL_ERROR_DIALOG_TEST__.effectiveListenerCount()), 0);
    assert.deepEqual((await readCalls(page)).listenerAdds, 2);
    assert.deepEqual((await readCalls(page)).listenerRemoves, 2);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('global-api-error', {
      detail: { message: 'MOCK after unmount', statusCode: 500 },
    })));
    await page.waitForTimeout(20);
    assert.equal(await page.getByText('MOCK after unmount').count(), 0);
  });
});

test('actual Root fails closed for malformed/missing renderers and suppresses Cypress events', {
  timeout: 60_000,
}, async () => {
  await withActualBrowser(async ({ page, port }) => {
    for (const kind of ['missing-renderer', 'malformed']) {
      await openPage(page, port, `?kind=${kind}`);
      await page.waitForTimeout(40);
      assert.equal(await page.locator('[role="dialog"]').count(), 0, kind);
      assert.equal(await page.getByTestId('global-error-dialog-content-fallback').count(), 0, kind);
    }
    await openPage(page, port, '?kind=root&cypress=true');
    await page.evaluate(() => (
      window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime }
    ).__GLOBAL_ERROR_DIALOG_TEST__.dispatch({ message: 'MOCK Cypress suppressed', statusCode: 500 }));
    await page.waitForTimeout(40);
    assert.equal(await page.locator('[role="dialog"]').count(), 0);
  });
});

test('actual Root close paths and retry transports isolate the original callback exactly once', {
  timeout: 90_000,
}, async () => {
  await withActualBrowser(async ({ page, port }) => {
    const closeActions: Array<{ name: string; run: () => Promise<void> }> = [
      { name: 'header close', run: () => page.getByRole('button', { name: '닫기' }).click() },
      { name: 'confirm', run: () => page.getByTestId('global-error-dialog-confirm').click() },
      {
        name: 'backdrop',
        run: () => page.locator('[aria-hidden="true"]').first().evaluate((element) => (
          element as HTMLElement
        ).click()),
      },
      { name: 'Escape', run: () => page.keyboard.press('Escape') },
    ];
    for (const action of closeActions) {
      await openPage(page, port, '?kind=resolved');
      await page.getByTestId('global-error-dialog-content').waitFor();
      await action.run();
      await page.getByTestId('global-error-dialog-content').waitFor({ state: 'detached' });
      const calls = await readCalls(page);
      assert.equal(calls.close, 1, action.name);
      assert.equal(calls.retry, 0, action.name);
      assert.equal(calls.feedback, 0, action.name);
      assert.equal(calls.unrelated, 0, action.name);
      assert.equal(calls.network, 0, action.name);
    }

    for (const retryMode of ['resolve', 'reject', 'timeout']) {
      await openPage(page, port, `?kind=resolved&retry=${retryMode}`);
      await page.getByTestId('global-error-dialog-content').waitFor();
      await page.getByRole('button', { name: '다시 시도' }).click();
      await page.getByTestId('global-error-dialog-content').waitFor({ state: 'detached' });
      const calls = await readCalls(page);
      assert.equal(calls.close, 1, retryMode);
      assert.equal(calls.retry, 1, retryMode);
      assert.equal(calls.feedback, 0, retryMode);
      assert.equal(calls.network, 0, retryMode);
    }

    await openPage(page, port, '?kind=resolved&retry=timeout');
    await page.getByTestId('global-error-dialog-content').waitFor();
    await page.getByRole('button', { name: '다시 시도' }).dblclick({ delay: 1 });
    await page.getByTestId('global-error-dialog-content').waitFor({ state: 'detached' });
    const rapidCalls = await readCalls(page);
    assert.equal(rapidCalls.close, 1);
    assert.equal(rapidCalls.retry, 1);
    assert.equal(rapidCalls.feedback, 0);
    assert.equal(rapidCalls.network, 0);
  });
});

test('actual root exposes a named visible busy status for the lazy fallback', {
  timeout: 60_000,
}, async () => {
  await withActualBrowser(async ({ page, port }) => {
    await openPage(page, port, '?kind=fallback');
    const fallback = page.getByTestId('global-error-dialog-content-fallback');
    await fallback.waitFor();
    assert.equal(await fallback.getAttribute('role'), 'status');
    assert.equal(await fallback.getAttribute('aria-busy'), 'true');
    assert.match(await fallback.innerText(), /오류 안내.*불러오는 중/);
  });
});

test('actual Content exposes owned selectors and uses only the injected static feedback submitter', {
  timeout: 60_000,
}, async () => {
  await withActualBrowser(async ({ page, port }) => {
    await openPage(page, port, '?kind=content&feedback=success&source=api');
    const dialog = page.getByTestId('global-error-dialog-content');
    await dialog.waitFor();
    const feedback = page.getByLabel('상황 설명');
    const submit = page.getByRole('button', { name: '문제 제보' });
    assert.equal(await submit.isDisabled(), true);
    await feedback.press('A');
    assert.equal(await submit.isDisabled(), false);
    await submit.click();
    await page.getByText('상황 제보가 접수되었습니다.').waitFor();
    assert.equal(await feedback.inputValue(), '');
    assert.equal(await page.getByTestId('global-error-dialog-source').count(), 0);
    const calls = await readCalls(page);
    assert.equal(calls.feedback, 1);
    assert.equal(calls.network, 0);
    assert.deepEqual(calls.feedbackPayloads, [{
      actionTaken: 'api_error_feedback',
      comment: 'A',
      eventId: 'MOCK-ERROR-ID',
    }]);
  });
});

test('actual Content isolates close/retry/feedback actions, transport results, and source action codes', {
  timeout: 120_000,
}, async () => {
  await withActualBrowser(async ({ page, port }) => {
    const closeActions: Array<{ name: string; run: () => Promise<void> }> = [
      { name: 'header close', run: () => page.getByRole('button', { name: '닫기' }).click() },
      { name: 'confirm', run: () => page.getByTestId('global-error-dialog-confirm').click() },
      {
        name: 'backdrop',
        run: () => page.locator('[aria-hidden="true"]').first().evaluate((element) => (
          element as HTMLElement
        ).click()),
      },
      { name: 'Escape', run: () => page.keyboard.press('Escape') },
    ];
    for (const action of closeActions) {
      await openPage(page, port, '?kind=content');
      await page.getByTestId('global-error-dialog-content').waitFor();
      await action.run();
      const calls = await readCalls(page);
      assert.equal(calls.close, 1, action.name);
      assert.equal(calls.retry, 0, action.name);
      assert.equal(calls.feedback, 0, action.name);
      assert.equal(calls.unrelated, 0, action.name);
      assert.equal(calls.network, 0, action.name);
    }

    for (const retryMode of ['resolve', 'reject']) {
      await openPage(page, port, `?kind=content&retry=${retryMode}`);
      const retry = page.getByRole('button', { name: '다시 시도' });
      await retry.click();
      await page.getByRole('button', { name: '다시 시도' }).waitFor();
      const calls = await readCalls(page);
      assert.equal(calls.close, 0, retryMode);
      assert.equal(calls.retry, 1, retryMode);
      assert.equal(calls.feedback, 0, retryMode);
      assert.equal(calls.network, 0, retryMode);
    }

    await openPage(page, port, '?kind=content&retry=timeout');
    await page.getByRole('button', { name: '다시 시도' }).dblclick({ delay: 1 });
    const retryBusy = page.getByRole('button', { name: '다시 시도 중...' });
    await retryBusy.waitFor();
    assert.equal(await retryBusy.isDisabled(), true);
    let calls = await readCalls(page);
    assert.equal(calls.retry, 1);
    assert.equal(calls.feedback, 0);
    assert.equal(calls.network, 0);

    for (const feedbackMode of ['success', 'failure']) {
      await openPage(page, port, `?kind=content&feedback=${feedbackMode}`);
      await page.getByLabel('상황 설명').fill(`MOCK ${feedbackMode} 제보`);
      await page.getByRole('button', { name: '문제 제보' }).click();
      await page.getByText(feedbackMode === 'success'
        ? '상황 제보가 접수되었습니다.'
        : '제보를 전송하지 못했습니다. 잠시 후 다시 시도해주세요.').waitFor();
      calls = await readCalls(page);
      assert.equal(calls.close, 0, feedbackMode);
      assert.equal(calls.retry, 0, feedbackMode);
      assert.equal(calls.feedback, 1, feedbackMode);
      assert.equal(calls.network, 0, feedbackMode);
    }

    await openPage(page, port, '?kind=content&feedback=timeout');
    await page.getByLabel('상황 설명').fill('MOCK timeout duplicate 제보');
    await page.getByRole('button', { name: '문제 제보' }).dblclick({ delay: 1 });
    const feedbackBusy = page.getByRole('button', { name: '제보 전송 중...' });
    await feedbackBusy.waitFor();
    assert.equal(await feedbackBusy.getAttribute('aria-busy'), 'true');
    calls = await readCalls(page);
    assert.equal(calls.feedback, 1);
    assert.equal(calls.retry, 0);
    assert.equal(calls.network, 0);

    const expectedActions = {
      api: 'api_error_feedback',
      runtime: 'error_boundary_feedback',
      unhandled_rejection: 'unhandled_rejection_feedback',
    } as const;
    for (const [source, expectedAction] of Object.entries(expectedActions)) {
      await openPage(page, port, `?kind=content&feedback=success&source=${source}`);
      if (source === 'api') {
        assert.equal(await page.getByTestId('global-error-dialog-source').count(), 0);
      } else {
        assert.equal(
          await page.getByTestId('global-error-dialog-source').innerText(),
          source === 'runtime' ? '브라우저 실행 중 감지됨' : '비동기 작업 처리 중 감지됨',
        );
      }
      await page.getByLabel('상황 설명').fill(`MOCK ${source} action`);
      await page.getByRole('button', { name: '문제 제보' }).click();
      await page.getByText('상황 제보가 접수되었습니다.').waitFor();
      calls = await readCalls(page);
      assert.equal(calls.feedback, 1, source);
      assert.equal(calls.feedbackPayloads[0]?.actionTaken, expectedAction, source);
      assert.equal(calls.network, 0, source);
    }
  });
});

test('actual 320px portal contains pressure text, exposes 44px targets, traps focus, and restores scroll lock', {
  timeout: 90_000,
}, async () => {
  await withActualBrowser(async ({ page, port }) => {
    const longMessage = `MOCK-${'UNBROKEN'.repeat(90)}`;
    const longErrorId = `MOCK-ID-${'UNBROKEN'.repeat(60)}`;
    await openPage(
      page,
      port,
      `?kind=content&message=${encodeURIComponent(longMessage)}&errorId=${encodeURIComponent(longErrorId)}`,
    );
    const dialog = page.getByTestId('global-error-dialog-content');
    await dialog.waitFor();
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    const containment = await dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        clientWidth: element.clientWidth,
        left: rect.left,
        right: rect.right,
        scrollWidth: element.scrollWidth,
      };
    });
    assert.ok(containment.left >= 0);
    assert.ok(containment.right <= 320);
    assert.ok(containment.scrollWidth <= containment.clientWidth);

    for (const selector of [
      page.getByRole('button', { name: '닫기' }),
      page.getByTestId('global-error-dialog-confirm'),
      page.getByRole('button', { name: '다시 시도' }),
      page.getByRole('button', { name: '문제 제보' }),
    ]) {
      const box = await selector.boundingBox();
      assert.ok(box && box.width >= 44 && box.height >= 44, JSON.stringify(box));
    }

    const confirm = page.getByTestId('global-error-dialog-confirm');
    await confirm.scrollIntoViewIfNeeded();
    await confirm.focus();
    await page.keyboard.press('Tab');
    const focusState = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      const currentDialog = document.querySelector('[data-testid="global-error-dialog-content"]');
      return {
        ariaLabel: active?.getAttribute('aria-label'),
        contains: Boolean(active && currentDialog?.contains(active)),
        outside: active?.id === 'outside-sentinel',
      };
    });
    assert.deepEqual(focusState, { ariaLabel: '닫기', contains: true, outside: false });

    const callsBeforeResize = await readCalls(page);
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.waitForFunction(() => window.innerWidth === 390 && window.innerHeight === 1000);
    assert.deepEqual(await readCalls(page), callsBeforeResize);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '닫기');

    await page.evaluate(() => (
      window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime }
    ).__GLOBAL_ERROR_DIALOG_TEST__.unmount());
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  });
});

test('actual Root isolates stale retry completion from newer errors, ordinary close, and unmount', {
  timeout: 120_000,
}, async () => {
  await withActualBrowser(async ({ page, port }) => {
    for (const outcome of ['resolve', 'reject'] as const) {
      const errorA = {
        errorId: `STALE-A-${outcome.toUpperCase()}`,
        message: `MOCK stale A ${outcome}`,
        statusCode: 500,
      };
      const errorB = {
        errorId: `LATEST-B-${outcome.toUpperCase()}`,
        message: `MOCK latest B survives A ${outcome}`,
        statusCode: 409,
      };
      await openPage(page, port, '?kind=root');
      assert.deepEqual((await readCalls(page)).actionLog, [], `${outcome}: reset log`);
      await page.evaluate((detail) => {
        (window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime })
          .__GLOBAL_ERROR_DIALOG_TEST__.dispatchDeferredRetry(detail);
      }, errorA);
      await page.getByText(errorA.message, { exact: true }).waitFor();
      await page.getByText(errorA.errorId, { exact: true }).waitFor();
      await page.getByRole('button', { name: '다시 시도' }).click();
      await page.getByTestId('global-error-dialog-content').waitFor({ state: 'detached' });
      await page.evaluate((detail) => {
        (window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime })
          .__GLOBAL_ERROR_DIALOG_TEST__.dispatchTrackedRetry(detail);
      }, errorB);
      await page.getByText(errorB.message, { exact: true }).waitFor();
      await page.getByText(errorB.errorId, { exact: true }).waitFor();
      await page.evaluate((retryOutcome) => {
        (window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime })
          .__GLOBAL_ERROR_DIALOG_TEST__.settleDeferredRetry(retryOutcome);
      }, outcome);
      await page.waitForTimeout(40);
      assert.equal(await page.getByText(errorB.message, { exact: true }).count(), 1, outcome);
      assert.equal(await page.getByText(errorB.errorId, { exact: true }).count(), 1, outcome);
      assert.equal(await page.getByText(errorA.message, { exact: true }).count(), 0, outcome);
      const calls = await readCalls(page);
      assert.equal(calls.retry, 1, outcome);
      assert.equal(calls.retryByErrorId[errorA.errorId], 1, outcome);
      assert.equal(calls.retryByErrorId[errorB.errorId] ?? 0, 0, outcome);
      assert.equal(calls.network, 0, outcome);
      assert.deepEqual(calls.actionLog, [
        `dispatch-deferred:${errorA.errorId}`,
        `retry:${errorA.errorId}`,
        `dispatch-tracked:${errorB.errorId}`,
        `settle-${outcome}:${errorA.errorId}`,
      ], outcome);
    }

    const closedA = {
      errorId: 'CLOSED-A-CONFIRM',
      message: 'MOCK ordinary close A',
      statusCode: 500,
    };
    const nextB = {
      errorId: 'AFTER-CLOSE-B',
      message: 'MOCK B opens after ordinary close',
      statusCode: 404,
    };
    await openPage(page, port, '?kind=root');
    assert.deepEqual((await readCalls(page)).actionLog, [], 'ordinary close: reset log');
    await page.evaluate((detail) => {
      (window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime })
        .__GLOBAL_ERROR_DIALOG_TEST__.dispatchTrackedRetry(detail);
    }, closedA);
    await page.getByText(closedA.message, { exact: true }).waitFor();
    await page.getByTestId('global-error-dialog-confirm').click();
    await page.getByTestId('global-error-dialog-content').waitFor({ state: 'detached' });
    assert.equal((await readCalls(page)).retry, 0);
    await page.evaluate((detail) => {
      (window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime })
        .__GLOBAL_ERROR_DIALOG_TEST__.dispatchTrackedRetry(detail);
    }, nextB);
    await page.getByText(nextB.message, { exact: true }).waitFor();
    await page.getByText(nextB.errorId, { exact: true }).waitFor();
    let calls = await readCalls(page);
    assert.equal(calls.retry, 0);
    assert.equal(calls.retryByErrorId[closedA.errorId] ?? 0, 0);
    assert.equal(calls.retryByErrorId[nextB.errorId] ?? 0, 0);
    assert.equal(calls.network, 0);
    assert.deepEqual(calls.actionLog, [
      `dispatch-tracked:${closedA.errorId}`,
      `dispatch-tracked:${nextB.errorId}`,
    ]);

    for (const outcome of ['resolve', 'reject'] as const) {
      const unmountedA = {
        errorId: `UNMOUNTED-A-${outcome.toUpperCase()}`,
        message: `MOCK pending A unmounted ${outcome}`,
        statusCode: 500,
      };
      const pageErrors: string[] = [];
      const recordPageError = (error: Error) => pageErrors.push(error.message);
      page.on('pageerror', recordPageError);
      await openPage(page, port, '?kind=root');
      assert.deepEqual((await readCalls(page)).actionLog, [], `${outcome} unmount: reset log`);
      await page.evaluate((detail) => {
        (window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime })
          .__GLOBAL_ERROR_DIALOG_TEST__.dispatchDeferredRetry(detail);
      }, unmountedA);
      await page.getByText(unmountedA.message, { exact: true }).waitFor();
      await page.getByRole('button', { name: '다시 시도' }).click();
      await page.getByTestId('global-error-dialog-content').waitFor({ state: 'detached' });
      await page.evaluate(() => {
        (window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime })
          .__GLOBAL_ERROR_DIALOG_TEST__.unmount();
      });
      assert.equal(await page.evaluate(() => (
        window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime }
      ).__GLOBAL_ERROR_DIALOG_TEST__.effectiveListenerCount()), 0);
      await page.evaluate((retryOutcome) => {
        (window as unknown as { __GLOBAL_ERROR_DIALOG_TEST__: TestRuntime })
          .__GLOBAL_ERROR_DIALOG_TEST__.settleDeferredRetry(retryOutcome);
      }, outcome);
      await page.waitForTimeout(40);
      calls = await readCalls(page);
      assert.equal(calls.retry, 1, outcome);
      assert.equal(calls.retryByErrorId[unmountedA.errorId], 1, outcome);
      assert.equal(calls.network, 0, outcome);
      assert.deepEqual(calls.actionLog, [
        `dispatch-deferred:${unmountedA.errorId}`,
        `retry:${unmountedA.errorId}`,
        `settle-${outcome}:${unmountedA.errorId}`,
      ], outcome);
      assert.equal(await page.locator('[role="dialog"]').count(), 0, outcome);
      assert.deepEqual(pageErrors, [], `${outcome}: no post-unmount page error`);
      page.off('pageerror', recordPageError);
    }
  });
});
