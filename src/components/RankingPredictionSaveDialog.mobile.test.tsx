import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';
import { createServer, type Plugin } from 'vite';

const componentSource = readFileSync(
  new URL('./RankingPredictionSaveDialog.tsx', import.meta.url),
  'utf8',
);
const packageManifest = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { scripts: Record<string, string> };
const frontendRoot = fileURLToPath(new URL('../../', import.meta.url));
const pagePath = '/__ranking-prediction-save-dialog-test.html';
const entryPath = '/__ranking-prediction-save-dialog-test.tsx';
const moduleId = '\0virtual:ranking-prediction-save-dialog-test';

const callbackSwapMutation = process.env.RANKING_SAVE_DIALOG_MUTATE_CALLBACK_SWAP === '1';
const callbackDuplicateMutation = process.env.RANKING_SAVE_DIALOG_MUTATE_CALLBACK_DUPLICATE === '1';
const disabledRemovalMutation = process.env.RANKING_SAVE_DIALOG_MUTATE_DISABLED_REMOVAL === '1';
const savingTransitionRemovalMutation = process.env.RANKING_SAVE_DIALOG_MUTATE_SAVING_TRANSITION === '1';
const innerPropagationMutation = process.env.RANKING_SAVE_DIALOG_MUTATE_INNER_PROPAGATION === '1';
const escapeCleanupMutation = process.env.RANKING_SAVE_DIALOG_MUTATE_ESCAPE_CLEANUP === '1';
const focusTrapMutation = process.env.RANKING_SAVE_DIALOG_MUTATE_FOCUS_TRAP === '1';
const savingLabelMutation = process.env.RANKING_SAVE_DIALOG_MUTATE_SAVING_LABEL === '1';
const packageMutation = process.env.RANKING_SAVE_DIALOG_MUTATE_PACKAGE ?? '';

const createSaveDialogPlugin = (): Plugin => ({
  name: 'ranking-prediction-save-dialog-actual-mount-test',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (request.url?.split('?')[0] !== pagePath) {
        next();
        return;
      }
      try {
        const html = await server.transformIndexHtml(
          pagePath,
          `<!doctype html><html><body style="overflow: clip"><button id="outside" type="button">외부</button><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`,
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
  transform(code, id) {
    const cleanId = id.split('?')[0];
    if (cleanId.endsWith('/src/components/ui/plain-dialog.tsx')) {
      let transformed = code;
      if (innerPropagationMutation) {
        transformed = transformed.replace(
          /event\.stopPropagation\(\)/g,
          'onClose()',
        );
      }
      if (escapeCleanupMutation) {
        transformed = transformed.replace(
          /window\.removeEventListener\(["']keydown["'],\s*handleKeyDown\);?/g,
          '',
        );
      }
      if (focusTrapMutation) {
        transformed = transformed.replace(
          'useFocusTrap(dialogRef, { active: open, initialFocus });',
          '',
        );
      }
      return transformed === code ? undefined : transformed;
    }
    if (savingLabelMutation && cleanId.endsWith('RankingPredictionSaveDialog.tsx')) {
      return code.replace(/isSaving\s*\?\s*["']저장 중\.\.\.["']\s*:\s*["']확인["']/g, '"확인"');
    }
    return undefined;
  },
  load(id) {
    if (id !== moduleId) return undefined;
    return `
      import React, { StrictMode, createElement, useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import SaveDialog from '/src/components/RankingPredictionSaveDialog.tsx';
      import '/src/index.css';

      const mutations = {
        callbackSwap: ${callbackSwapMutation ? 'true' : 'false'},
        callbackDuplicate: ${callbackDuplicateMutation ? 'true' : 'false'},
        disabledRemoval: ${disabledRemovalMutation ? 'true' : 'false'},
        savingTransitionRemoval: ${savingTransitionRemovalMutation ? 'true' : 'false'},
      };
      const calls = { close: 0, confirm: 0, unrelated: 0 };

      function Host({ initialOpen = true, initialSaving = false }) {
        const [open, setOpen] = useState(initialOpen);
        const [saving, setSaving] = useState(initialSaving);
        const recordClose = () => {
          calls.close += 1;
          setOpen(false);
          if (mutations.callbackDuplicate) calls.close += 1;
        };
        const recordConfirm = () => {
          calls.confirm += 1;
          if (!mutations.savingTransitionRemoval) setSaving(true);
          if (mutations.callbackDuplicate) calls.confirm += 1;
        };
        return createElement(SaveDialog, {
          open,
          isSaving: mutations.disabledRemoval ? false : saving,
          onClose: mutations.callbackSwap ? recordConfirm : recordClose,
          onConfirm: mutations.callbackSwap ? recordClose : recordConfirm,
        });
      }

      const root = createRoot(document.getElementById('root'));
      let generation = 0;
      const mount = (phase = 'idle') => {
        generation += 1;
        root.render(createElement(StrictMode, null, createElement(Host, {
          key: generation,
          initialOpen: phase !== 'closed',
          initialSaving: phase === 'saving',
        })));
      };
      const unmountDialog = () => {
        generation += 1;
        root.render(createElement(StrictMode, null, createElement(Host, {
          key: generation,
          initialOpen: false,
          initialSaving: false,
        })));
      };
      const reset = () => {
        calls.close = 0;
        calls.confirm = 0;
        calls.unrelated = 0;
      };
      window.__RANKING_SAVE_DIALOG_TEST__ = { calls, mount, reset, unmountDialog };
      mount('idle');
    `;
  },
});

type Calls = { close: number; confirm: number; unrelated: number };

test('save dialog keeps the leaf-local saving and mobile action contract', () => {
  assert.match(componentSource, /disabled=\{isSaving\}/g);
  assert.match(componentSource, /저장 중\.\.\./);
  assert.match(componentSource, /ranking-save-dialog-cancel/);
  assert.match(componentSource, /ranking-save-dialog-confirm/);
  assert.match(componentSource, /aria-busy=\{isSaving\}/);
  assert.doesNotMatch(componentSource, /from ['"](?:\.\.\/)*api\//);
  assert.doesNotMatch(componentSource, /\b(?:axios|fetch|useQuery|useMutation)\b/);
});

test('ranking and pre-harness gates include the focused actual test exactly once', () => {
  const testPath = 'src/components/RankingPredictionSaveDialog.mobile.test.tsx';
  for (const scriptName of ['test:ranking:unit', 'previsual-qa:harness:test']) {
    const originalCommand = packageManifest.scripts[scriptName] ?? '';
    const command = packageMutation === 'missing'
      ? originalCommand.replace(testPath, '')
      : packageMutation === 'duplicate'
        ? `${originalCommand} ${testPath}`
        : originalCommand;
    assert.equal(
      command.split(testPath).length - 1,
      1,
      `${scriptName} must include ${testPath} exactly once`,
    );
  }
});

test('actual save dialog is contained, touch-safe, focus-trapped, and callback-exact', {
  timeout: 90_000,
}, async () => {
  const server = await createServer({
    configFile: fileURLToPath(new URL('../../vite.visual-qa.config.ts', import.meta.url)),
    logLevel: 'silent',
    plugins: [createSaveDialogPlugin()],
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

    const driver = () => page.evaluate(() => (
      window as unknown as { __RANKING_SAVE_DIALOG_TEST__: {
        calls: Calls;
        mount: (phase: string) => void;
        reset: () => void;
        unmountDialog: () => void;
      } }
    ).__RANKING_SAVE_DIALOG_TEST__);
    const readCalls = () => page.evaluate(() => JSON.parse(JSON.stringify((
      window as unknown as { __RANKING_SAVE_DIALOG_TEST__: { calls: Calls } }
    ).__RANKING_SAVE_DIALOG_TEST__.calls)) as Calls);
    const reset = () => page.evaluate(() => (
      window as unknown as { __RANKING_SAVE_DIALOG_TEST__: { reset: () => void } }
    ).__RANKING_SAVE_DIALOG_TEST__.reset());
    const mount = (phase: 'closed' | 'idle' | 'saving') => page.evaluate((nextPhase) => (
      window as unknown as { __RANKING_SAVE_DIALOG_TEST__: { mount: (phase: string) => void } }
    ).__RANKING_SAVE_DIALOG_TEST__.mount(nextPhase), phase);
    const settle = () => page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));

    await page.getByRole('dialog').waitFor({ timeout: 15_000 }).catch((error: unknown) => {
      throw new Error(`${String(error)}\n${diagnostics.join('\n')}`);
    });
    await settle();
    assert.deepEqual(await readCalls(), { close: 0, confirm: 0, unrelated: 0 }, 'StrictMode mount callbacks');
    await mount('idle');
    await page.getByRole('dialog').waitFor();
    await settle();
    assert.deepEqual(await readCalls(), { close: 0, confirm: 0, unrelated: 0 }, 'keyed remount callbacks');

    for (const viewport of [
      { width: 320, height: 844 },
      { width: 390, height: 1000 },
    ] as const) {
      await page.setViewportSize(viewport);
      await mount('idle');
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      const portal = dialog.locator('xpath=../..');
      const metrics = await page.evaluate(() => {
        const dialogNode = document.querySelector('[role="dialog"]');
        const portalNode = dialogNode?.parentElement?.parentElement;
        const title = document.querySelector('[role="dialog"] h2');
        const description = document.querySelector('[role="dialog"] p');
        const actionNodes = [
          document.querySelector('[aria-label="닫기"]'),
          document.querySelector('[data-testid="ranking-save-dialog-cancel"]'),
          document.querySelector('[data-testid="ranking-save-dialog-confirm"]'),
        ].filter((node): node is Element => node !== null);
        const dialogRect = dialogNode?.getBoundingClientRect();
        const portalRect = portalNode?.getBoundingClientRect();
        const titleRect = title?.getBoundingClientRect();
        const descriptionRect = description?.getBoundingClientRect();
        return {
          actions: actionNodes.map((node) => {
            const value = node.getBoundingClientRect();
            return { x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom };
          }),
          bodyOverflow: document.body.style.overflow,
          description: descriptionRect ? { x: descriptionRect.x, y: descriptionRect.y, width: descriptionRect.width, height: descriptionRect.height, right: descriptionRect.right, bottom: descriptionRect.bottom } : null,
          dialog: dialogRect ? { x: dialogRect.x, y: dialogRect.y, width: dialogRect.width, height: dialogRect.height, right: dialogRect.right, bottom: dialogRect.bottom } : null,
          documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          portal: portalRect ? { x: portalRect.x, y: portalRect.y, width: portalRect.width, height: portalRect.height, right: portalRect.right, bottom: portalRect.bottom } : null,
          title: titleRect ? { x: titleRect.x, y: titleRect.y, width: titleRect.width, height: titleRect.height, right: titleRect.right, bottom: titleRect.bottom } : null,
          viewport: { width: window.innerWidth, height: window.innerHeight },
        };
      });
      for (const [name, rect] of [['portal', metrics.portal], ['dialog', metrics.dialog]] as const) {
        assert.ok(rect, `${name} rect missing`);
        assert.ok(rect.x >= -0.5 && rect.y >= -0.5, `${name} starts outside viewport: ${JSON.stringify(rect)}`);
        assert.ok(rect.right <= viewport.width + 0.5 && rect.bottom <= viewport.height + 0.5, `${name} escapes viewport: ${JSON.stringify(rect)}`);
      }
      assert.equal(metrics.documentOverflow, 0, `${viewport.width}px horizontal overflow`);
      assert.equal(metrics.bodyOverflow, 'hidden', 'open dialog must lock body scroll');
      assert.ok(metrics.title && metrics.description, 'Korean title and description rects');
      assert.ok(metrics.description.height > 20, 'Korean warning must wrap to multiple lines');
      for (const action of metrics.actions) {
        assert.ok(action && action.width >= 44 && action.height >= 44, `touch target below 44px: ${JSON.stringify(action)}`);
      }
      const cancelBox = await dialog.getByTestId('ranking-save-dialog-cancel').boundingBox();
      const confirmBox = await dialog.getByTestId('ranking-save-dialog-confirm').boundingBox();
      assert.ok(cancelBox && confirmBox);
      const footerInnerWidth = await dialog.getByTestId('ranking-save-dialog-cancel').evaluate((node) => {
        const footer = node.parentElement;
        if (!footer) return 0;
        const style = getComputedStyle(footer);
        return footer.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
      });
      assert.ok(cancelBox.width >= footerInnerWidth - 1, `cancel is not full-width in footer: ${cancelBox.width}/${footerInnerWidth}`);
      assert.ok(confirmBox.width >= footerInnerWidth - 1, `confirm is not full-width in footer: ${confirmBox.width}/${footerInnerWidth}`);
      await portal.evaluate((node) => node.getBoundingClientRect().width);
    }

    await page.setViewportSize({ width: 320, height: 844 });
    await mount('idle');
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    const close = page.getByRole('button', { name: '닫기' });
    const cancel = page.getByTestId('ranking-save-dialog-cancel');
    const confirm = page.getByTestId('ranking-save-dialog-confirm');

    await close.focus();
    await page.keyboard.press('Tab');
    assert.equal(await cancel.evaluate((node) => node === document.activeElement), true, 'Tab close→cancel');
    await page.keyboard.press('Tab');
    assert.equal(await confirm.evaluate((node) => node === document.activeElement), true, 'Tab cancel→confirm');
    await close.focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await confirm.evaluate((node) => node === document.activeElement), true, 'Shift+Tab close→confirm');
    await page.keyboard.press('Tab');
    assert.equal(await close.evaluate((node) => node === document.activeElement), true, 'focus loop confirm→close');
    await cancel.focus();
    assert.notEqual(await cancel.evaluate((node) => getComputedStyle(node).boxShadow), 'none', 'cancel focus ring');

    const assertTrigger = async (
      trigger: () => Promise<unknown>,
      expected: Calls,
      label: string,
    ) => {
      await mount('idle');
      await page.getByRole('dialog').waitFor();
      await reset();
      await trigger();
      await settle();
      assert.deepEqual(await readCalls(), expected, label);
    };
    await assertTrigger(
      () => page.getByRole('button', { name: '닫기' }).click(),
      { close: 1, confirm: 0, unrelated: 0 },
      'close callback ledger',
    );
    await assertTrigger(
      () => page.getByTestId('ranking-save-dialog-cancel').click(),
      { close: 1, confirm: 0, unrelated: 0 },
      'cancel callback ledger',
    );
    await assertTrigger(
      () => page.getByTestId('ranking-save-dialog-confirm').click(),
      { close: 0, confirm: 1, unrelated: 0 },
      'confirm callback ledger',
    );
    await assertTrigger(async () => {
      await page.getByTestId('ranking-save-dialog-confirm').focus();
      await page.keyboard.press('Enter');
    }, { close: 0, confirm: 1, unrelated: 0 }, 'Enter confirm ledger');
    await assertTrigger(async () => {
      await page.getByTestId('ranking-save-dialog-cancel').focus();
      await page.keyboard.press('Space');
    }, { close: 1, confirm: 0, unrelated: 0 }, 'Space cancel ledger');
    await assertTrigger(
      () => page.keyboard.press('Escape'),
      { close: 1, confirm: 0, unrelated: 0 },
      'Escape callback ledger',
    );
    await assertTrigger(
      () => page.locator('[role="dialog"]').click({ position: { x: 8, y: 8 } }),
      { close: 0, confirm: 0, unrelated: 0 },
      'inner dialog must not bubble',
    );
    await assertTrigger(
      () => page.getByRole('dialog').locator('xpath=..').click({ position: { x: 1, y: 1 } }),
      { close: 1, confirm: 0, unrelated: 0 },
      'backdrop callback ledger',
    );

    await mount('idle');
    await page.getByRole('dialog').waitFor();
    await reset();
    await page.getByTestId('ranking-save-dialog-confirm').dblclick({ delay: 0 });
    await settle();
    assert.deepEqual(await readCalls(), { close: 0, confirm: 1, unrelated: 0 }, 'fast double confirm exact one');
    assert.equal(await page.getByTestId('ranking-save-dialog-confirm').getAttribute('aria-busy'), 'true');
    assert.equal(await page.getByTestId('ranking-save-dialog-confirm').textContent(), '저장 중...');
    assert.equal(await page.getByTestId('ranking-save-dialog-cancel').isDisabled(), true);
    assert.equal(await page.getByTestId('ranking-save-dialog-confirm').isDisabled(), true);
    await page.getByRole('button', { name: '닫기' }).click();
    await page.keyboard.press('Escape');
    assert.deepEqual(await readCalls(), { close: 0, confirm: 1, unrelated: 0 }, 'saving controls must be inert');

    await mount('saving');
    await page.getByRole('dialog').waitFor();
    await reset();
    await page.getByTestId('ranking-save-dialog-cancel').press('Enter');
    await page.getByTestId('ranking-save-dialog-confirm').press('Space');
    await page.getByRole('button', { name: '닫기' }).press('Enter');
    await page.keyboard.press('Escape');
    assert.deepEqual(await readCalls(), { close: 0, confirm: 0, unrelated: 0 }, 'saving pointer and keyboard ledger');

    await page.evaluate(() => (
      window as unknown as { __RANKING_SAVE_DIALOG_TEST__: { unmountDialog: () => void } }
    ).__RANKING_SAVE_DIALOG_TEST__.unmountDialog());
    await settle();
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'clip', 'body overflow restoration');
    await reset();
    await page.keyboard.press('Escape');
    assert.deepEqual(await readCalls(), { close: 0, confirm: 0, unrelated: 0 }, 'Escape cleanup after unmount');
    assert.deepEqual(diagnostics, []);
    await driver();
  } finally {
    await browser?.close();
    await server.close();
  }
});
