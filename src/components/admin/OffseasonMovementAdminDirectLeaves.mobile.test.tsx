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
          `<!doctype html><html><body><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`,
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
          onDialogClose: () => calls.dialogClose.push([mode]),
          onDeleteTargetChange: (value) => calls.deleteTarget.push([mode, value?.id ?? null]),
          onUpdateField: (field, value) => {
            calls.updateField.push([field, value]);
            setFormData((current) => ({ ...current, [field]: value }));
          },
          onSubmit: () => calls.submit.push([mode]),
          onDelete: () => calls.deleteConfirm.push([mode]),
        });
      };

      const mount = (mode) => {
        if (mode === 'results') {
          root.render(createElement(Results, {
            ...resultsResolved.props,
            onOpenEditDialog: (movement) => calls.resultEdit.push(movement),
            onDeleteTargetChange: (movement) => calls.resultDelete.push(movement),
          }));
          return;
        }
        root.render(createElement(DialogHost, { key: mode, mode }));
      };
      window.__OFFSEASON_DIRECT_LEAVES_TEST__ = {
        calls,
        expectedMovement,
        mount,
        snapshot: () => JSON.parse(JSON.stringify(calls)),
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
    await source.click();
    await page.locator('[data-testid="admin-offseason-edit-1"]').click();
    await page.locator('[data-testid="admin-offseason-delete-1"]').click();
    const resultCalls = await page.evaluate(() => {
      const testState = (window as unknown as { __OFFSEASON_DIRECT_LEAVES_TEST__: {
        calls: Record<string, unknown[]>; expectedMovement: unknown;
      } }).__OFFSEASON_DIRECT_LEAVES_TEST__;
      return {
        expected: testState.expectedMovement,
        edit: testState.calls.resultEdit,
        delete: testState.calls.resultDelete,
      };
    });
    assert.deepEqual(resultCalls.edit, [resultCalls.expected]);
    assert.deepEqual(resultCalls.delete, [resultCalls.expected]);

    await page.evaluate(() => (window as unknown as {
      __OFFSEASON_DIRECT_LEAVES_TEST__: { mount: (mode: string) => void };
    }).__OFFSEASON_DIRECT_LEAVES_TEST__.mount('create'));
    const createDialog = page.locator('[data-testid="admin-offseason-dialog"]');
    await createDialog.waitFor();
    await page.locator('[data-testid="admin-offseason-player-name"]').fill('MOCK 직접 입력 선수');
    await page.locator('[data-testid="admin-offseason-summary"]').fill('MOCK 직접 입력 요약');
    await page.locator('[data-testid="admin-offseason-source-url"]').fill('https://example.invalid/direct-source');
    await page.locator('[data-testid="admin-offseason-dialog-section-trigger"]').selectOption('기타');
    await page.locator('[data-testid="admin-offseason-dialog-team-trigger"]').selectOption('LG');

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
      await page.locator(selector).click();
    }

    await page.evaluate(() => (window as unknown as {
      __OFFSEASON_DIRECT_LEAVES_TEST__: { mount: (mode: string) => void };
    }).__OFFSEASON_DIRECT_LEAVES_TEST__.mount('edit'));
    await page.locator('[data-testid="admin-offseason-dialog"] button[aria-label="닫기"]').click();
    await page.locator('[data-testid="admin-offseason-dialog-cancel"]').click();
    await page.locator('[data-testid="admin-offseason-dialog-submit"]').click();

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
      await page.locator(selector).click();
    }

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
