import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';
import { createServer, type Plugin } from 'vite';

const resultsSource = readFileSync(new URL('./OffseasonMovementAdminResultsRuntime.tsx', import.meta.url), 'utf8');
const dialogsSource = readFileSync(new URL('./OffseasonMovementAdminDialogs.tsx', import.meta.url), 'utf8');
const frontendRoot = fileURLToPath(new URL('../../../', import.meta.url));
const pagePath = '/__offseason-direct-leaves-callback-test.html';
const entryPath = '/__offseason-direct-leaves-callback-test.tsx';
const moduleId = '\0virtual:offseason-direct-leaves-callback-test';

const resultsComponentId = 'src/components/admin/OffseasonMovementAdminResultsRuntime.tsx#OffseasonMovementAdminResultsRuntime';
const dialogsComponentId = 'src/components/admin/OffseasonMovementAdminDialogs.tsx#OffseasonMovementAdminDialogs';

const createDirectLeavesPlugin = (): Plugin => ({
  name: 'offseason-direct-leaves-callback-test',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (request.url?.split('?')[0] !== pagePath) {
        next();
        return;
      }
      try {
        const html = await server.transformIndexHtml(
          pagePath,
          `<!doctype html><html><body><div id="root"></div><button id="outside-focus-sentinel" type="button">outside</button><script type="module" src="${entryPath}"></script></body></html>`,
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
    return id === entryPath ? moduleId : undefined;
  },
  load(id) {
    if (id !== moduleId) return undefined;
    return `
      import { createElement, useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import '/src/index.css';
      import Results from '/src/components/admin/OffseasonMovementAdminResultsRuntime.tsx';
      import Dialogs from '/src/components/admin/OffseasonMovementAdminDialogs.tsx';
      import { resolveComponentStateAdapter } from '/src/visual-qa/stateAdapters.ts';

      const calls = {
        resultEdit: [], resultDelete: [], dialogClose: [], deleteTarget: [],
        updateField: [], submit: [], deleteConfirm: [],
      };
      const history = {
        resultEdit: [], resultDelete: [], dialogClose: [], deleteTarget: [],
        updateField: [], submit: [], deleteConfirm: [],
      };
      const record = (key, value) => {
        calls[key].push(value);
        history[key].push(value);
      };
      const resetCalls = () => Object.values(calls).forEach((entries) => { entries.length = 0; });
      const resultsResolved = resolveComponentStateAdapter('admin.offseason-movement-results', {
        componentId: '${resultsComponentId}',
        states: { data: 'maximum-supported', interactions: 'default', permissions: 'admin', system: 'idle' },
        variants: { preset: 'idle', theme: 'dark' },
      });
      const dialogsResolved = resolveComponentStateAdapter('admin.offseason-movement-dialogs', {
        componentId: '${dialogsComponentId}',
        states: { data: 'maximum-supported', interactions: 'default', permissions: 'admin', system: 'idle' },
        variants: { preset: 'create-dialog', theme: 'dark' },
      });
      const expectedMovement = resultsResolved.props.filteredMovements[0];
      const root = createRoot(document.getElementById('root'));

      const DialogHost = ({ mode }) => {
        const [formData, setFormData] = useState(dialogsResolved.props.formData);
        const movement = dialogsResolved.props.editingMovement || dialogsResolved.props.deleteTarget
          || expectedMovement;
        return createElement(Dialogs, {
          ...dialogsResolved.props,
          dialogOpen: mode === 'create' || mode === 'edit',
          editingMovement: mode === 'edit' ? movement : null,
          deleteTarget: mode === 'delete' ? movement : null,
          formData,
          onDialogClose: () => record('dialogClose', [mode]),
          onDeleteTargetChange: (value) => record('deleteTarget', [mode, value?.id ?? null]),
          onUpdateField: (field, value) => {
            record('updateField', [field, value]);
            setFormData((current) => ({ ...current, [field]: value }));
          },
          onSubmit: () => record('submit', [mode]),
          onDelete: () => record('deleteConfirm', [mode]),
        });
      };

      const mount = (mode) => {
        if (mode === 'results') {
          root.render(createElement(Results, {
            ...resultsResolved.props,
            onOpenEditDialog: (movement) => record('resultEdit', movement),
            onDeleteTargetChange: (movement) => record('resultDelete', movement),
          }));
          return;
        }
        root.render(createElement(DialogHost, { key: mode, mode }));
      };
      window.__OFFSEASON_DIRECT_LEAVES_TEST__ = {
        calls,
        expectedMovement,
        mount,
        resetCalls,
        snapshot: () => JSON.parse(JSON.stringify(history)),
      };
      mount('results');
    `;
  },
});

test('Results owns a bounded direct root and mobile table/action contract', () => {
  assert.match(resultsSource, /data-testid="admin-offseason-results-runtime"/);
  assert.match(resultsSource, /admin-offseason-results-runtime"[^>]*min-w-0[^>]*max-w-full/);
  assert.match(resultsSource, /data-testid=\{`admin-offseason-source-\$\{movement\.id\}`\}/);
  assert.match(resultsSource, /admin-offseason-source-[\s\S]*min-h-11 min-w-11/);
  assert.match(resultsSource, /admin-offseason-edit-[\s\S]*min-h-11 min-w-11/);
  assert.match(resultsSource, /admin-offseason-delete-[\s\S]*min-h-11 min-w-11/);
  assert.match(resultsSource, /\[data-testid\^="admin-offseason-source-"\]:active[\s\S]*scale\(0\.98\)/);
  assert.match(resultsSource, /\[data-testid\^="admin-offseason-edit-"\]:active[\s\S]*scale\(0\.98\)/);
  assert.match(resultsSource, /\[data-testid\^="admin-offseason-delete-"\]:active[\s\S]*scale\(0\.98\)/);
  assert.match(resultsSource, /admin-offseason-results-scroll"[^>]*overflow-x-auto/);
  assert.match(resultsSource, /className="min-w-\[1120px\]"/);
  assert.match(resultsSource, /role="status"[\s\S]*aria-busy="true"/);
  assert.doesNotMatch(resultsSource, /from ['"](?:\.\.\/)*api\//);
  assert.doesNotMatch(resultsSource, /\b(?:axios|fetch|useQuery|useMutation)\b/);
});

test('Dialogs owns mobile reflow, reachable lower fields, touch controls, and no transport', () => {
  assert.match(dialogsSource, /bodyClassName="[^"]*max-h-\[70vh\][^"]*overflow-y-auto/);
  assert.match(dialogsSource, /adminDialogControlClassName\s*=\s*['"][^'"]*min-h-11/);
  assert.match(dialogsSource, /adminDialogSelectClassName\s*=\s*[\s\S]*min-h-11/);
  assert.match(dialogsSource, /admin-offseason-delete-cancel/);
  assert.match(dialogsSource, /admin-offseason-delete-confirm/);
  assert.match(dialogsSource, /admin-offseason-source-url/);
  assert.match(dialogsSource, /\[data-testid="admin-offseason-dialog-cancel"\]:active[\s\S]*scale\(0\.98\)/);
  assert.match(dialogsSource, /\[data-testid="admin-offseason-dialog-submit"\]:active[\s\S]*scale\(0\.98\)/);
  assert.match(dialogsSource, /\[data-testid="admin-offseason-delete-cancel"\]:active[\s\S]*scale\(0\.98\)/);
  assert.match(dialogsSource, /\[data-testid="admin-offseason-delete-confirm"\]:active[\s\S]*scale\(0\.98\)/);
  assert.match(dialogsSource, /button\[aria-label="닫기"\]:active[\s\S]*scale\(0\.98\)/);
  assert.doesNotMatch(dialogsSource, /max-w-\[45%\]/);
  assert.match(dialogsSource, /admin-offseason-preview-section[\s\S]*max-width:\s*45%/);
  assert.doesNotMatch(dialogsSource, /from ['"](?:\.\.\/)*api\//);
  assert.doesNotMatch(dialogsSource, /\b(?:axios|fetch|useQuery|useMutation)\b/);
});

test('actual Results and Dialogs DOM forwards exact callbacks once and resize is read-only', {
  timeout: 90_000,
}, async () => {
  const server = await createServer({
    configFile: fileURLToPath(new URL('../../../vite.visual-qa.config.ts', import.meta.url)),
    logLevel: 'silent',
    plugins: [createDirectLeavesPlugin()],
    root: frontendRoot,
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  });
  let browser;
  try {
    await server.listen();
    const address = server.httpServer?.address();
    assert.ok(address && typeof address !== 'string');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 320, height: 844 } });
    const diagnostics: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') diagnostics.push(message.text());
    });
    page.on('pageerror', (error) => diagnostics.push(error.message));
    const response = await page.goto(`http://127.0.0.1:${address.port}${pagePath}`);
    assert.equal(response?.status(), 200);

    const source = page.locator('[data-testid="admin-offseason-source-1"]');
    await source.waitFor({ timeout: 15_000 }).catch((error: unknown) => {
      throw new Error(`${String(error)}\nBrowser diagnostics:\n${diagnostics.join('\n')}`);
    });
    await source.evaluate((node) => node.addEventListener('click', (event) => event.preventDefault(), { once: true }));
    const readIsolatedCalls = () => page.evaluate(() => {
      const testState = (window as unknown as { __OFFSEASON_DIRECT_LEAVES_TEST__: {
        calls: Record<string, unknown[]>;
      } }).__OFFSEASON_DIRECT_LEAVES_TEST__;
      return JSON.parse(JSON.stringify(testState.calls)) as Record<string, unknown[]>;
    });
    const resetCalls = () => page.evaluate(() => (window as unknown as {
      __OFFSEASON_DIRECT_LEAVES_TEST__: { resetCalls: () => void };
    }).__OFFSEASON_DIRECT_LEAVES_TEST__.resetCalls());
    const assertOnlyDialogAction = async (
      mode: 'create' | 'edit' | 'delete',
      selector: string,
      expected: { dialogClose?: unknown[][]; deleteTarget?: unknown[][]; submit?: unknown[][]; deleteConfirm?: unknown[][] },
    ) => {
      await page.evaluate((nextMode) => (window as unknown as {
        __OFFSEASON_DIRECT_LEAVES_TEST__: { mount: (mode: string) => void };
      }).__OFFSEASON_DIRECT_LEAVES_TEST__.mount(nextMode), mode);
      const dialogTestId = mode === 'delete' ? 'admin-offseason-delete-dialog' : 'admin-offseason-dialog';
      await page.locator(`[data-testid="${dialogTestId}"]`).waitFor();
      await resetCalls();
      await page.locator(selector).click();
      assert.deepEqual(await readIsolatedCalls(), {
        resultEdit: [],
        resultDelete: [],
        dialogClose: expected.dialogClose ?? [],
        deleteTarget: expected.deleteTarget ?? [],
        updateField: [],
        submit: expected.submit ?? [],
        deleteConfirm: expected.deleteConfirm ?? [],
      });
    };

    await resetCalls();
    await source.click();
    assert.deepEqual(await readIsolatedCalls(), {
      resultEdit: [], resultDelete: [], dialogClose: [], deleteTarget: [], updateField: [], submit: [], deleteConfirm: [],
    });

    await resetCalls();
    await page.locator('[data-testid="admin-offseason-edit-1"]').click();
    assert.deepEqual(await page.evaluate(() => {
      const testState = (window as unknown as { __OFFSEASON_DIRECT_LEAVES_TEST__: {
        calls: { resultEdit: unknown[]; resultDelete: unknown[] };
        expectedMovement: unknown;
      } }).__OFFSEASON_DIRECT_LEAVES_TEST__;
      return {
        editCount: testState.calls.resultEdit.length,
        editIsExpectedIdentity: testState.calls.resultEdit[0] === testState.expectedMovement,
        deleteCount: testState.calls.resultDelete.length,
      };
    }), { editCount: 1, editIsExpectedIdentity: true, deleteCount: 0 });

    await resetCalls();
    await page.locator('[data-testid="admin-offseason-delete-1"]').click();
    assert.deepEqual(await page.evaluate(() => {
      const testState = (window as unknown as { __OFFSEASON_DIRECT_LEAVES_TEST__: {
        calls: { resultEdit: unknown[]; resultDelete: unknown[] };
        expectedMovement: unknown;
      } }).__OFFSEASON_DIRECT_LEAVES_TEST__;
      return {
        deleteCount: testState.calls.resultDelete.length,
        deleteIsExpectedIdentity: testState.calls.resultDelete[0] === testState.expectedMovement,
        editCount: testState.calls.resultEdit.length,
      };
    }), { deleteCount: 1, deleteIsExpectedIdentity: true, editCount: 0 });

    await page.evaluate(() => (window as unknown as {
      __OFFSEASON_DIRECT_LEAVES_TEST__: { mount: (mode: string) => void };
    }).__OFFSEASON_DIRECT_LEAVES_TEST__.mount('create'));
    const createDialog = page.locator('[data-testid="admin-offseason-dialog"]');
    await createDialog.waitFor();
    const assertOnlyUpdateField = async (selector: string, value: string, field: string, select = false) => {
      await resetCalls();
      if (select) await page.locator(selector).selectOption(value);
      else await page.locator(selector).fill(value);
      assert.deepEqual(await readIsolatedCalls(), {
        resultEdit: [], resultDelete: [], dialogClose: [], deleteTarget: [],
        updateField: [[field, value]], submit: [], deleteConfirm: [],
      });
    };
    await assertOnlyUpdateField('[data-testid="admin-offseason-player-name"]', 'MOCK 직접 입력 선수', 'playerName');
    await assertOnlyUpdateField('[data-testid="admin-offseason-summary"]', 'MOCK 직접 입력 요약', 'summary');
    await assertOnlyUpdateField('[data-testid="admin-offseason-source-url"]', 'https://example.invalid/direct-source', 'sourceUrl');
    await assertOnlyUpdateField('[data-testid="admin-offseason-dialog-section-trigger"]', '기타', 'section', true);
    await assertOnlyUpdateField('[data-testid="admin-offseason-dialog-team-trigger"]', 'LG', 'teamCode', true);

    const sourceUrl = page.locator('[data-testid="admin-offseason-source-url"]');
    await sourceUrl.scrollIntoViewIfNeeded();
    const dialogBox = await createDialog.boundingBox();
    const sourceBox = await sourceUrl.boundingBox();
    assert.ok(dialogBox && sourceBox);
    assert.ok(sourceBox.y >= dialogBox.y && sourceBox.y + sourceBox.height <= dialogBox.y + dialogBox.height + 1);

    for (const selector of [
      '[data-testid="admin-offseason-dialog"] button[aria-label="닫기"]',
      '[data-testid="admin-offseason-dialog-cancel"]',
      '[data-testid="admin-offseason-dialog-submit"]',
    ]) {
      const box = await page.locator(selector).boundingBox();
      assert.ok(
        box && box.width >= 44 && box.height >= 44,
        `${selector} must be at least 44px, received ${box ? `${box.width}x${box.height}` : 'no box'}`,
      );
    }

    await page.locator('#outside-focus-sentinel').evaluate((sentinel) => document.body.append(sentinel));
    await page.locator('[data-testid="admin-offseason-dialog-submit"]').focus();
    await page.keyboard.press('Tab');
    assert.deepEqual(await page.evaluate(() => {
      const dialog = document.querySelector('[data-testid="admin-offseason-dialog"]');
      const close = dialog?.querySelector('button[aria-label="닫기"]');
      return {
        activeIsCloseIdentity: document.activeElement === close,
        activeInsideDialog: Boolean(dialog?.contains(document.activeElement)),
        activeIsOutsideSentinel: document.activeElement?.id === 'outside-focus-sentinel',
      };
    }), {
      activeIsCloseIdentity: true,
      activeInsideDialog: true,
      activeIsOutsideSentinel: false,
    });

    await assertOnlyDialogAction('create', '[data-testid="admin-offseason-dialog"] button[aria-label="닫기"]', {
      dialogClose: [['create']],
    });
    await assertOnlyDialogAction('create', '[data-testid="admin-offseason-dialog-cancel"]', {
      dialogClose: [['create']],
    });
    await assertOnlyDialogAction('create', '[data-testid="admin-offseason-dialog-submit"]', {
      submit: [['create']],
    });
    await assertOnlyDialogAction('edit', '[data-testid="admin-offseason-dialog"] button[aria-label="닫기"]', {
      dialogClose: [['edit']],
    });
    await assertOnlyDialogAction('edit', '[data-testid="admin-offseason-dialog-cancel"]', {
      dialogClose: [['edit']],
    });
    await assertOnlyDialogAction('edit', '[data-testid="admin-offseason-dialog-submit"]', {
      submit: [['edit']],
    });

    await page.evaluate(() => (window as unknown as {
      __OFFSEASON_DIRECT_LEAVES_TEST__: { mount: (mode: string) => void };
    }).__OFFSEASON_DIRECT_LEAVES_TEST__.mount('delete'));
    const deleteDialog = page.locator('[data-testid="admin-offseason-delete-dialog"]');
    await deleteDialog.waitFor();
    for (const selector of [
      '[data-testid="admin-offseason-delete-dialog"] button[aria-label="닫기"]',
      '[data-testid="admin-offseason-delete-cancel"]',
      '[data-testid="admin-offseason-delete-confirm"]',
    ]) {
      const box = await page.locator(selector).boundingBox();
      assert.ok(
        box && box.width >= 44 && box.height >= 44,
        `${selector} must be at least 44px, received ${box ? `${box.width}x${box.height}` : 'no box'}`,
      );
    }

    await assertOnlyDialogAction('delete', '[data-testid="admin-offseason-delete-dialog"] button[aria-label="닫기"]', {
      deleteTarget: [['delete', null]],
    });
    await assertOnlyDialogAction('delete', '[data-testid="admin-offseason-delete-cancel"]', {
      deleteTarget: [['delete', null]],
    });
    await assertOnlyDialogAction('delete', '[data-testid="admin-offseason-delete-confirm"]', {
      deleteConfirm: [['delete']],
    });

    const snapshotBeforeResize = await page.evaluate(() => (window as unknown as {
      __OFFSEASON_DIRECT_LEAVES_TEST__: { snapshot: () => unknown };
    }).__OFFSEASON_DIRECT_LEAVES_TEST__.snapshot());
    assert.deepEqual((snapshotBeforeResize as { updateField: unknown[] }).updateField, [
      ['playerName', 'MOCK 직접 입력 선수'],
      ['summary', 'MOCK 직접 입력 요약'],
      ['sourceUrl', 'https://example.invalid/direct-source'],
      ['section', '기타'],
      ['teamCode', 'LG'],
    ]);
    assert.deepEqual((snapshotBeforeResize as { dialogClose: unknown[] }).dialogClose, [
      ['create'], ['create'], ['edit'], ['edit'],
    ]);
    assert.deepEqual((snapshotBeforeResize as { submit: unknown[] }).submit, [
      ['create'], ['edit'],
    ]);
    assert.deepEqual((snapshotBeforeResize as { deleteTarget: unknown[] }).deleteTarget, [
      ['delete', null], ['delete', null],
    ]);
    assert.deepEqual((snapshotBeforeResize as { deleteConfirm: unknown[] }).deleteConfirm, [['delete']]);

    await page.setViewportSize({ width: 390, height: 1000 });
    await page.waitForFunction(() => window.innerWidth === 390);
    const snapshotAfterResize = await page.evaluate(() => (window as unknown as {
      __OFFSEASON_DIRECT_LEAVES_TEST__: { snapshot: () => unknown };
    }).__OFFSEASON_DIRECT_LEAVES_TEST__.snapshot());
    assert.deepEqual(snapshotAfterResize, snapshotBeforeResize);
    assert.deepEqual(diagnostics, []);
  } finally {
    await browser?.close();
    await server.close();
  }
});
