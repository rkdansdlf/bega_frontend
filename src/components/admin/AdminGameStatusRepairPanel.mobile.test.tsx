import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ConfirmDialogProvider } from '../contexts/ConfirmDialogContext';
import {
  AdminGameStatusRepairPanel,
  type AdminGameStatusRepairVisualQaState,
} from './AdminGameStatusRepairPanel';

const mockMismatch = {
  gameId: 'MOCK-GAME-1',
  gameDate: '2026-08-29',
  startTime: '18:30:00',
  rawStatus: 'MOCK_RAW',
  normalizedRawStatus: 'MOCK_RAW',
  effectiveStatus: 'MOCK_EFFECTIVE',
  homeScore: 7,
  awayScore: 4,
  inningScoreCount: 9,
  hasKnownScore: true,
  hasInningScores: true,
  reasons: ['비생산 Visual QA 상태 불일치'],
};

const mockNonCanonical = {
  gameId: 'MOCK-NON-CANONICAL-1',
  gameDate: '2026-08-29',
  startTime: '18:30:00',
  rawStatus: 'MOCK_RAW',
  homeTeam: 'MOCK_HOME',
  awayTeam: 'MOCK_AWAY',
  homeScore: null,
  awayScore: null,
  reasons: ['비생산 Visual QA 비정상 팀 코드'],
};

const denseState: AdminGameStatusRepairVisualQaState = {
  today: '2026-08-29',
  startDate: '2026-08-29',
  endDate: '2026-08-30',
  loadingMismatches: false,
  loadingRepair: false,
  loadingSuggestions: false,
  loadingCleanupTrackers: false,
  savingCleanupTracker: false,
  panelError: null,
  suggestionsError: null,
  lastActionMessage: '비생산 Visual QA 진단 완료',
  mismatchResult: {
    startDate: '2026-08-29',
    endDate: '2026-08-30',
    totalGames: 2,
    mismatchCount: 1,
    mismatches: [mockMismatch],
    nonCanonicalCount: 1,
    nonCanonicalGames: [mockNonCanonical],
  },
  repairResult: {
    startDate: '2026-08-29',
    endDate: '2026-08-30',
    dryRun: false,
    totalGames: 2,
    mismatchCount: 1,
    repairedCount: 1,
    mismatches: [mockMismatch],
    repairedGames: [{
      gameId: 'MOCK-GAME-1',
      homeScore: 7,
      awayScore: 4,
      gameStatus: 'MOCK_EFFECTIVE',
      inningScoreCount: 9,
      synced: true,
      usedInningScores: true,
      winningTeam: 'MOCK_HOME',
      winningScore: 7,
    }],
    nonCanonicalCount: 1,
    nonCanonicalGames: [mockNonCanonical],
  },
  recentRecommendations: [{
    gameDate: '2026-08-29',
    mismatchCount: 1,
    nonCanonicalCount: 1,
    issueCount: 2,
    effectiveStatuses: ['MOCK_EFFECTIVE'],
  }],
  cleanupTrackers: [{
    startDate: '2026-08-29',
    endDate: '2026-08-30',
    ticketUrl: 'https://example.invalid/visual-qa-ticket',
    assignee: 'visual-qa-operator',
    status: 'in_progress',
    note: [
      '비생산 Visual QA tracker',
      '- summary_json: reports/visual-qa/mock/summary.json',
      '- handoff_md: reports/visual-qa/mock/handoff.md',
      '[closure-sync 2026-08-29T00:00:00Z] compare=FAIL tracker=in_progress resolved=0 remaining=1 new=0',
    ].join('\n'),
    updatedAt: '2026-08-29T00:00:00Z',
    gameIds: ['MOCK-NON-CANONICAL-1'],
  }],
  nonCanonicalCopyState: 'idle',
  cleanupTicketUrl: 'https://example.invalid/visual-qa-ticket',
  cleanupAssignee: 'visual-qa-operator',
  cleanupStatus: 'in_progress',
  cleanupNote: '비생산 Visual QA tracker',
  cleanupSavedAt: '2026-08-29T00:00:00Z',
  cleanupTrackerMessage: '비생산 Visual QA tracker 저장 완료',
};

test('admin game-status repair panel renders every dense owned surface without live requests', () => {
  const html = renderToStaticMarkup(createElement(
    ConfirmDialogProvider,
    null,
    createElement(AdminGameStatusRepairPanel, {
      active: true,
      visualQaStateOverride: denseState,
    }),
  ));

  assert.match(html, /data-testid="admin-game-status-panel"/);
  assert.match(html, /admin-game-status-mismatch-MOCK-GAME-1/);
  assert.match(html, /admin-game-status-non-canonical-MOCK-NON-CANONICAL-1/);
  assert.match(html, /admin-game-status-repaired-MOCK-GAME-1/);
  assert.match(html, /admin-game-status-suggestion-2026-08-29/);
  assert.match(html, /admin-game-status-history-2026-08-29-2026-08-30/);
  assert.match(html, /admin-game-status-current-artifact-summary-path/);
});

test('admin game-status repair panel contains tables, histories, and pressure copy on mobile', async () => {
  const source = await readFile(new URL('./AdminGameStatusRepairPanel.tsx', import.meta.url), 'utf8');

  assert.match(source, /import\.meta\.env\?\.PROD/);
  assert.match(source, /if \(visualQaState\) \{/);
  assert.match(source, /data-testid="admin-game-status-panel" className="min-w-0 space-y-6 overflow-hidden \[overflow-wrap:anywhere\]"/);
  assert.ok((source.match(/p-4 shadow-2xl sm:p-6/g)?.length ?? 0) >= 4);
  assert.equal(source.match(/max-h-\[60dvh\] overflow-auto overscroll-contain/g)?.length, 4);
  assert.equal(source.match(/<Table className="min-w-\[860px\]">/g)?.length, 3);
  assert.match(source, /overflow-x-auto overscroll-x-contain/);
  assert.equal(source.match(/style=\{\{ minWidth: 280 \}\}/g)?.length, 2);
  assert.equal(source.match(/style=\{\{ minWidth: 240 \}\}/g)?.length, 1);
  assert.equal(source.match(/max-w-full overflow-x-auto whitespace-nowrap/g)?.length, 2);
  assert.equal(source.match(/<AdminBadge className="shrink-0 border-/g)?.length, 3);
});
