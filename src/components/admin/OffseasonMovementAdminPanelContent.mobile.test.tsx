import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { chromium } from 'playwright';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer, type Plugin } from 'vite';

import * as contentModule from './OffseasonMovementAdminPanelContent';
import type { OffseasonMovementAdminPanelContentProps } from './OffseasonMovementAdminPanelContent';
import { resolveComponentStateAdapter } from '../../visual-qa/stateAdapters';

const contentSource = readFileSync(new URL('./OffseasonMovementAdminPanelContent.tsx', import.meta.url), 'utf8');
const resultsSource = readFileSync(new URL('./OffseasonMovementAdminResultsRuntime.tsx', import.meta.url), 'utf8');

const componentId = 'src/components/admin/OffseasonMovementAdminPanelContent.tsx#OffseasonMovementAdminPanelContent';
const frontendRoot = fileURLToPath(new URL('../../../', import.meta.url));
const callbackTestEntryPath = '/__offseason-content-callback-test.ts';
const callbackTestPagePath = '/__offseason-content-callback-test.html';
const callbackTestModuleId = '\0virtual:offseason-content-callback-test';

const createCallbackTestPlugin = (): Plugin => ({
  name: 'offseason-content-callback-test',
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (request.url?.split('?')[0] !== callbackTestPagePath) {
        next();
        return;
      }
      try {
        const html = await server.transformIndexHtml(
          callbackTestPagePath,
          `<!doctype html><html><body><div id="root"></div><script type="module" src="${callbackTestEntryPath}"></script></body></html>`,
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
    return id === callbackTestEntryPath ? callbackTestModuleId : undefined;
  },
  load(id) {
    if (id !== callbackTestModuleId) return undefined;
    return `
      import { createElement } from 'react';
      import { createRoot } from 'react-dom/client';
      import Content from '/src/components/admin/OffseasonMovementAdminPanelContent.tsx';
      import { resolveComponentStateAdapter } from '/src/visual-qa/stateAdapters.ts';

      const calls = {
        onSearchChange: [],
        onTeamFilterChange: [],
        onUpdateField: [],
        onOpenCreateDialog: [],
        unrelated: [],
      };
      window.__OFFSEASON_CONTENT_CALLBACK_TEST__ = { calls };
      const resolved = resolveComponentStateAdapter('admin.offseason-movement-content', {
        componentId: '${componentId}',
        states: {
          data: 'maximum-supported',
          interactions: 'default',
          permissions: 'admin',
          system: 'idle',
        },
        variants: { preset: 'idle', theme: 'dark' },
      });
      const unrelated = (name) => (...args) => calls.unrelated.push([name, ...args]);
      createRoot(document.getElementById('root')).render(createElement(Content, {
        ...resolved.props,
        onSearchChange: (...args) => calls.onSearchChange.push(args),
        onTeamFilterChange: (...args) => calls.onTeamFilterChange.push(args),
        onUpdateField: (...args) => calls.onUpdateField.push(args),
        onOpenCreateDialog: (...args) => calls.onOpenCreateDialog.push(args),
        onSectionFilterChange: unrelated('onSectionFilterChange'),
        onFromDateChange: unrelated('onFromDateChange'),
        onToDateChange: unrelated('onToDateChange'),
        onApplyFilters: unrelated('onApplyFilters'),
        onResetFilters: unrelated('onResetFilters'),
        onQualityFilterChange: unrelated('onQualityFilterChange'),
        onRefresh: unrelated('onRefresh'),
        onDownloadCsvTemplate: unrelated('onDownloadCsvTemplate'),
        onOpenCsvImport: unrelated('onOpenCsvImport'),
        onOpenEditDialog: unrelated('onOpenEditDialog'),
        onDeleteTargetChange: unrelated('onDeleteTargetChange'),
        onDialogClose: unrelated('onDialogClose'),
        onSubmit: unrelated('onSubmit'),
        onDelete: unrelated('onDelete'),
      }));
    `;
  },
});

const resolveFallbackProps = () => resolveComponentStateAdapter(
  'admin.offseason-movement-content',
  {
    componentId,
    states: {
      data: 'populated',
      interactions: 'default',
      permissions: 'admin',
      system: 'idle',
    },
    variants: { preset: 'results-fallback', theme: 'dark' },
  },
).props as unknown as OffseasonMovementAdminPanelContentProps;

test('standalone content owns a bounded named mobile root', () => {
  assert.match(contentSource, /data-testid="admin-offseason-content"/);
  assert.match(contentSource, /className="[^"]*min-w-0[^"]*max-w-full/);
  assert.doesNotMatch(contentSource, /Suspense fallback=\{null\}/);
});

test('empty results remain visible before the wide table canvas at 320px', () => {
  const emptyIndex = resultsSource.indexOf('data-testid="admin-offseason-empty-results"');
  const scrollerIndex = resultsSource.indexOf('data-testid="admin-offseason-results-scroll"');
  assert.ok(emptyIndex >= 0, 'bounded empty results status must exist');
  assert.ok(scrollerIndex >= 0, 'wide table scroller must exist');
  assert.ok(emptyIndex < scrollerIndex, 'empty status must be emitted outside and before the 1120px table');
  assert.match(resultsSource, /admin-offseason-empty-results"[\s\S]*role="status"/);
  assert.match(resultsSource, /admin-offseason-results-scroll"[^>]*overflow-x-auto/);
  assert.match(resultsSource, /aria-label="스토브리그 이동 관리 결과"/);
});

test('standalone content keeps explicit controls and self-contained touch targets', () => {
  for (const selector of [
    'admin-offseason-search',
    'admin-offseason-team-trigger',
    'admin-offseason-open-create',
    'admin-offseason-apply-filters',
    'admin-offseason-reset-filters',
  ]) {
    assert.match(contentSource, new RegExp(`data-testid="${selector}"`), selector);
  }
  assert.match(contentSource, /adminMobileControlClassName\s*=\s*['"][^'"]*min-h-11/);
  assert.match(resultsSource, /data-testid=\{`admin-offseason-edit-\$\{movement\.id\}`\}[\s\S]*min-h-11 min-w-11/);
  assert.match(resultsSource, /data-testid=\{`admin-offseason-delete-\$\{movement\.id\}`\}[\s\S]*min-h-11 min-w-11/);
});

test('standalone content and leaves remain prop-only without transport imports', () => {
  for (const source of [contentSource, resultsSource]) {
    assert.doesNotMatch(source, /from ['"](?:\.\.\/)*api\//);
    assert.doesNotMatch(source, /\b(?:axios|fetch|useQuery|useMutation)\b/);
  }
});

test('actual Content DOM routes controlled callbacks exactly once without replay after resize', {
  timeout: 60_000,
}, async () => {
  const server = await createServer({
    configFile: fileURLToPath(new URL('../../../vite.visual-qa.config.ts', import.meta.url)),
    logLevel: 'silent',
    plugins: [createCallbackTestPlugin()],
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
    const browserDiagnostics: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') browserDiagnostics.push(message.text());
    });
    page.on('pageerror', (error) => browserDiagnostics.push(error.message));
    const response = await page.goto(`http://127.0.0.1:${address.port}${callbackTestPagePath}`);
    assert.equal(response?.status(), 200);

    const search = page.locator('[data-testid="admin-offseason-search"]');
    const team = page.locator('[data-testid="admin-offseason-team-trigger"]');
    await search.waitFor({ timeout: 10_000 }).catch((error: unknown) => {
      throw new Error(`${String(error)}\nBrowser diagnostics:\n${browserDiagnostics.join('\n')}`);
    });
    await search.fill('MOCK 모바일 검색 입력');
    await team.selectOption('LG');
    await page.locator('[data-testid="admin-offseason-open-create"]').click();
    const dialog = page.locator('[data-testid="admin-offseason-dialog"]');
    await dialog.waitFor();
    const summary = page.locator('[data-testid="admin-offseason-summary"]');
    const section = page.locator('[data-testid="admin-offseason-dialog-section-trigger"]');
    await summary.fill('MOCK 비생산 모바일 요약 입력');
    await section.selectOption('기타');

    const readCallbackCalls = () => page.evaluate(() => {
      const calls = (window as unknown as {
        __OFFSEASON_CONTENT_CALLBACK_TEST__: { calls: Record<string, unknown[]> };
      }).__OFFSEASON_CONTENT_CALLBACK_TEST__.calls;
      return {
        onSearchChange: calls.onSearchChange,
        onTeamFilterChange: calls.onTeamFilterChange,
        onUpdateField: calls.onUpdateField,
        onOpenCreateDialogCount: calls.onOpenCreateDialog.length,
        unrelated: calls.unrelated,
      };
    });
    const callsBeforeResize = await readCallbackCalls();
    assert.deepEqual(callsBeforeResize.onSearchChange, [['MOCK 모바일 검색 입력']]);
    assert.deepEqual(callsBeforeResize.onTeamFilterChange, [['LG']]);
    assert.deepEqual(callsBeforeResize.onUpdateField, [
      ['summary', 'MOCK 비생산 모바일 요약 입력'],
      ['section', '기타'],
    ]);
    assert.equal(callsBeforeResize.onOpenCreateDialogCount, 1);
    assert.deepEqual(callsBeforeResize.unrelated, []);

    await page.setViewportSize({ width: 390, height: 1000 });
    await page.waitForFunction(() => window.innerWidth === 390);
    assert.equal(await search.inputValue(), 'MOCK 모바일 검색 입력');
    assert.equal(await team.inputValue(), 'LG');
    assert.equal(await summary.inputValue(), 'MOCK 비생산 모바일 요약 입력');
    assert.equal(await section.inputValue(), '기타');
    const root = page.locator('[data-testid="admin-offseason-content"]');
    assert.equal(await root.getAttribute('data-vqa-search-change-count'), '1');
    assert.equal(await root.getAttribute('data-vqa-team-filter-change-count'), '1');
    assert.equal(await root.getAttribute('data-vqa-update-field-count'), '2');

    const callsAfterResize = await readCallbackCalls();
    assert.deepEqual(callsAfterResize, callsBeforeResize);
  } finally {
    await browser?.close();
    await server.close();
  }
});

test('production and Visual QA fallbacks share actual named busy status components', () => {
  const Content = contentModule.default;
  const baseProps = resolveFallbackProps();
  const {
    visualQaControlledState: _visualQaControlledState,
    visualQaRenderers: _visualQaRenderers,
    visualQaStateOverride: _visualQaStateOverride,
    ...productionProps
  } = baseProps;
  const productionResultsMarkup = renderToStaticMarkup(createElement(Content, {
    ...productionProps,
    dialogOpen: false,
    deleteTarget: null,
  }));
  const productionDialogsMarkup = renderToStaticMarkup(createElement(Content, {
    ...productionProps,
    dialogOpen: true,
    deleteTarget: null,
  }));
  const visualQaResultsMarkup = renderToStaticMarkup(createElement(Content, {
    ...baseProps,
    dialogOpen: false,
    deleteTarget: null,
    visualQaStateOverride: { resultsPhase: 'fallback', dialogsPhase: 'fallback' },
  }));
  const visualQaDialogsMarkup = renderToStaticMarkup(createElement(Content, {
    ...baseProps,
    dialogOpen: true,
    deleteTarget: null,
    visualQaStateOverride: { resultsPhase: 'fallback', dialogsPhase: 'fallback' },
  }));

  for (const [markup, testId, message] of [
    [productionResultsMarkup, 'admin-offseason-results-fallback', '스토브리그 결과를 불러오는 중...'],
    [visualQaResultsMarkup, 'admin-offseason-results-fallback', '스토브리그 결과를 불러오는 중...'],
    [productionDialogsMarkup, 'admin-offseason-dialogs-fallback', '스토브리그 입력 창을 불러오는 중...'],
    [visualQaDialogsMarkup, 'admin-offseason-dialogs-fallback', '스토브리그 입력 창을 불러오는 중...'],
  ]) {
    assert.match(markup, /role="status"/);
    assert.match(markup, /aria-busy="true"/);
    assert.ok(markup.includes(`data-testid="${testId}"`));
    assert.ok(markup.includes(message));
  }
});

test('dialog fallback renders only for an open dialog or delete target', () => {
  const Content = contentModule.default;
  const baseProps = resolveFallbackProps();
  const render = (overrides: Partial<OffseasonMovementAdminPanelContentProps>) => (
    renderToStaticMarkup(createElement(Content, {
      ...baseProps,
      visualQaStateOverride: { resultsPhase: 'fallback', dialogsPhase: 'fallback' },
      ...overrides,
    }))
  );

  const closedMarkup = render({ dialogOpen: false, deleteTarget: null });
  const openMarkup = render({ dialogOpen: true, deleteTarget: null });
  const deleteMarkup = render({
    dialogOpen: false,
    deleteTarget: baseProps.movements[0] ?? null,
  });
  assert.doesNotMatch(closedMarkup, /admin-offseason-dialogs-fallback/);
  assert.match(openMarkup, /data-testid="admin-offseason-dialogs-fallback"/);
  assert.match(deleteMarkup, /data-testid="admin-offseason-dialogs-fallback"/);
});
