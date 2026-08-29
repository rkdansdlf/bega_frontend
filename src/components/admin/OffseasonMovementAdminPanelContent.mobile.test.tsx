import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import * as contentModule from './OffseasonMovementAdminPanelContent';
import type { OffseasonMovementAdminPanelContentProps } from './OffseasonMovementAdminPanelContent';
import { resolveComponentStateAdapter } from '../../visual-qa/stateAdapters';

const contentSource = readFileSync(new URL('./OffseasonMovementAdminPanelContent.tsx', import.meta.url), 'utf8');
const resultsSource = readFileSync(new URL('./OffseasonMovementAdminResultsRuntime.tsx', import.meta.url), 'utf8');

const componentId = 'src/components/admin/OffseasonMovementAdminPanelContent.tsx#OffseasonMovementAdminPanelContent';

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

test('Visual QA controlled callbacks forward search, team, summary, and section exactly once', () => {
  const createControlledCallback = (
    contentModule as unknown as Record<string, unknown>
  ).createOffseasonMovementVisualQaControlledCallback as undefined | (<Args extends unknown[]>(
    updateLocalState: (...args: Args) => void,
    forwardPublicCallback: (...args: Args) => void,
    recordEvidence: (...args: Args) => void,
  ) => (...args: Args) => void);
  assert.equal(typeof createControlledCallback, 'function');

  const assertOneForward = <Args extends unknown[]>(expected: Args) => {
    const localCalls: Args[] = [];
    const publicCalls: Args[] = [];
    const evidenceCalls: Args[] = [];
    const callback = createControlledCallback!(
      (...args: Args) => localCalls.push(args),
      (...args: Args) => publicCalls.push(args),
      (...args: Args) => evidenceCalls.push(args),
    );
    callback(...expected);
    assert.deepEqual(localCalls, [expected]);
    assert.deepEqual(publicCalls, [expected]);
    assert.deepEqual(evidenceCalls, [expected]);
  };

  assertOneForward(['MOCK 모바일 검색 입력']);
  assertOneForward(['LG']);
  assertOneForward(['summary', 'MOCK 비생산 모바일 요약 입력']);
  assertOneForward(['section', '기타']);
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
