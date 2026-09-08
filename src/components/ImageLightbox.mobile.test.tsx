import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type Plugin, type ViteDevServer } from 'vite';

const componentSource = readFileSync(new URL('./ImageLightbox.tsx', import.meta.url), 'utf8');
const packageManifest = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { scripts: Record<string, string> };
const frontendRoot = fileURLToPath(new URL('../../', import.meta.url));
const pagePath = '/__image-lightbox-test.html';
const entryPath = '/__image-lightbox-test.tsx';
const moduleId = '\0virtual:image-lightbox-test';

const callbackSwapMutation = process.env.IMAGE_LIGHTBOX_MUTATE_CALLBACK_SWAP === '1';
const callbackDuplicateMutation = process.env.IMAGE_LIGHTBOX_MUTATE_CALLBACK_DUPLICATE === '1';
const wrapMutation = process.env.IMAGE_LIGHTBOX_MUTATE_WRAP === '1';
const propagationMutation = process.env.IMAGE_LIGHTBOX_MUTATE_PROPAGATION === '1';
const keyCleanupMutation = process.env.IMAGE_LIGHTBOX_MUTATE_KEY_CLEANUP === '1';
const overflowMutation = process.env.IMAGE_LIGHTBOX_MUTATE_OVERFLOW === '1';
const focusTrapMutation = process.env.IMAGE_LIGHTBOX_MUTATE_FOCUS_TRAP === '1';
const initialFocusMutation = process.env.IMAGE_LIGHTBOX_MUTATE_INITIAL_FOCUS === '1';
const fallbackMutation = process.env.IMAGE_LIGHTBOX_MUTATE_FALLBACK === '1';
const errorResetMutation = process.env.IMAGE_LIGHTBOX_MUTATE_ERROR_RESET === '1';
const touchMutation = process.env.IMAGE_LIGHTBOX_MUTATE_TOUCH === '1';
const presentationMutation = process.env.IMAGE_LIGHTBOX_MUTATE_PRESENTATION === '1';
const packageMutation = process.env.IMAGE_LIGHTBOX_MUTATE_PACKAGE ?? '';

const replaceRequired = (source: string, from: string, to: string, label: string) => {
  assert.ok(source.includes(from), `${label} mutation target missing`);
  return source.replace(from, to);
};

type AsyncCloseable = {
  close: () => Promise<void>;
};

const cleanupLightboxTestResources = async (resources: {
  browser?: AsyncCloseable;
  server?: AsyncCloseable;
  cacheDir?: string;
}): Promise<void> => {
  const errors: unknown[] = [];
  const attempt = async (cleanup?: () => Promise<void>) => {
    if (!cleanup) return;
    try {
      await cleanup();
    } catch (error) {
      errors.push(error);
    }
  };

  await attempt(resources.browser ? () => resources.browser?.close() ?? Promise.resolve() : undefined);
  await attempt(resources.server ? () => resources.server?.close() ?? Promise.resolve() : undefined);
  await attempt(resources.cacheDir
    ? () => rm(resources.cacheDir as string, { recursive: true, force: true })
    : undefined);

  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) {
    const aggregate = new Error(`ImageLightbox test cleanup failed (${errors.length} errors)`) as Error & {
      errors: unknown[];
    };
    aggregate.errors = errors;
    throw aggregate;
  }
};

const createLightboxPlugin = (): Plugin => ({
  name: 'image-lightbox-actual-mount-test',
  enforce: 'pre',
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
    if (!id.split('?')[0].endsWith('/src/components/ImageLightbox.tsx')) return undefined;
    let transformed = code;
    if (propagationMutation) {
      transformed = replaceRequired(
        transformed,
        'onClick={(event) => event.stopPropagation()}',
        'onClick={() => onClose()}',
        'internal propagation',
      );
    }
    if (keyCleanupMutation) {
      transformed = replaceRequired(
        transformed,
        "window.removeEventListener('keydown', handleKeyDown);",
        '',
        'keydown cleanup',
      );
    }
    if (overflowMutation) {
      transformed = replaceRequired(
        transformed,
        'document.body.style.overflow = previousOverflow;',
        "document.body.style.overflow = 'auto';",
        'overflow restoration',
      );
    }
    if (focusTrapMutation) {
      transformed = replaceRequired(
        transformed,
        'useFocusTrap(dialogRef, { active: true });',
        '',
        'focus trap',
      );
    }
    if (initialFocusMutation) {
      transformed = replaceRequired(
        transformed,
        'useFocusTrap(dialogRef, { active: true });',
        "useFocusTrap(dialogRef, { active: true, initialFocus: 'container' });",
        'initial focus',
      );
    }
    if (fallbackMutation) {
      transformed = replaceRequired(
        transformed,
        'data-testid="image-lightbox-error"',
        'data-testid="image-lightbox-error-removed"',
        'broken fallback',
      );
    }
    if (errorResetMutation) {
      transformed = replaceRequired(
        transformed,
        'setImageFailed(false);',
        'setImageFailed((current) => current);',
        'error reset',
      );
    }
    if (touchMutation) {
      transformed = transformed.split('size-11').join('size-10');
      assert.notEqual(transformed, code, 'touch mutation target missing');
    }
    if (presentationMutation) {
      const presentation = 'focus-visible:ring-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none';
      transformed = replaceRequired(transformed, presentation, '', 'presentation state');
    }
    return transformed === code ? undefined : transformed;
  },
  load(id) {
    if (id !== moduleId) return undefined;
    return `
      import React, { StrictMode, createElement, useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import ImageLightbox from '/src/components/ImageLightbox.tsx';
      import '/src/index.css';

      const validImage = (label, color) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="' + color + '"/><text x="320" y="250" text-anchor="middle" fill="white" font-size="48">' + label + '</text></svg>'
      );
      const fixtures = {
        single: [validImage('1', '#155e75')],
        'multiple-three': [validImage('1', '#155e75'), validImage('2', '#7c3aed'), validImage('3', '#b45309')],
        'maximum-supported': Array.from({ length: 10 }, (_, index) => validImage(String(index + 1), index % 2 === 0 ? '#155e75' : '#7c3aed')),
        'broken-image': ['data:image/png;base64,this-is-not-a-valid-image'],
        'broken-then-valid': ['data:image/png;base64,this-is-not-a-valid-image', validImage('2', '#7c3aed')],
      };
      const mutations = {
        callbackSwap: ${callbackSwapMutation ? 'true' : 'false'},
        callbackDuplicate: ${callbackDuplicateMutation ? 'true' : 'false'},
        wrap: ${wrapMutation ? 'true' : 'false'},
      };
      const calls = { close: 0, prev: 0, next: 0 };
      let setCurrentIndex = () => {};

      function Host({ initialData, initialIndex }) {
        const images = fixtures[initialData];
        const [open, setOpen] = useState(true);
        const [currentIndex, setIndex] = useState(initialIndex);
        setCurrentIndex = setIndex;
        const recordClose = () => {
          calls.close += 1;
          if (mutations.callbackDuplicate) calls.close += 1;
          setOpen(false);
        };
        const recordPrev = () => {
          calls.prev += 1;
          if (mutations.callbackDuplicate) calls.prev += 1;
          setIndex((current) => mutations.wrap ? Math.max(0, current - 1) : (current - 1 + images.length) % images.length);
        };
        const recordNext = () => {
          calls.next += 1;
          if (mutations.callbackDuplicate) calls.next += 1;
          setIndex((current) => mutations.wrap ? Math.min(images.length - 1, current + 1) : (current + 1) % images.length);
        };
        if (!open) return null;
        return createElement(ImageLightbox, {
          images,
          currentIndex,
          onClose: mutations.callbackSwap ? recordPrev : recordClose,
          onPrev: mutations.callbackSwap ? recordNext : recordPrev,
          onNext: mutations.callbackSwap ? recordClose : recordNext,
        });
      }

      const root = createRoot(document.getElementById('root'));
      let generation = 0;
      const mount = (data = 'multiple-three', index = 1) => {
        generation += 1;
        root.render(createElement(StrictMode, null, createElement(Host, {
          key: generation,
          initialData: data,
          initialIndex: index,
        })));
      };
      const unmountLightbox = () => {
        generation += 1;
        root.render(createElement(StrictMode, null, null));
      };
      const reset = () => {
        calls.close = 0;
        calls.prev = 0;
        calls.next = 0;
      };
      window.__IMAGE_LIGHTBOX_TEST__ = {
        calls,
        mount,
        reset,
        setIndex: (index) => setCurrentIndex(index),
        unmountLightbox,
      };
      document.getElementById('outside').focus();
      mount();
    `;
  },
});

type Calls = { close: number; prev: number; next: number };
type Driver = {
  calls: Calls;
  mount: (data?: string, index?: number) => void;
  reset: () => void;
  setIndex: (index: number) => void;
  unmountLightbox: () => void;
};

const readCalls = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify((
  window as unknown as { __IMAGE_LIGHTBOX_TEST__: Driver }
).__IMAGE_LIGHTBOX_TEST__.calls)) as Calls);

const resetCalls = (page: Page) => page.evaluate(() => (
  window as unknown as { __IMAGE_LIGHTBOX_TEST__: Driver }
).__IMAGE_LIGHTBOX_TEST__.reset());

const mount = (page: Page, data = 'multiple-three', index = 1) => page.evaluate(
  ({ nextData, nextIndex }) => (
    window as unknown as { __IMAGE_LIGHTBOX_TEST__: Driver }
  ).__IMAGE_LIGHTBOX_TEST__.mount(nextData, nextIndex),
  { nextData: data, nextIndex: index },
);

const settle = (page: Page) => page.evaluate(() => new Promise<void>((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
}));

test('ImageLightbox keeps the leaf-local dialog, Korean, fallback, and presentation contract', () => {
  assert.match(componentSource, /role="dialog"/);
  assert.match(componentSource, /aria-modal="true"/);
  assert.match(componentSource, /aria-label="이미지 보기"/);
  assert.match(componentSource, /이미지 보기 닫기/);
  assert.match(componentSource, /이전 이미지/);
  assert.match(componentSource, /다음 이미지/);
  assert.match(componentSource, /이미지를 불러올 수 없습니다/);
  assert.match(componentSource, /useFocusTrap/);
  assert.match(componentSource, /size-11/g);
  assert.match(componentSource, /motion-reduce:transition-none/);
  assert.doesNotMatch(componentSource, /from ['"](?:\.\.\/)*api\//);
  assert.doesNotMatch(componentSource, /\b(?:axios|fetch|useQuery|useMutation)\b/);
});

test('unit and pre-harness gates include the focused actual test exactly once', () => {
  const testPath = 'src/components/ImageLightbox.mobile.test.tsx';
  const unitCommand = packageManifest.scripts['test:unit'] ?? '';
  assert.ok(unitCommand.includes('"src/**/*.test.ts"'));
  assert.ok(unitCommand.includes('"src/**/*.test.tsx"'));
  const originalCommand = packageManifest.scripts['previsual-qa:harness:test'] ?? '';
  const command = packageMutation === 'missing'
    ? originalCommand.replace(testPath, '')
    : packageMutation === 'duplicate'
      ? `${originalCommand} ${testPath}`
      : originalCommand;
  assert.equal(
    command.split(testPath).length - 1,
    1,
    `previsual-qa:harness:test must include ${testPath} exactly once`,
  );
});

test('cleanup still closes the server and removes the cache after browser close rejects', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'image-lightbox-cleanup-browser-'));
  const attempts: string[] = [];
  const browserFailure = new Error('browser close failed');
  try {
    await assert.rejects(
      cleanupLightboxTestResources({
        browser: {
          close: async () => {
            attempts.push('browser');
            throw browserFailure;
          },
        },
        server: {
          close: async () => {
            attempts.push('server');
          },
        },
        cacheDir,
      }),
      (error) => error === browserFailure,
    );
    assert.deepEqual(attempts, ['browser', 'server']);
    await assert.rejects(access(cacheDir), { code: 'ENOENT' });
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test('cleanup still removes the cache after server close rejects', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'image-lightbox-cleanup-server-'));
  const attempts: string[] = [];
  const serverFailure = new Error('server close failed');
  try {
    await assert.rejects(
      cleanupLightboxTestResources({
        browser: {
          close: async () => {
            attempts.push('browser');
          },
        },
        server: {
          close: async () => {
            attempts.push('server');
            throw serverFailure;
          },
        },
        cacheDir,
      }),
      (error) => error === serverFailure,
    );
    assert.deepEqual(attempts, ['browser', 'server']);
    await assert.rejects(access(cacheDir), { code: 'ENOENT' });
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test('cleanup reports every closer failure after all cleanup attempts finish', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'image-lightbox-cleanup-aggregate-'));
  const attempts: string[] = [];
  const browserFailure = new Error('browser close failed');
  const serverFailure = new Error('server close failed');
  try {
    await assert.rejects(
      cleanupLightboxTestResources({
        browser: {
          close: async () => {
            attempts.push('browser');
            throw browserFailure;
          },
        },
        server: {
          close: async () => {
            attempts.push('server');
            throw serverFailure;
          },
        },
        cacheDir,
      }),
      (error) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, 'ImageLightbox test cleanup failed (2 errors)');
        assert.deepEqual((error as Error & { errors?: unknown[] }).errors, [
          browserFailure,
          serverFailure,
        ]);
        return true;
      },
    );
    assert.deepEqual(attempts, ['browser', 'server']);
    await assert.rejects(access(cacheDir), { code: 'ENOENT' });
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
});

test('actual ImageLightbox is contained, focus-safe, stateful, and callback-exact', {
  timeout: 120_000,
}, async () => {
  let cacheDir: string | undefined;
  let server: ViteDevServer | undefined;
  let browser: Browser | undefined;
  try {
    cacheDir = await mkdtemp(join(tmpdir(), 'image-lightbox-vite-'));
    server = await createServer({
      cacheDir,
      configFile: fileURLToPath(new URL('../../vite.visual-qa.config.ts', import.meta.url)),
      logLevel: 'silent',
      plugins: [createLightboxPlugin()],
      root: frontendRoot,
      server: { host: '127.0.0.1', port: 0, strictPort: false },
    });
    await server.listen();
    const address = server.httpServer?.address();
    assert.ok(address && typeof address !== 'string');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 320, height: 844 } });
    const diagnostics: string[] = [];
    const externalImages: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') diagnostics.push(message.text());
    });
    page.on('pageerror', (error) => diagnostics.push(error.message));
    page.on('request', (request) => {
      if (request.resourceType() === 'image' && !request.url().startsWith('data:')) {
        externalImages.push(request.url());
      }
    });
    const response = await page.goto(`http://127.0.0.1:${address.port}${pagePath}`);
    assert.equal(response?.status(), 200);
    const lightbox = page.getByTestId('image-lightbox');
    await lightbox.waitFor({ timeout: 15_000 }).catch((error: unknown) => {
      throw new Error(`${String(error)}\n${diagnostics.join('\n')}`);
    });
    await settle(page);

    const assertZeroCalls = async (label: string) => {
      assert.deepEqual(await readCalls(page), { close: 0, prev: 0, next: 0 }, label);
    };
    const assertVisible = async () => {
      await page.getByTestId('image-lightbox').waitFor();
      await settle(page);
    };
    const mountVisible = async (data = 'multiple-three', index = 1) => {
      await mount(page, data, index);
      await assertVisible();
    };
    const assertTrigger = async (
      trigger: () => Promise<unknown>,
      expected: Calls,
      label: string,
      data = 'multiple-three',
      index = 1,
    ) => {
      await mountVisible(data, index);
      await resetCalls(page);
      await trigger();
      await settle(page);
      assert.deepEqual(await readCalls(page), expected, label);
    };

    assert.equal(await lightbox.getAttribute('role'), 'dialog');
    assert.equal(await lightbox.getAttribute('aria-modal'), 'true');
    assert.equal(await lightbox.getAttribute('aria-label'), '이미지 보기');
    assert.equal(await page.getByRole('button', { name: '이미지 보기 닫기' }).count(), 1);
    assert.equal(await page.getByRole('button', { name: '이전 이미지' }).count(), 1);
    assert.equal(await page.getByRole('button', { name: '다음 이미지' }).count(), 1);
    assert.equal(
      await page.getByRole('button', { name: '이미지 보기 닫기' }).evaluate((node) => node === document.activeElement),
      true,
      'close receives initial focus',
    );
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    await assertZeroCalls('StrictMode mount callback ledger');
    await mountVisible();
    await assertZeroCalls('keyed remount callback ledger');

    for (const viewport of [
      { width: 320, height: 844 },
      { width: 390, height: 1000 },
    ] as const) {
      await page.setViewportSize(viewport);
      await mountVisible();
      const metrics = await page.evaluate(() => {
        const root = document.querySelector('[data-testid="image-lightbox"]');
        const content = document.querySelector('[data-testid="image-lightbox-content"]');
        const image = document.querySelector('[data-testid="image-lightbox-image"]');
        const closeNode = document.querySelector('[data-testid="image-lightbox-close"]');
        const prevNode = document.querySelector('[data-testid="image-lightbox-prev"]');
        const nextNode = document.querySelector('[data-testid="image-lightbox-next"]');
        const rootRect = root?.getBoundingClientRect();
        const contentRect = content?.getBoundingClientRect();
        const imageRect = image?.getBoundingClientRect();
        const closeRect = closeNode?.getBoundingClientRect();
        const prevRect = prevNode?.getBoundingClientRect();
        const nextRect = nextNode?.getBoundingClientRect();
        return {
          content: contentRect ? { x: contentRect.x, y: contentRect.y, width: contentRect.width, height: contentRect.height, right: contentRect.right, bottom: contentRect.bottom } : null,
          controls: [closeRect, prevRect, nextRect].map((value) => value ? ({ x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom }) : null),
          documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          image: imageRect ? { x: imageRect.x, y: imageRect.y, width: imageRect.width, height: imageRect.height, right: imageRect.right, bottom: imageRect.bottom } : null,
          root: rootRect ? { x: rootRect.x, y: rootRect.y, width: rootRect.width, height: rootRect.height, right: rootRect.right, bottom: rootRect.bottom } : null,
          viewport: { width: window.innerWidth, height: window.innerHeight },
        };
      });
      assert.deepEqual(metrics.viewport, viewport);
      assert.ok(metrics.root);
      assert.ok(Math.abs(metrics.root.x) <= 0.5 && Math.abs(metrics.root.y) <= 0.5);
      assert.ok(Math.abs(metrics.root.width - viewport.width) <= 0.5);
      assert.ok(Math.abs(metrics.root.height - viewport.height) <= 0.5);
      assert.equal(metrics.documentOverflow, 0);
      assert.ok(metrics.content && metrics.content.width <= viewport.width * 0.9 + 1);
      assert.ok(metrics.content && metrics.content.height <= viewport.height * 0.9 + 1);
      assert.ok(metrics.image && metrics.image.width <= viewport.width * 0.9 + 1);
      assert.ok(metrics.image && metrics.image.height <= viewport.height * 0.9 + 1);
      for (const control of metrics.controls) {
        assert.ok(control, 'control rect missing');
        assert.ok(control.width >= 44 && control.height >= 44, `touch target below 44px: ${JSON.stringify(control)}`);
        assert.ok(control.x >= -0.5 && control.y >= -0.5 && control.right <= viewport.width + 0.5 && control.bottom <= viewport.height + 0.5);
      }
      assert.ok(metrics.controls[1]!.width <= 45 && metrics.controls[2]!.width <= 45, 'arrows must not retain 64px obstruction');
      await assertZeroCalls(`${viewport.width}px resize callback ledger`);
    }

    await page.setViewportSize({ width: 320, height: 844 });
    await mountVisible('single', 0);
    assert.equal(await page.getByTestId('image-lightbox-prev').count(), 0);
    assert.equal(await page.getByTestId('image-lightbox-next').count(), 0);
    assert.equal((await page.getByTestId('image-lightbox-counter').textContent())?.trim(), '1 / 1');
    await resetCalls(page);
    await page.getByTestId('image-lightbox-content').click({ position: { x: 20, y: 20 } });
    await assertZeroCalls('content internal click callback ledger');

    await mountVisible('maximum-supported', 9);
    assert.equal((await page.getByTestId('image-lightbox-counter').textContent())?.trim(), '10 / 10');
    await assertZeroCalls('maximum supported callback ledger');

    await mountVisible('broken-then-valid', 0);
    await page.getByTestId('image-lightbox-error').waitFor();
    assert.match((await page.getByTestId('image-lightbox-error').textContent()) ?? '', /이미지를 불러올 수 없습니다/);
    await page.evaluate(() => (
      window as unknown as { __IMAGE_LIGHTBOX_TEST__: Driver }
    ).__IMAGE_LIGHTBOX_TEST__.setIndex(1));
    await page.getByTestId('image-lightbox-image').waitFor();
    await settle(page);
    assert.equal(await page.getByTestId('image-lightbox-error').count(), 0, 'error state resets for the next source/index');
    assert.equal((await page.getByTestId('image-lightbox-counter').textContent())?.trim(), '2 / 2');
    await assertZeroCalls('broken fallback and reset callback ledger');
    assert.deepEqual(
      diagnostics,
      ['Failed to load resource: net::ERR_INVALID_URL'],
      'the deliberate broken data URI is the only expected browser diagnostic',
    );
    diagnostics.length = 0;

    await mountVisible();
    const close = page.getByTestId('image-lightbox-close');
    const prev = page.getByTestId('image-lightbox-prev');
    const next = page.getByTestId('image-lightbox-next');
    assert.equal(await close.evaluate((node) => node === document.activeElement), true);
    await page.keyboard.press('Tab');
    assert.equal(await prev.evaluate((node) => node === document.activeElement), true, 'Tab close→prev');
    await assertZeroCalls('Tab close→prev callback ledger');
    await page.keyboard.press('Tab');
    assert.equal(await next.evaluate((node) => node === document.activeElement), true, 'Tab prev→next');
    await assertZeroCalls('Tab prev→next callback ledger');
    await page.keyboard.press('Tab');
    assert.equal(await close.evaluate((node) => node === document.activeElement), true, 'Tab next→close wrap');
    await assertZeroCalls('Tab next→close callback ledger');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await next.evaluate((node) => node === document.activeElement), true, 'Shift+Tab close→next wrap');
    await assertZeroCalls('Shift+Tab callback ledger');

    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await settle(page);
    await assertZeroCalls('theme toggle callback ledger');
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await assertZeroCalls('theme restore callback ledger');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await close.evaluate((node) => getComputedStyle(node).transitionProperty), 'none');
    await assertZeroCalls('reduced motion callback ledger');
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    for (const target of [close, prev, next]) {
      await target.hover();
      await assertZeroCalls('hover callback ledger');
      await target.focus();
      assert.notEqual(await target.evaluate((node) => getComputedStyle(node).boxShadow), 'none');
      await assertZeroCalls('focus-visible callback ledger');
      await target.hover();
      await page.mouse.down();
      assert.notEqual(await target.evaluate((node) => getComputedStyle(node).transform), 'none');
      await assertZeroCalls('pressed callback ledger');
      await page.mouse.move(160, 422);
      await page.mouse.up();
      await mountVisible();
      await resetCalls(page);
    }

    await assertTrigger(
      () => page.getByTestId('image-lightbox-close').click(),
      { close: 1, prev: 0, next: 0 },
      'close click exact callback',
    );
    assert.equal(await page.getByTestId('image-lightbox').count(), 0);
    await assertTrigger(
      () => page.getByTestId('image-lightbox').click({ position: { x: 1, y: 1 } }),
      { close: 1, prev: 0, next: 0 },
      'backdrop click exact callback',
    );
    await assertTrigger(
      () => page.keyboard.press('Escape'),
      { close: 1, prev: 0, next: 0 },
      'Escape exact callback',
    );
    await assertTrigger(
      () => page.getByTestId('image-lightbox-prev').click(),
      { close: 0, prev: 1, next: 0 },
      'previous first→last exact callback',
      'multiple-three',
      0,
    );
    assert.equal((await page.getByTestId('image-lightbox-counter').textContent())?.trim(), '3 / 3');
    await assertTrigger(
      () => page.getByTestId('image-lightbox-prev').click(),
      { close: 0, prev: 1, next: 0 },
      'previous middle→first exact callback',
    );
    assert.equal((await page.getByTestId('image-lightbox-counter').textContent())?.trim(), '1 / 3');
    await assertTrigger(
      () => page.getByTestId('image-lightbox-next').click(),
      { close: 0, prev: 0, next: 1 },
      'next middle→last exact callback',
    );
    assert.equal((await page.getByTestId('image-lightbox-counter').textContent())?.trim(), '3 / 3');
    await assertTrigger(
      () => page.getByTestId('image-lightbox-next').click(),
      { close: 0, prev: 0, next: 1 },
      'next last→first exact callback',
      'multiple-three',
      2,
    );
    assert.equal((await page.getByTestId('image-lightbox-counter').textContent())?.trim(), '1 / 3');

    for (const [key, target, expected] of [
      ['Enter', 'close', { close: 1, prev: 0, next: 0 }],
      ['Space', 'close', { close: 1, prev: 0, next: 0 }],
      ['Enter', 'prev', { close: 0, prev: 1, next: 0 }],
      ['Space', 'prev', { close: 0, prev: 1, next: 0 }],
      ['Enter', 'next', { close: 0, prev: 0, next: 1 }],
      ['Space', 'next', { close: 0, prev: 0, next: 1 }],
    ] as const) {
      await assertTrigger(async () => {
        await page.getByTestId(`image-lightbox-${target}`).focus();
        await page.keyboard.press(key);
      }, expected, `${key} ${target} exact callback`);
    }

    for (const [key, index, expected, counter] of [
      ['ArrowLeft', 0, { close: 0, prev: 1, next: 0 }, '3 / 3'],
      ['ArrowLeft', 1, { close: 0, prev: 1, next: 0 }, '1 / 3'],
      ['ArrowRight', 1, { close: 0, prev: 0, next: 1 }, '3 / 3'],
      ['ArrowRight', 2, { close: 0, prev: 0, next: 1 }, '1 / 3'],
    ] as const) {
      await assertTrigger(() => page.keyboard.press(key), expected, `${key} wrap exact callback`, 'multiple-three', index);
      assert.equal((await page.getByTestId('image-lightbox-counter').textContent())?.trim(), counter);
    }

    await mountVisible();
    await resetCalls(page);
    await page.getByTestId('image-lightbox-prev').click();
    await page.getByTestId('image-lightbox-prev').click();
    assert.deepEqual(await readCalls(page), { close: 0, prev: 2, next: 0 }, 'two deliberate previous actions stay legal');

    await mountVisible();
    await resetCalls(page);
    await page.getByTestId('image-lightbox-close').dblclick({ delay: 0 }).catch(() => undefined);
    await settle(page);
    assert.deepEqual(await readCalls(page), { close: 1, prev: 0, next: 0 }, 'fast close exact one');

    await page.evaluate(() => (
      window as unknown as { __IMAGE_LIGHTBOX_TEST__: Driver }
    ).__IMAGE_LIGHTBOX_TEST__.unmountLightbox());
    await settle(page);
    await page.locator('#outside').focus();
    await mountVisible();
    await page.getByTestId('image-lightbox').waitFor();
    assert.equal(
      await page.getByTestId('image-lightbox-close').evaluate((node) => node === document.activeElement),
      true,
      'close receives focus after externally focused mount',
    );
    await resetCalls(page);
    await page.evaluate(() => (
      window as unknown as { __IMAGE_LIGHTBOX_TEST__: Driver }
    ).__IMAGE_LIGHTBOX_TEST__.unmountLightbox());
    await settle(page);
    assert.equal(await page.getByTestId('image-lightbox').count(), 0);
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'clip', 'exact prior overflow restoration');
    assert.equal(await page.locator('#outside').evaluate((node) => node === document.activeElement), true, 'external focus restoration');
    await page.keyboard.press('Escape');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    assert.deepEqual(await readCalls(page), { close: 0, prev: 0, next: 0 }, 'keydown cleanup after unmount');

    assert.deepEqual(externalImages, [], 'external image requests');
    assert.deepEqual(diagnostics, []);
  } finally {
    await cleanupLightboxTestResources({ browser, server, cacheDir });
  }
});
