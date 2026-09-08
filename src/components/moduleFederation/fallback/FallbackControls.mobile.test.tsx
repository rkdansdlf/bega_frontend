import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';
import { createServer, type Plugin } from 'vite';

const buttonSource = readFileSync(new URL('./Button.tsx', import.meta.url), 'utf8');
const modalSource = readFileSync(new URL('./Modal.tsx', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(
  new URL('../../../../package.json', import.meta.url),
  'utf8',
)) as { scripts?: Record<string, string> };
const frontendRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const pagePath = '/__mf-fallback-controls-test.html';
const entryPath = '/__mf-fallback-controls-test.tsx';
const moduleId = '\0virtual:mf-fallback-controls-test';
const actualTestPath = 'src/components/moduleFederation/fallback/FallbackControls.mobile.test.tsx';

const mutation = {
  bodyRestore: process.env.MF_FALLBACK_MUTATE_BODY_RESTORE === '1',
  callbackTwice: process.env.MF_FALLBACK_MUTATE_CALLBACK_TWICE === '1',
  dualDispatch: process.env.MF_FALLBACK_MUTATE_DUAL_DISPATCH === '1',
  escapeCleanup: process.env.MF_FALLBACK_MUTATE_ESCAPE_CLEANUP === '1',
  focusTrap: process.env.MF_FALLBACK_MUTATE_FOCUS_TRAP === '1',
  internalPropagation: process.env.MF_FALLBACK_MUTATE_INTERNAL_PROPAGATION === '1',
  missingOnClose: process.env.MF_FALLBACK_MUTATE_MISSING_ONCLOSE === '1',
  packageInclusion: process.env.MF_FALLBACK_MUTATE_PACKAGE_INCLUSION === '1',
  reverseVisibility: process.env.MF_FALLBACK_MUTATE_REVERSE_VISIBILITY === '1',
};

const createFallbackControlsPlugin = (): Plugin => ({
  name: 'mf-fallback-controls-actual-mount-test',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (request.url?.split('?')[0] !== pagePath) {
        next();
        return;
      }
      try {
        const html = await server.transformIndexHtml(
          pagePath,
          `<!doctype html><html><body><button id="outside" type="button">outside</button><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`,
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
      import React, { StrictMode, createElement, useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import '/src/index.css';
      import FallbackButton from '/src/components/moduleFederation/fallback/Button.tsx';
      import FallbackModal from '/src/components/moduleFederation/fallback/Modal.tsx';

      const calls = {
        button: 0,
        internal: 0,
        modalClose: 0,
        modalOpenChange: [],
        fetch: 0,
        xhr: 0,
        beacon: 0,
      };
      const keydownListeners = new Set();
      const originalAdd = window.addEventListener.bind(window);
      const originalRemove = window.removeEventListener.bind(window);
      window.addEventListener = (type, listener, options) => {
        if (type === 'keydown') keydownListeners.add(listener);
        return originalAdd(type, listener, options);
      };
      window.removeEventListener = (type, listener, options) => {
        if (type === 'keydown') keydownListeners.delete(listener);
        return originalRemove(type, listener, options);
      };
      const originalFetch = window.fetch.bind(window);
      const originalXhrOpen = XMLHttpRequest.prototype.open;
      const originalBeacon = navigator.sendBeacon?.bind(navigator);
      window.fetch = (...args) => {
        calls.fetch += 1;
        return Promise.reject(new Error('blocked fetch: ' + String(args[0])));
      };
      XMLHttpRequest.prototype.open = function (...args) {
        calls.xhr += 1;
        throw new Error('blocked xhr: ' + String(args[1]));
      };
      navigator.sendBeacon = () => {
        calls.beacon += 1;
        return false;
      };

      const buttonLabels = {
        single: '확인',
        longKorean: '모바일 화면에서도 문장이 버튼 경계를 벗어나지 않고 자연스럽게 여러 줄로 표시되는 긴 작업 이름',
        unbroken: 'UNBROKENTOKENWITHOUTSPACESUNBROKENTOKENWITHOUTSPACESUNBROKENTOKENWITHOUTSPACES',
      };
      const modalCopy = {
        empty: { title: undefined, body: '' },
        single: { title: '모달 제목', body: '모달 본문' },
        longKorean: {
          title: '모바일 화면에서 긴 제목이 닫기 버튼을 가리지 않고 여러 줄로 표시되는 모달 제목',
          body: '모바일 화면에서도 긴 본문이 대화상자 안에서 자연스럽게 줄바꿈되고 필요한 경우 내부에서 세로로 스크롤됩니다. '.repeat(28),
        },
        unbroken: {
          title: 'UNBROKENTITLEWITHOUTSPACES'.repeat(12),
          body: 'UNBROKENBODYWITHOUTSPACES'.repeat(80),
        },
      };

      function ButtonHost({ options }) {
        return createElement(FallbackButton, {
          'aria-label': options.size === 'icon' || options.size === 'iconTouch' ? '아이콘 작업' : undefined,
          className: options.consumerClassName ? 'justify-start' : undefined,
          disabled: options.disabled,
          onClick: () => { calls.button += 1; },
          size: options.size,
          variant: options.variant,
        }, options.size === 'icon' || options.size === 'iconTouch' ? '＋' : buttonLabels[options.data || 'single']);
      }

      function ModalHost({ options }) {
        const hasOpen = Object.prototype.hasOwnProperty.call(options, 'open');
        const hasIsOpen = Object.prototype.hasOwnProperty.call(options, 'isOpen');
        const initialVisible = Boolean(hasOpen ? options.open : options.isOpen);
        const [visible, setVisible] = useState(initialVisible);
        const props = {
          title: modalCopy[options.data || 'single'].title,
        };
        if (hasOpen) props.open = options.open ? visible : false;
        if (hasIsOpen) props.isOpen = options.isOpen ? visible : false;
        if (options.callbackMode === 'both' || options.callbackMode === 'open-change') {
          props.onOpenChange = (next) => {
            calls.modalOpenChange.push(next);
            setVisible(next);
          };
        }
        if (options.callbackMode === 'both' || options.callbackMode === 'close') {
          props.onClose = () => {
            calls.modalClose += 1;
            setVisible(false);
          };
        }
        return createElement(FallbackModal, props,
          createElement('div', { 'data-testid': 'mf-fallback-modal-body' },
            createElement('p', null, modalCopy[options.data || 'single'].body),
            createElement('button', {
              'data-testid': 'mf-fallback-modal-internal-action',
              onClick: () => { calls.internal += 1; },
              type: 'button',
            }, '내부 작업'),
          ),
        );
      }

      const root = createRoot(document.getElementById('root'));
      let generation = 0;
      const mount = (mode, options = {}) => {
        generation += 1;
        const Host = mode === 'button' ? ButtonHost : ModalHost;
        root.render(createElement(StrictMode, null, createElement(Host, {
          key: generation,
          options,
        })));
      };
      const resetCalls = () => {
        calls.button = 0;
        calls.internal = 0;
        calls.modalClose = 0;
        calls.modalOpenChange.length = 0;
      };
      window.__MF_FALLBACK_CONTROLS_TEST__ = {
        calls,
        effectiveKeydownListeners: () => keydownListeners.size,
        mount,
        resetCalls,
        unmount: () => root.unmount(),
        restore: () => {
          window.addEventListener = originalAdd;
          window.removeEventListener = originalRemove;
          window.fetch = originalFetch;
          XMLHttpRequest.prototype.open = originalXhrOpen;
          if (originalBeacon) navigator.sendBeacon = originalBeacon;
        },
      };
      mount('button', { data: 'single' });
    `;
  },
  transform(code, id) {
    if (id.includes('/src/components/moduleFederation/fallback/Modal.tsx')) {
      let transformed = code;
      if (mutation.callbackTwice) {
        transformed = transformed.replace('onOpenChange(false);', 'onOpenChange(false); onOpenChange(false);');
      }
      if (mutation.dualDispatch) {
        transformed = transformed.replace('onOpenChange(false);\n      return;', 'onOpenChange(false);');
      }
      if (mutation.missingOnClose) {
        transformed = transformed.replace('onClose?.();', 'void onClose;');
      }
      if (mutation.reverseVisibility) {
        transformed = transformed.replace('open ?? isOpen', 'isOpen ?? open');
      }
      return transformed;
    }
    if (id.includes('/src/components/ui/plain-dialog.tsx')) {
      let transformed = code;
      if (mutation.internalPropagation) {
        transformed = transformed
          .replace('onClick={(event) => event.stopPropagation()}', '')
          .replace(/onClick:\s*\(event\)\s*=>\s*event\.stopPropagation\(\),?/, '');
      }
      if (mutation.escapeCleanup) {
        transformed = transformed
          .replace("window.removeEventListener('keydown', handleKeyDown);", 'void handleKeyDown;')
          .replace('window.removeEventListener("keydown", handleKeyDown);', 'void handleKeyDown;');
      }
      if (mutation.bodyRestore) {
        transformed = transformed.replace('document.body.style.overflow = previousOverflow;', 'void previousOverflow;');
      }
      if (mutation.focusTrap) {
        transformed = transformed.replace(
          'useFocusTrap(dialogRef, { active: open, initialFocus });',
          'useFocusTrap(dialogRef, { active: false, initialFocus });',
        );
      }
      return transformed;
    }
    return undefined;
  },
});

type Calls = {
  button: number;
  internal: number;
  modalClose: number;
  modalOpenChange: boolean[];
  fetch: number;
  xhr: number;
  beacon: number;
};

type Runtime = {
  calls: Calls;
  effectiveKeydownListeners: () => number;
  mount: (mode: 'button' | 'modal', options?: Record<string, unknown>) => void;
  resetCalls: () => void;
  unmount: () => void;
};

test('fallback controls keep stable QA targets, compatibility mappings, and package inclusion', () => {
  assert.match(buttonSource, /data-testid="mf-fallback-button"/);
  assert.match(buttonSource, /case 'primary':[\s\S]*return 'brand'/);
  assert.match(buttonSource, /case 'large':[\s\S]*return 'lg'/);
  assert.match(buttonSource, /max-w-full/);
  assert.match(buttonSource, /\[overflow-wrap:anywhere\]/);
  assert.match(buttonSource, /h-auto[^`\n]*!whitespace-normal/);
  assert.match(buttonSource, /active:scale-\[0\.98\]/);
  assert.match(buttonSource, /motion-reduce:transform-none/);
  assert.match(modalSource, /contentTestId="mf-fallback-modal"/);
  assert.match(modalSource, /bodyClassName="\[overflow-wrap:anywhere\]"/);
  assert.match(modalSource, /if \(onOpenChange\)/);
  assert.match(modalSource, /onOpenChange\(false\);[\s\S]*return;[\s\S]*onClose\?\.\(\)/);
  assert.doesNotMatch(buttonSource, /from ['"](?:\.\.\/)*api\//);
  assert.doesNotMatch(modalSource, /from ['"](?:\.\.\/)*api\//);

  const command = packageJson.scripts?.['previsual-qa:harness:test'] ?? '';
  const occurrences = mutation.packageInclusion
    ? 0
    : command.split(actualTestPath).length - 1;
  assert.equal(occurrences, 1, `${actualTestPath} must appear exactly once in previsual-qa:harness:test`);
});

test('actual fallback Button contains every mobile presentation and isolates native activation', {
  timeout: 90_000,
}, async () => {
  const server = await createServer({
    configFile: fileURLToPath(new URL('../../../../vite.visual-qa.config.ts', import.meta.url)),
    logLevel: 'silent',
    plugins: [createFallbackControlsPlugin()],
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

    const mount = (options: Record<string, unknown>) => page.evaluate(async (nextOptions) => {
      (window as unknown as { __MF_FALLBACK_CONTROLS_TEST__: Runtime })
        .__MF_FALLBACK_CONTROLS_TEST__.mount('button', nextOptions);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    }, options);
    const reset = () => page.evaluate(() => {
      (window as unknown as { __MF_FALLBACK_CONTROLS_TEST__: Runtime })
        .__MF_FALLBACK_CONTROLS_TEST__.resetCalls();
    });
    const readCalls = () => page.evaluate(() => JSON.parse(JSON.stringify(
      (window as unknown as { __MF_FALLBACK_CONTROLS_TEST__: Runtime })
        .__MF_FALLBACK_CONTROLS_TEST__.calls,
    )) as Calls);
    const presentations = [
      ['default', 'default'], ['destructive', 'default'], ['outline', 'default'],
      ['secondary', 'default'], ['ghost', 'default'], ['link', 'default'],
      ['brand', 'default'], ['brandOutline', 'default'], ['brand', 'sm'],
      ['brand', 'lg'], ['brand', 'icon'], ['brand', 'iconTouch'],
      ['brand', 'touch'], ['brand', 'touchLg'],
    ] as const;
    const problems: string[] = [];
    const metrics: Record<string, unknown> = {};

    for (const viewport of [320, 390] as const) {
      await page.setViewportSize({ width: viewport, height: viewport === 320 ? 844 : 1000 });
      for (const [variant, size] of presentations) {
        await mount({ data: 'single', size, variant });
        const button = page.getByTestId('mf-fallback-button');
        await button.waitFor();
        const box = await button.boundingBox();
        metrics[`${viewport}:${variant}:${size}`] = box;
        if (!box || box.height < 44 || box.width < 44 || box.x < 0 || box.x + box.width > viewport) {
          problems.push(`${viewport}:${variant}:${size} invalid touch/viewport rect ${JSON.stringify(box)}`);
        }
      }
      for (const data of ['longKorean', 'unbroken']) {
        await mount({ data, size: 'default', variant: 'default' });
        const button = page.getByTestId('mf-fallback-button');
        await button.waitFor();
        const containment = await button.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          return {
            clientWidth: node.clientWidth,
            documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            left: rect.left,
            right: rect.right,
            scrollWidth: node.scrollWidth,
          };
        });
        metrics[`${viewport}:${data}`] = containment;
        if (containment.left < 0 || containment.right > viewport + 0.5
          || containment.scrollWidth > containment.clientWidth + 0.5
          || containment.documentOverflow !== 0) {
          problems.push(`${viewport}:${data} overflow ${JSON.stringify(containment)}`);
        }
      }
    }

    await page.setViewportSize({ width: 320, height: 844 });
    await mount({ consumerClassName: true, data: 'single', size: 'large', variant: 'primary' });
    const mapped = page.getByTestId('mf-fallback-button');
    await mapped.waitFor();
    assert.match(await mapped.getAttribute('class') ?? '', /btn-brand/);
    assert.match(await mapped.getAttribute('class') ?? '', /min-h-11/);
    assert.match(await mapped.getAttribute('class') ?? '', /px-6/);
    assert.equal(await mapped.evaluate((node) => getComputedStyle(node).justifyContent), 'flex-start');

    await mount({ data: 'single', size: 'unknown', variant: 'unknown' });
    const defaulted = page.getByTestId('mf-fallback-button');
    await defaulted.waitFor();
    assert.match(await defaulted.getAttribute('class') ?? '', /bg-primary/);
    assert.match(await defaulted.getAttribute('class') ?? '', /min-h-11/);
    assert.match(await defaulted.getAttribute('class') ?? '', /px-4/);

    for (const activation of ['pointer', 'Enter', 'Space'] as const) {
      await mount({ data: 'single', size: 'default', variant: 'default' });
      const button = page.getByTestId('mf-fallback-button');
      await button.waitFor();
      await reset();
      if (activation === 'pointer') await button.click();
      else {
        await button.focus();
        await page.keyboard.press(activation);
      }
      assert.equal((await readCalls()).button, 1, activation);
    }

    await mount({ data: 'single', disabled: true, size: 'default', variant: 'default' });
    const disabled = page.getByTestId('mf-fallback-button');
    await disabled.waitFor();
    assert.equal(await disabled.isDisabled(), true);
    assert.equal(await disabled.evaluate((node) => getComputedStyle(node).pointerEvents), 'none');
    await reset();
    await disabled.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    assert.equal((await readCalls()).button, 0);

    await mount({ data: 'single', size: 'touch', variant: 'brand' });
    const stable = page.getByTestId('mf-fallback-button');
    await stable.waitFor();
    await reset();
    await stable.hover();
    await stable.focus();
    await page.mouse.move(1, 1);
    await page.setViewportSize({ width: 390, height: 1000 });
    await mount({ data: 'single', size: 'touch', variant: 'brand' });
    assert.equal((await readCalls()).button, 0, 'hover/focus/resize/keyed remount must not replay activation');
    const calls = await readCalls();
    assert.deepEqual({ beacon: calls.beacon, fetch: calls.fetch, xhr: calls.xhr }, { beacon: 0, fetch: 0, xhr: 0 });
    assert.deepEqual(diagnostics, []);
    assert.equal(problems.length, 0, `metrics=${JSON.stringify(metrics)} problems=${JSON.stringify(problems)}`);
  } finally {
    await browser?.close();
    await server.close();
  }
});

test('actual fallback Modal applies one close branch and preserves portal lifecycle contracts', {
  timeout: 120_000,
}, async () => {
  const server = await createServer({
    configFile: fileURLToPath(new URL('../../../../vite.visual-qa.config.ts', import.meta.url)),
    logLevel: 'silent',
    plugins: [createFallbackControlsPlugin()],
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

    const mount = (options: Record<string, unknown>) => page.evaluate(async (nextOptions) => {
      (window as unknown as { __MF_FALLBACK_CONTROLS_TEST__: Runtime })
        .__MF_FALLBACK_CONTROLS_TEST__.mount('modal', nextOptions);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    }, options);
    const reset = () => page.evaluate(() => {
      (window as unknown as { __MF_FALLBACK_CONTROLS_TEST__: Runtime })
        .__MF_FALLBACK_CONTROLS_TEST__.resetCalls();
    });
    const readCalls = () => page.evaluate(() => JSON.parse(JSON.stringify(
      (window as unknown as { __MF_FALLBACK_CONTROLS_TEST__: Runtime })
        .__MF_FALLBACK_CONTROLS_TEST__.calls,
    )) as Calls);
    const listenerCount = () => page.evaluate(() => (
      window as unknown as { __MF_FALLBACK_CONTROLS_TEST__: Runtime }
    ).__MF_FALLBACK_CONTROLS_TEST__.effectiveKeydownListeners());
    const settleEffects = () => page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    const dialog = page.getByRole('dialog');

    await page.evaluate(() => { document.body.style.overflow = 'clip'; });
    await mount({ callbackMode: 'both', data: 'single', open: true });
    await dialog.waitFor();
    await settleEffects();
    assert.deepEqual(await readCalls(), {
      beacon: 0,
      button: 0,
      fetch: 0,
      internal: 0,
      modalClose: 0,
      modalOpenChange: [],
      xhr: 0,
    }, 'initial StrictMode mount must not replay callbacks');
    assert.equal(await listenerCount(), 1, 'initial StrictMode mount must own one effective Escape listener');
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');

    await mount({ callbackMode: 'both', data: 'single', open: true });
    await dialog.waitFor();
    await settleEffects();
    assert.equal((await readCalls()).modalOpenChange.length, 0, 'keyed remount must not replay callbacks');
    assert.equal((await readCalls()).modalClose, 0, 'keyed remount must not replay fallback callback');
    assert.equal(await listenerCount(), 1, 'keyed remount must replace, not duplicate, Escape listener');

    for (const visibility of [
      { open: false, isOpen: true, visible: false },
      { open: true, isOpen: false, visible: true },
      { isOpen: true, visible: true },
      { isOpen: false, visible: false },
    ]) {
      const { visible, ...options } = visibility;
      await mount({ callbackMode: 'both', data: 'single', ...options });
      if (visible) await dialog.waitFor();
      else await dialog.waitFor({ state: 'detached' });
      assert.equal(await dialog.count(), visible ? 1 : 0, JSON.stringify(visibility));
    }

    const triggers: Array<{ name: string; run: () => Promise<void> }> = [
      { name: 'close', run: () => page.getByRole('button', { name: '닫기' }).click() },
      { name: 'backdrop', run: () => page.locator('.absolute.inset-0.flex.items-center.justify-center.p-4').click({ position: { x: 1, y: 1 } }) },
      { name: 'Escape', run: () => page.keyboard.press('Escape') },
    ];
    const callbackModes = [
      { mode: 'both', expectedOpen: [false], expectedClose: 0 },
      { mode: 'open-change', expectedOpen: [false], expectedClose: 0 },
      { mode: 'close', expectedOpen: [], expectedClose: 1 },
      { mode: 'none', expectedOpen: [], expectedClose: 0 },
    ];
    for (const trigger of triggers) {
      for (const callbackMode of callbackModes) {
        await mount({ callbackMode: callbackMode.mode, data: 'single', open: true });
        await dialog.waitFor();
        await reset();
        await trigger.run();
        if (callbackMode.mode === 'none') await dialog.waitFor();
        else await dialog.waitFor({ state: 'detached' });
        const calls = await readCalls();
        assert.deepEqual(calls.modalOpenChange, callbackMode.expectedOpen, `${trigger.name}/${callbackMode.mode}`);
        assert.equal(calls.modalClose, callbackMode.expectedClose, `${trigger.name}/${callbackMode.mode}`);
        assert.equal(calls.internal, 0, `${trigger.name}/${callbackMode.mode}`);
        assert.equal(
          await listenerCount(),
          callbackMode.mode === 'none' ? 1 : 0,
          `${trigger.name}/${callbackMode.mode} listener lifecycle`,
        );
      }
    }

    await mount({ callbackMode: 'none', data: 'single', open: true });
    await dialog.waitFor();
    await reset();
    await page.getByRole('button', { name: '닫기' }).click();
    assert.equal(await dialog.count(), 1, 'controlled no-callback modal stays open');
    assert.deepEqual((await readCalls()).modalOpenChange, []);
    assert.equal((await readCalls()).modalClose, 0);

    await mount({ callbackMode: 'both', data: 'single', open: true });
    await dialog.waitFor();
    await reset();
    const internal = page.getByTestId('mf-fallback-modal-internal-action');
    await internal.click();
    assert.equal(await dialog.count(), 1, 'internal dialog click must not reach backdrop close');
    assert.equal((await readCalls()).internal, 1);
    assert.deepEqual((await readCalls()).modalOpenChange, []);
    assert.equal((await readCalls()).modalClose, 0);

    const close = page.getByRole('button', { name: '닫기' });
    await close.focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await internal.evaluate((node) => node.matches(':focus-visible')), true, 'reverse focus loop');
    await page.keyboard.press('Tab');
    assert.equal(await close.evaluate((node) => node.matches(':focus-visible')), true, 'forward focus loop');

    const problems: string[] = [];
    const metrics: Record<string, unknown> = {};
    for (const viewport of [320, 390] as const) {
      await page.setViewportSize({ width: viewport, height: viewport === 320 ? 844 : 1000 });
      for (const data of ['longKorean', 'unbroken']) {
        await mount({ callbackMode: 'both', data, open: true });
        const content = page.getByTestId('mf-fallback-modal');
        await content.waitFor();
        const containment = await content.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          const body = node.querySelector('[data-testid="mf-fallback-modal-body"]');
          return {
            bodyClientWidth: body?.clientWidth ?? -1,
            bodyScrollWidth: body?.scrollWidth ?? -1,
            bottom: rect.bottom,
            documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            left: rect.left,
            right: rect.right,
            top: rect.top,
          };
        });
        metrics[`${viewport}:${data}`] = containment;
        if (containment.left < 0 || containment.right > viewport + 0.5
          || containment.top < 0 || containment.bottom > (viewport === 320 ? 844 : 1000) + 0.5
          || containment.bodyScrollWidth > containment.bodyClientWidth + 0.5
          || containment.documentOverflow !== 0) {
          problems.push(`${viewport}:${data} overflow ${JSON.stringify(containment)}`);
        }
        const closeBox = await page.getByRole('button', { name: '닫기' }).boundingBox();
        if (!closeBox || closeBox.width < 44 || closeBox.height < 44) {
          problems.push(`${viewport}:${data} close below 44px ${JSON.stringify(closeBox)}`);
        }
      }
    }

    await mount({ callbackMode: 'both', data: 'single', open: true });
    await dialog.waitFor();
    await reset();
    await page.setViewportSize({ width: 390, height: 1000 });
    assert.deepEqual((await readCalls()).modalOpenChange, []);
    assert.equal((await readCalls()).modalClose, 0);
    await page.getByRole('button', { name: '닫기' }).click();
    await dialog.waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'clip', 'body overflow restoration');
    assert.equal(await listenerCount(), 0);

    const calls = await readCalls();
    assert.deepEqual({ beacon: calls.beacon, fetch: calls.fetch, xhr: calls.xhr }, { beacon: 0, fetch: 0, xhr: 0 });
    assert.deepEqual(diagnostics, []);
    assert.equal(problems.length, 0, `metrics=${JSON.stringify(metrics)} problems=${JSON.stringify(problems)}`);
  } finally {
    await browser?.close();
    await server.close();
  }
});
