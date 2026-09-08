import assert from 'node:assert/strict';
import * as moduleApi from 'node:module';
import test from 'node:test';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StaticRouter } from 'react-router-dom';

import type { Ranking } from '../types/home';
import type { OffseasonMovement } from './offseason/offseasonListTypes';

type ModuleNextLoad = (url: string, context: unknown) => unknown;
type ModuleLoadHook = (url: string, context: unknown, nextLoad: ModuleNextLoad) => unknown;

const { registerHooks } = moduleApi as unknown as {
  registerHooks: (hooks: { load: ModuleLoadHook }) => void;
};

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.png') || url.endsWith('.webp') || url.endsWith('.svg')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export default "/visual-qa-offseason-asset.png";',
      };
    }

    return nextLoad(url, context);
  },
});

const [
  { default: OffSeasonHome },
  { default: OffSeasonHomePage },
  { default: OffSeasonHomePrimaryRuntime },
  { default: OffSeasonHomeNewsRuntime },
  { default: OffSeasonHomeHighlightsRuntime },
  { default: OffSeasonList },
  { default: OffSeasonListPage },
  { OffseasonListContentRuntime },
  { OffseasonMobileCards },
  { OffseasonInsightsPanel },
  { OffseasonPill, OffseasonSectionPill },
] = await Promise.all([
  import('./OffSeasonHome'),
  import('./OffSeasonHomePage'),
  import('./OffSeasonHomePrimaryRuntime'),
  import('./OffSeasonHomeNewsRuntime'),
  import('./OffSeasonHomeHighlightsRuntime'),
  import('./OffSeasonList'),
  import('./OffSeasonListPage'),
  import('./offseason/OffseasonListContentRuntime'),
  import('./offseason/OffseasonMobileCards'),
  import('./offseason/OffseasonInsightsPanel'),
  import('./offseason/offseasonUi'),
]);

const visualQaMovement = (overrides: Partial<OffseasonMovement> = {}): OffseasonMovement => ({
  id: 901,
  date: '2026-01-15',
  section: 'VISUAL_QA_SECTION',
  team: 'VISUAL_QA_TEAM',
  player: 'VISUAL QA 테스트 선수',
  summary: '모바일 레이아웃 검증용 비생산 mock 요약입니다.',
  remarks: '모바일 레이아웃 검증용 비생산 mock 메모입니다.',
  contractTerm: 'VISUAL QA 계약 기간',
  contractValue: 'VISUAL QA 계약 규모',
  optionDetails: 'VISUAL QA 옵션',
  counterpartyTeam: 'VISUAL_QA_COUNTERPARTY',
  counterpartyDetails: 'VISUAL QA 반대급부',
  sourceLabel: 'VISUAL QA 내부 mock',
  sourceUrl: '',
  announcedAt: '2026-01-15T09:00:00Z',
  isBigEvent: true,
  estimatedAmount: 0,
  displayAmount: '비생산 mock 금액',
  ...overrides,
});

const visualQaRanking: Ranking = {
  rank: 1,
  teamId: 'VISUAL_QA_TEAM',
  teamName: 'VISUAL QA 테스트 구단',
  wins: 1,
  losses: 0,
  draws: 0,
  winRate: '1.000',
  games: 1,
};

const renderAt = (
  component: ComponentType<Record<string, unknown>>,
  props: Record<string, unknown>,
  location = '/offseason',
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const html = renderToStaticMarkup(createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(
      StaticRouter,
      { location },
      createElement(component, props),
    ),
  ));
  queryClient.clear();
  return html;
};

test('offseason page wrappers expose deterministic mobile fallback states', () => {
  const homeHtml = renderAt(
    OffSeasonHomePage as ComponentType<Record<string, unknown>>,
    { visualQaStateOverride: { phase: 'fallback' } },
  );
  const listHtml = renderAt(
    OffSeasonListPage as ComponentType<Record<string, unknown>>,
    { visualQaStateOverride: { phase: 'fallback' } },
    '/offseason/list',
  );

  assert.match(homeHtml, /data-testid="offseason-home-page-fallback"/);
  assert.match(listHtml, /data-testid="offseason-list-page-fallback"/);
});

test('offseason home owns deterministic query states and never renders a negative D-day', () => {
  const loadingHtml = renderAt(
    OffSeasonHome as ComponentType<Record<string, unknown>>,
    { visualQaStateOverride: { phase: 'loading', isLargeScreen: false } },
  );
  assert.match(loadingHtml, /data-testid="offseason-home-runtime"/);

  const startedHtml = renderAt(
    OffSeasonHomePrimaryRuntime as ComponentType<Record<string, unknown>>,
    {
      isLoading: false,
      daysUntilOpening: -152,
      statusDateLabel: '2026. 8. 27.',
      movementsCount: 1,
      bigEvents: [visualQaMovement()],
      awards: [],
      rankings: [visualQaRanking],
      isLargeScreen: false,
      getTeamName: (team: string) => team,
      formatRemarks: (remarks: string) => remarks,
      onNavigateHome: () => {},
      onNavigateList: () => {},
    },
  );
  assert.match(startedHtml, /시즌 진행 중/);
  assert.doesNotMatch(startedHtml, /D--152/);
});

test('offseason home keeps navigation, badges, awards, and long copy inside 320px', () => {
  const primaryHtml = renderAt(
    OffSeasonHomePrimaryRuntime as ComponentType<Record<string, unknown>>,
    {
      isLoading: false,
      daysUntilOpening: 30,
      statusDateLabel: `VISUAL-QA-${'UNBROKEN'.repeat(12)}`,
      movementsCount: 1,
      bigEvents: [visualQaMovement()],
      awards: [],
      rankings: [visualQaRanking],
      isLargeScreen: false,
      getTeamName: (team: string) => team,
      formatRemarks: (remarks: string) => remarks,
      onNavigateHome: () => {},
      onNavigateList: () => {},
    },
  );
  assert.match(primaryHtml, /data-testid="offseason-home-primary-runtime"/);
  assert.match(primaryHtml, /data-testid="offseason-home-back"/);
  assert.match(primaryHtml, /min-h-11/);
  assert.match(primaryHtml, /\[overflow-wrap:anywhere\]/);

  const newsHtml = renderAt(
    OffSeasonHomeNewsRuntime as ComponentType<Record<string, unknown>>,
    {
      isLoading: false,
      movementsCount: 9999,
      bigEvents: [visualQaMovement({
        player: `VISUAL-QA-${'UNBROKEN'.repeat(16)}`,
        remarks: `VISUAL-QA-${'UNBROKEN'.repeat(24)}`,
      })],
      getTeamName: (team: string) => team,
      formatRemarks: (remarks: string) => remarks,
      onNavigateList: () => {},
    },
  );
  assert.match(newsHtml, /data-testid="offseason-home-news-runtime"/);
  assert.match(newsHtml, /data-testid="offseason-home-list-link"/);
  assert.match(newsHtml, /min-h-11/);
  assert.match(newsHtml, /\[overflow-wrap:anywhere\]/);

  const highlightsHtml = renderAt(
    OffSeasonHomeHighlightsRuntime as unknown as ComponentType<Record<string, unknown>>,
    {
      awards: [{
        award: `VISUAL-QA-${'UNBROKEN'.repeat(12)}`,
        playerName: `VISUAL-QA-${'UNBROKEN'.repeat(16)}`,
        team: 'VISUAL_QA_TEAM',
        stats: `VISUAL-QA-${'UNBROKEN'.repeat(24)}`,
      }],
      rankings: [{ ...visualQaRanking, teamName: `VISUAL-QA-${'UNBROKEN'.repeat(16)}` }],
      isLargeScreen: false,
    },
  );
  assert.match(highlightsHtml, /data-testid="offseason-home-highlights-runtime"/);
  assert.ok((highlightsHtml.match(/\[overflow-wrap:anywhere\]/g) ?? []).length >= 3);
});

test('offseason list exposes deterministic states and mobile-safe 44px controls', () => {
  const html = renderAt(
    OffSeasonList as ComponentType<Record<string, unknown>>,
    {
      visualQaStateOverride: {
        phase: 'resolved',
        movements: [visualQaMovement()],
        isFetching: false,
        isMobile: true,
      },
    },
    '/offseason/list',
  );

  assert.match(html, /data-testid="offseason-list-runtime"/);
  assert.match(html, /data-testid="offseason-list-back"/);
  assert.match(html, /data-testid="offseason-list-search"/);
  assert.match(html, /data-testid="offseason-list-team-filter"/);
  assert.match(html, /data-testid="offseason-sort-latest"/);
  assert.match(html, /data-testid="offseason-section-ALL"/);
  assert.match(html, /data-testid="offseason-big-only"/);
  assert.match(html, /<input(?=[^>]*data-testid="offseason-list-search")(?=[^>]*class="[^"]*h-12)[^>]*>/);
  assert.match(html, /<select(?=[^>]*data-testid="offseason-list-team-filter")(?=[^>]*class="[^"]*h-12)[^>]*>/);
  assert.ok((html.match(/min-h-11/g) ?? []).length >= 11);
  assert.ok((html.match(/aria-pressed="(true|false)"/g) ?? []).length >= 10);
});

test('offseason list content and leaf cards expose mobile-safe pressure and keyboard behavior', () => {
  const contentHtml = renderAt(
    OffseasonListContentRuntime as unknown as ComponentType<Record<string, unknown>>,
    {
      filteredList: [],
      isLoading: true,
      isError: false,
      error: undefined,
      onRetry: () => {},
      isMobile: true,
      hasSearchTerm: false,
      hasActiveFilters: false,
      onReset: () => {},
      bigOnly: true,
      sortOrder: 'latest',
      onSortChange: () => {},
    },
    '/offseason/list',
  );
  assert.match(contentHtml, /data-testid="offseason-list-content-runtime"/);
  assert.match(contentHtml, /flex flex-col items-start gap-3[^"<]*sm:flex-row/);

  const pressureMovement = visualQaMovement({
    player: `VISUAL-QA-${'UNBROKEN'.repeat(16)}`,
    team: `VISUAL-QA-${'UNBROKEN'.repeat(12)}`,
    summary: `VISUAL-QA-${'UNBROKEN'.repeat(24)}`,
  });
  const cardsHtml = renderAt(
    OffseasonMobileCards as ComponentType<Record<string, unknown>>,
    { movements: [pressureMovement], onSelect: () => {} },
    '/offseason/list',
  );
  assert.match(cardsHtml, /data-testid="offseason-mobile-cards"/);
  assert.match(cardsHtml, /data-testid="offseason-mobile-card-901"/);
  assert.match(cardsHtml, /role="button"/);
  assert.match(cardsHtml, /aria-label="VISUAL-QA-/);
  assert.match(cardsHtml, /focus-visible:ring-2/);
  assert.match(cardsHtml, /\[overflow-wrap:anywhere\]/);

  const insightsHtml = renderAt(
    OffseasonInsightsPanel as ComponentType<Record<string, unknown>>,
    { movements: [pressureMovement], onSelect: () => {} },
    '/offseason/list',
  );
  assert.match(insightsHtml, /data-testid="offseason-insights-panel"/);
  assert.match(insightsHtml, /data-testid="offseason-insight-headline-901"/);
  assert.match(insightsHtml, /min-h-11/);
  assert.match(insightsHtml, /\[overflow-wrap:anywhere\]/);
});

test('offseason pills wrap long labels instead of covering adjacent mobile content', () => {
  const pillHtml = renderToStaticMarkup(createElement(
    OffseasonPill,
    null,
    `VISUAL-QA-${'UNBROKEN'.repeat(20)}`,
  ));
  const sectionHtml = renderToStaticMarkup(createElement(
    OffseasonSectionPill,
    { section: `VISUAL-QA-${'UNBROKEN'.repeat(20)}` },
  ));

  for (const html of [pillHtml, sectionHtml]) {
    assert.match(html, /max-w-full/);
    assert.match(html, /whitespace-normal/);
    assert.match(html, /break-words/);
    assert.match(html, /\[overflow-wrap:anywhere\]/);
  }
});
