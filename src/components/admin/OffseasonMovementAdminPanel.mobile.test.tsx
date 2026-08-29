import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const panelSource = readFileSync(new URL('./OffseasonMovementAdminPanel.tsx', import.meta.url), 'utf8');
const contentSource = readFileSync(new URL('./OffseasonMovementAdminPanelContent.tsx', import.meta.url), 'utf8');
const resultsSource = readFileSync(new URL('./OffseasonMovementAdminResultsRuntime.tsx', import.meta.url), 'utf8');
const dialogsSource = readFileSync(new URL('./OffseasonMovementAdminDialogs.tsx', import.meta.url), 'utf8');

test('routes mount, apply, reset, refresh, and post-mutation refreshes through one coordinator', () => {
  assert.match(panelSource, /createOffseasonMovementListCoordinator/);
  assert.match(panelSource, /listCoordinatorRef\.current!?\.request/);
  assert.match(panelSource, /useEffect\([\s\S]*loadMovements\([\s\S]*listCoordinatorRef\.current\?\.deactivate/);
  assert.match(panelSource, /onApplyFilters:\s*\(\) => void loadMovements\(\)/);
  assert.match(panelSource, /onResetFilters:\s*\(\) => void resetFilters\(\)/);
  assert.match(panelSource, /onRefresh:\s*\(\) => void loadMovements\(\)/);
  assert.match(panelSource, /mutationCoordinatorRef\.current\.run/);
});

test('keeps the Visual QA state seam non-production-only and API-free in fixture mode', () => {
  assert.match(panelSource, /import\.meta\.env\?\.PROD === true/);
  assert.match(panelSource, /requestedVisualQaStateOverride/);
  assert.match(panelSource, /if \(visualQaStateOverride\) \{\s*return Promise\.resolve\(\);\s*\}/);
  assert.match(panelSource, /active: true/);
});

test('owns a bounded mobile root and announced lifecycle surfaces', () => {
  assert.match(panelSource, /data-testid="admin-offseason-movement-panel"/);
  assert.match(panelSource, /min-w-0/);
  assert.match(panelSource, /max-w-full/);
  assert.match(contentSource, /role="status"/);
  assert.match(contentSource, /aria-live="polite"/);
  assert.match(contentSource, /role="alert"/);
  assert.match(contentSource, /title=\{successMessage\}[^>]*line-clamp-2/);
  assert.match(contentSource, /title=\{error\}[^>]*line-clamp-2/);
  assert.match(contentSource, /aria-label="스토브리그 이동 검색"/);
  assert.match(contentSource, /aria-label="스토브리그 이동 구분 필터"/);
  assert.match(contentSource, /aria-label="스토브리그 이동 팀 필터"/);
  assert.match(contentSource, /aria-label="조회 시작 날짜"/);
  assert.match(contentSource, /aria-label="조회 종료 날짜"/);
});

test('keeps the results table internally scrollable with named rows and actions', () => {
  assert.match(resultsSource, /data-testid="admin-offseason-results-scroll"/);
  assert.match(resultsSource, /overflow-x-auto/);
  assert.match(resultsSource, /aria-label="스토브리그 이동 관리 결과"/);
  assert.match(resultsSource, /min-w-\[1120px\]/);
  assert.match(resultsSource, /data-testid=\{`admin-offseason-row-\$\{movement\.id\}`\}/);
  assert.match(resultsSource, /aria-label=\{`\$\{movement\.playerName\} 이동 수정`\}/);
  assert.match(resultsSource, /aria-label=\{`\$\{movement\.playerName\} 이동 삭제`\}/);
  assert.match(resultsSource, /title=\{movement\.summary/);
  assert.match(resultsSource, /title=\{movement\.details/);
  assert.match(resultsSource, /title=\{movement\.sourceLabel/);
  assert.match(resultsSource, /title=\{movement\.playerName\} className="[^"]*truncate/);
  assert.match(resultsSource, /title=\{movement\.contractValue \|\| '-'\} className="[^"]*truncate/);
  assert.match(resultsSource, /title=\{movement\.sourceLabel \|\| '-'\} className="[^"]*truncate/);
  assert.match(resultsSource, /title=\{csvReport\.fileName\} className="[^"]*truncate/);
  assert.match(resultsSource, /key=\{message\} title=\{message\} className="[^"]*line-clamp-2/);
});

test('names every dialog field and disables delete confirmation while submitting', () => {
  for (const label of [
    '이동 날짜', '구분', '팀 코드', '선수명', '요약', '상세 메모',
    '계약 기간', '계약 규모', '옵션', '상대 구단', '반대급부',
    '출처명', '발표 시각', '출처 URL',
  ]) {
    assert.match(dialogsSource, new RegExp(`aria-label="${label}"`), label);
  }
  assert.match(dialogsSource, /data-testid="admin-offseason-delete-cancel"/);
  assert.match(dialogsSource, /data-testid="admin-offseason-delete-confirm"[\s\S]*disabled=\{submitting\}/);
});

test('exposes deterministic content, results, and dialog lazy phases', () => {
  assert.match(panelSource, /contentPhase/);
  assert.match(panelSource, /admin-offseason-content-fallback/);
  assert.match(contentSource, /resultsPhase/);
  assert.match(contentSource, /dialogsPhase/);
  assert.match(contentSource, /admin-offseason-results-fallback/);
  assert.match(contentSource, /admin-offseason-dialogs-fallback/);
});
