import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const contentSource = readFileSync(new URL('./OffseasonMovementAdminPanelContent.tsx', import.meta.url), 'utf8');
const resultsSource = readFileSync(new URL('./OffseasonMovementAdminResultsRuntime.tsx', import.meta.url), 'utf8');

test('standalone content owns a bounded named mobile root and visible production lazy fallbacks', () => {
  assert.match(contentSource, /data-testid="admin-offseason-content"/);
  assert.match(contentSource, /className="[^"]*min-w-0[^"]*max-w-full/);
  assert.equal((contentSource.match(/data-testid="admin-offseason-results-fallback"/g) ?? []).length, 2);
  assert.equal((contentSource.match(/data-testid="admin-offseason-dialogs-fallback"/g) ?? []).length, 2);
  assert.match(contentSource, /admin-offseason-results-fallback"[\s\S]*role="status"[\s\S]*aria-busy="true"/);
  assert.match(contentSource, /admin-offseason-dialogs-fallback"[\s\S]*role="status"[\s\S]*aria-busy="true"/);
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
