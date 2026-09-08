import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type Plugin, type ViteDevServer } from 'vite';

const packageManifest = JSON.parse(
  readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
) as { scripts: Record<string, string> };
const frontendRoot = fileURLToPath(new URL('../../../', import.meta.url));
const pagePath = '/__seat-view-direct-upload-modal-test.html';
const entryPath = '/__seat-view-direct-upload-modal-test.tsx';
const entryModuleId = '\0virtual:seat-view-direct-upload-modal-test';
const seatViewsModuleId = '\0virtual:seat-view-direct-upload-api-test';
const lockMutation = process.env.SEAT_VIEW_DIRECT_UPLOAD_MUTATE_LOCK === '1';
const packageMutation = process.env.SEAT_VIEW_DIRECT_UPLOAD_MUTATE_PACKAGE ?? '';

const createSeatViewDirectUploadPlugin = (): Plugin => ({
  name: 'seat-view-direct-upload-modal-actual-mount-test',
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
          `<!doctype html><html><body style="overflow:auto"><button id="outside" type="button">외부</button><div id="root"></div><script type="module" src="${entryPath}"></script></body></html>`,
        );
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(html);
      } catch (error) {
        next(error);
      }
    });
  },
  resolveId(id, importer) {
    if (id === entryPath) return entryModuleId;
    if (
      (id === '../../api/seatViews' || id.endsWith('/api/seatViews'))
      && importer?.includes('/src/components/stadiumSeatMap/SeatViewDirectUploadModal.tsx')
    ) {
      return seatViewsModuleId;
    }
    return undefined;
  },
  transform(code, id) {
    if (!lockMutation || !id.split('?')[0].endsWith('/SeatViewDirectUploadModal.tsx')) return undefined;
    return code.replace('if (submissionInFlightRef.current) return;', '');
  },
  load(id) {
    if (id === seatViewsModuleId) {
      return `
        export const SEAT_VIEW_UPLOAD_TAGS = [
          '탁 트임',
          '응원석 가까움',
          '그늘',
          '비/햇빛 가림',
          '통로 가까움',
          '화장실 가까움',
          '매점 가까움',
          '전광판 잘 보임',
          '포수 뒤',
          '외야 뷰',
          '가성비',
          '아이와 보기 좋음',
        ];
        export const submitDirectSeatViewUpload = (input) => (
          window.__SEAT_VIEW_DIRECT_UPLOAD_TEST__.recordDefaultSubmit(input)
        );
      `;
    }
    if (id !== entryModuleId) return undefined;
    return `
      import React, { createElement, useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import SeatViewDirectUploadModal from '/src/components/stadiumSeatMap/SeatViewDirectUploadModal.tsx';
      import '/src/index.css';

      const calls = { close: 0, defaultSubmit: 0, injectedSubmit: 0, submitted: 0 };
      let resolveInjectedSubmit;
      const submission = {
        id: 9001,
        storagePath: 'MOCK/seat-view/synthetic.png',
        photoUrl: null,
        sourceType: 'SEATMAP_UPLOAD',
        moderationStatus: 'PENDING',
        aiSuggestedLabel: null,
        aiConfidence: null,
        stadium: 'SYNTHETIC',
        section: '합성 좌석 구역',
        block: 'S-01',
        seatRow: '10열',
        seatNumber: '12번',
        rating: 5,
        comment: '비운영 합성 시야 설명',
        tags: ['탁 트임'],
      };

      const resetCalls = () => {
        calls.close = 0;
        calls.defaultSubmit = 0;
        calls.injectedSubmit = 0;
        calls.submitted = 0;
      };
      const pendingSubmission = (channel) => new Promise((resolve) => {
        if (channel === 'injected') resolveInjectedSubmit = resolve;
      });
      const recordDefaultSubmit = () => {
        calls.defaultSubmit += 1;
        return new Promise(() => {});
      };
      const injectedSubmit = () => {
        calls.injectedSubmit += 1;
        return pendingSubmission('injected');
      };

      const visualStates = {
        empty: {},
        maximum: {
          previewUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="180"%3E%3Crect width="320" height="180" fill="%232563eb"/%3E%3C/svg%3E',
          seatRow: 'R'.repeat(100),
          seatNumber: 'S'.repeat(100),
          rating: 5,
          comment: '합'.repeat(140),
          tags: ['탁 트임', '응원석 가까움', '그늘', '비/햇빛 가림', '통로 가까움'],
        },
        error: {
          errorMessage: '합성 업로드에 실패했습니다.',
        },
        submitting: {
          previewUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="180"%3E%3Crect width="320" height="180" fill="%232563eb"/%3E%3C/svg%3E',
          rating: 5,
          submitting: true,
          tags: ['탁 트임'],
        },
      };

      function Host({ pressure = 'default', visualState = 'empty' }) {
        const [open, setOpen] = useState(true);
        if (!open) return null;
        const location = pressure === 'long'
          ? {
              stadium: '모바일 화면에서 자연스럽게 줄바꿈되어야 하는 매우 긴 합성 테스트 야구장 이름',
              section: '여러 줄로 표시되어도 다른 요소를 가리지 않아야 하는 합성 좌석 구역 이름',
              block: 'SYNTHETIC-UNBROKEN-BLOCK-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            }
          : { stadium: 'SYNTHETIC', section: '합성 좌석 구역', block: 'S-01' };
        return createElement(SeatViewDirectUploadModal, {
          ...location,
          accentColor: '#2563eb',
          onClose: () => {
            calls.close += 1;
            setOpen(false);
          },
          onSubmitted: () => { calls.submitted += 1; },
          submitUpload: injectedSubmit,
          visualQaStateOverride: visualStates[visualState],
        });
      }

      const root = createRoot(document.getElementById('root'));
      let generation = 0;
      const mount = (pressure = 'default', visualState = 'empty') => {
        generation += 1;
        root.render(createElement(Host, { key: generation, pressure, visualState }));
      };
      const mountVisualState = (visualState) => mount('default', visualState);
      const unmountModal = () => {
        generation += 1;
        root.render(null);
      };
      const invokeSubmitTwice = () => {
        const button = document.querySelector('[data-testid="seat-view-direct-upload-submit"]');
        if (!button) throw new Error('submit button missing');
        const propsKey = Object.keys(button).find((key) => key.startsWith('__reactProps$'));
        if (!propsKey || typeof button[propsKey]?.onClick !== 'function') {
          throw new Error('React submit handler missing');
        }
        button[propsKey].onClick();
        button[propsKey].onClick();
      };
      const resolveSubmit = () => {
        if (!resolveInjectedSubmit) throw new Error('injected submit resolver missing');
        const resolve = resolveInjectedSubmit;
        resolveInjectedSubmit = undefined;
        resolve(submission);
      };

      window.__SEAT_VIEW_DIRECT_UPLOAD_TEST__ = {
        calls,
        invokeSubmitTwice,
        mount,
        mountVisualState,
        recordDefaultSubmit,
        resetCalls,
        resolveSubmit,
        unmountModal,
      };
      mount();
    `;
  },
});

type Calls = {
  close: number;
  defaultSubmit: number;
  injectedSubmit: number;
  submitted: number;
};

let browser: Browser;
let server: ViteDevServer;
let baseUrl: string;

before(async () => {
  server = await createServer({
    configFile: fileURLToPath(new URL('../../../vite.visual-qa.config.ts', import.meta.url)),
    logLevel: 'silent',
    plugins: [createSeatViewDirectUploadPlugin()],
    root: frontendRoot,
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  });
  await server.listen();
  const address = server.httpServer?.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}${pagePath}`;
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  await server?.close();
});

const openPage = async (viewport = { width: 320, height: 844 }) => {
  const page = await browser.newPage({ viewport });
  const diagnostics: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') diagnostics.push(message.text());
  });
  page.on('pageerror', (error) => diagnostics.push(error.message));
  const response = await page.goto(baseUrl);
  assert.equal(response?.status(), 200);
  await page.getByRole('dialog').waitFor({ timeout: 15_000 }).catch((error: unknown) => {
    throw new Error(`${String(error)}\n${diagnostics.join('\n')}`);
  });
  return { diagnostics, page };
};

const settle = (page: Page) => page.evaluate(() => new Promise<void>((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
}));

const readCalls = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify((
  window as unknown as { __SEAT_VIEW_DIRECT_UPLOAD_TEST__: { calls: Calls } }
).__SEAT_VIEW_DIRECT_UPLOAD_TEST__.calls)) as Calls);

test('seat-view direct upload focused test is included exactly once in the pre-harness gate', () => {
  const testPath = 'src/components/stadiumSeatMap/SeatViewDirectUploadModal.mobile.test.tsx';
  const originalCommand = packageManifest.scripts['previsual-qa:harness:test'] ?? '';
  const command = packageMutation === 'missing'
    ? originalCommand.replace(testPath, '')
    : packageMutation === 'duplicate'
      ? `${originalCommand} ${testPath}`
      : originalCommand;
  assert.equal(
    command.split(testPath).length - 1,
    1,
    'previsual-qa:harness:test must include the focused modal test exactly once',
  );
});

test('actual modal stays within 320/390 viewports, locks background scroll, and keeps touch actions reachable', {
  timeout: 90_000,
}, async () => {
  const { diagnostics, page } = await openPage();
  try {
    for (const viewport of [
      { width: 320, height: 844 },
      { width: 390, height: 700 },
    ] as const) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => (
        window as unknown as { __SEAT_VIEW_DIRECT_UPLOAD_TEST__: { mount: (pressure: string) => void } }
      ).__SEAT_VIEW_DIRECT_UPLOAD_TEST__.mount('long'));
      await page.getByRole('dialog').waitFor();
      await settle(page);
      const metrics = await page.evaluate(() => {
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
        const footer = dialog?.lastElementChild;
        const touchTargets = [
          document.querySelector('[aria-label="닫기"]'),
          document.querySelector('[aria-label="5점"]'),
          Array.from(document.querySelectorAll('button')).find((node) => node.textContent === '취소') ?? null,
          document.querySelector('[data-testid="seat-view-direct-upload-submit"]'),
        ].filter((node): node is Element => node !== null);
        const dialogRect = dialog?.getBoundingClientRect();
        const footerRect = footer?.getBoundingClientRect();
        return {
          bodyOverflow: document.body.style.overflow,
          dialog: dialogRect ? {
            bottom: dialogRect.bottom,
            height: dialogRect.height,
            right: dialogRect.right,
            width: dialogRect.width,
            x: dialogRect.x,
            y: dialogRect.y,
          } : null,
          documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          footer: footerRect ? {
            bottom: footerRect.bottom,
            height: footerRect.height,
            right: footerRect.right,
            width: footerRect.width,
            x: footerRect.x,
            y: footerRect.y,
          } : null,
          touchTargets: touchTargets.map((node) => {
            const rect = node.getBoundingClientRect();
            return {
              bottom: rect.bottom,
              height: rect.height,
              right: rect.right,
              width: rect.width,
              x: rect.x,
              y: rect.y,
            };
          }),
        };
      });
      assert.equal(metrics.bodyOverflow, 'hidden');
      assert.equal(metrics.documentOverflow, 0, `${viewport.width}px horizontal overflow`);
      for (const [label, rect] of [['dialog', metrics.dialog], ['footer', metrics.footer]] as const) {
        assert.ok(rect, `${label} rect missing`);
        assert.ok(rect.x >= -0.5 && rect.y >= -0.5, `${label} starts outside viewport: ${JSON.stringify(rect)}`);
        assert.ok(
          rect.right <= viewport.width + 0.5 && rect.bottom <= viewport.height + 0.5,
          `${label} escapes viewport: ${JSON.stringify(rect)}`,
        );
      }
      for (const rect of metrics.touchTargets) {
        assert.ok(rect && rect.width >= 44 && rect.height >= 44, `touch target below 44px: ${JSON.stringify(rect)}`);
      }
    }

    await page.evaluate(() => (
      window as unknown as { __SEAT_VIEW_DIRECT_UPLOAD_TEST__: { unmountModal: () => void } }
    ).__SEAT_VIEW_DIRECT_UPLOAD_TEST__.unmountModal());
    await settle(page);
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'auto');
    assert.deepEqual(diagnostics, []);
  } finally {
    await page.close();
  }
});

test('actual modal exposes visible keyboard focus and announces validation errors', {
  timeout: 90_000,
}, async () => {
  const { diagnostics, page } = await openPage();
  try {
    const close = page.getByRole('button', { name: '닫기' });
    const fileInput = page.getByTestId('seat-view-direct-upload-file');
    const fileSurface = page.getByTestId('seat-view-direct-upload-file-surface');
    assert.equal(await close.evaluate((node) => node === document.activeElement), true, 'initial close focus');
    const restingBorderColor = await fileSurface.evaluate((node) => getComputedStyle(node).borderColor);
    await page.keyboard.press('Tab');
    assert.equal(await fileInput.evaluate((node) => node === document.activeElement), true, 'Tab close→file');
    const focusedBorderColor = await fileSurface.evaluate((node) => getComputedStyle(node).borderColor);
    assert.notEqual(focusedBorderColor, restingBorderColor, 'hidden file input must expose a visible focus border');

    await page.getByTestId('seat-view-direct-upload-submit').click();
    const alert = page.getByRole('alert');
    await alert.waitFor();
    assert.equal(await alert.getAttribute('aria-live'), 'assertive');
    assert.match(await alert.textContent() ?? '', /사진 파일을 선택해주세요/);
    assert.deepEqual(await readCalls(page), {
      close: 0,
      defaultSubmit: 0,
      injectedSubmit: 0,
      submitted: 0,
    });
    assert.deepEqual(diagnostics, []);
  } finally {
    await page.close();
  }
});

test('actual modal renders deterministic nonproduction maximum, error, and submitting states', {
  timeout: 90_000,
}, async () => {
  const { diagnostics, page } = await openPage();
  try {
    const mountVisualState = (state: string) => page.evaluate((nextState) => (
      window as unknown as {
        __SEAT_VIEW_DIRECT_UPLOAD_TEST__: { mountVisualState: (state: string) => void };
      }
    ).__SEAT_VIEW_DIRECT_UPLOAD_TEST__.mountVisualState(nextState), state);

    await mountVisualState('maximum');
    await settle(page);
    assert.equal(await page.getByAltText('선택한 시야 사진').count(), 1);
    assert.equal(await page.getByTestId('seat-view-direct-upload-row').inputValue(), 'R'.repeat(100));
    assert.equal(await page.getByTestId('seat-view-direct-upload-seat').inputValue(), 'S'.repeat(100));
    assert.equal(await page.getByTestId('seat-view-direct-upload-comment').inputValue(), '합'.repeat(140));
    assert.equal(await page.locator('[data-testid^="seat-view-direct-upload-tag-"][aria-pressed="true"]').count(), 5);
    assert.equal(await page.getByRole('button', { name: '5점' }).getAttribute('aria-pressed'), 'true');

    await mountVisualState('error');
    await settle(page);
    assert.match(await page.getByRole('alert').textContent() ?? '', /합성 업로드에 실패했습니다/);

    await mountVisualState('submitting');
    await settle(page);
    for (const selector of [
      '[data-testid="seat-view-direct-upload-close"]',
      '[data-testid="seat-view-direct-upload-file"]',
      '[data-testid="seat-view-direct-upload-row"]',
      '[data-testid="seat-view-direct-upload-seat"]',
      '[data-testid="seat-view-direct-upload-rating-5"]',
      '[data-testid="seat-view-direct-upload-tag-0"]',
      '[data-testid="seat-view-direct-upload-comment"]',
      '[data-testid="seat-view-direct-upload-cancel"]',
      '[data-testid="seat-view-direct-upload-submit"]',
    ]) {
      assert.equal(await page.locator(selector).isDisabled(), true, `${selector} must be inert while submitting`);
    }
    assert.deepEqual(diagnostics, []);
  } finally {
    await page.close();
  }
});

test('actual modal accepts one submission when the same handler is invoked twice before rerender', {
  timeout: 90_000,
}, async () => {
  const { diagnostics, page } = await openPage();
  try {
    await page.getByTestId('seat-view-direct-upload-file').setInputFiles({
      name: 'synthetic-seat-view.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
    });
    await page.getByAltText('선택한 시야 사진').waitFor();
    await page.getByRole('button', { name: '5점' }).click();
    await page.getByRole('button', { name: '5점' }).getAttribute('aria-pressed').then((value) => {
      assert.equal(value, 'true');
    });
    await settle(page);
    await page.evaluate(() => (
      window as unknown as { __SEAT_VIEW_DIRECT_UPLOAD_TEST__: { resetCalls: () => void } }
    ).__SEAT_VIEW_DIRECT_UPLOAD_TEST__.resetCalls());
    await page.evaluate(() => (
      window as unknown as { __SEAT_VIEW_DIRECT_UPLOAD_TEST__: { invokeSubmitTwice: () => void } }
    ).__SEAT_VIEW_DIRECT_UPLOAD_TEST__.invokeSubmitTwice());
    await settle(page);
    assert.deepEqual(await readCalls(page), {
      close: 0,
      defaultSubmit: 0,
      injectedSubmit: 1,
      submitted: 0,
    });
    assert.equal(await page.getByTestId('seat-view-direct-upload-submit').isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: '취소' }).isDisabled(), true);
    await page.getByRole('button', { name: '닫기' }).click({ force: true });
    await page.keyboard.press('Escape');
    assert.deepEqual(await readCalls(page), {
      close: 0,
      defaultSubmit: 0,
      injectedSubmit: 1,
      submitted: 0,
    });

    await page.evaluate(() => (
      window as unknown as { __SEAT_VIEW_DIRECT_UPLOAD_TEST__: { resolveSubmit: () => void } }
    ).__SEAT_VIEW_DIRECT_UPLOAD_TEST__.resolveSubmit());
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    assert.deepEqual(await readCalls(page), {
      close: 1,
      defaultSubmit: 0,
      injectedSubmit: 1,
      submitted: 1,
    });
    assert.deepEqual(diagnostics, []);
  } finally {
    await page.close();
  }
});
