import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import HomeScheduledMatchPanel from './HomeScheduledMatchPanel';
import HomeMatchPanel from './HomeMatchPanel';
import type { Game } from '../../types/home';

const sampleGame: Game = {
  gameId: 'test-game-1',
  gameDate: '2026-09-10',
  sourceDate: '2026-09-10',
  time: '18:30',
  stadium: '잠실',
  gameStatus: 'SCHEDULED',
  gameStatusKr: '경기 예정',
  gameInfo: '시각·구장·상태를 확인하세요.',
  leagueType: 'REGULAR',
  homeTeam: 'LG',
  homeTeamFull: 'LG 트윈스',
  awayTeam: 'OB',
  awayTeamFull: '두산 베어스',
};

const defaultScheduledProps = {
  isScheduledLoading: false,
  isScheduledError: false,
  isGamesDelayed: false,
  loadFailureReason: null,
  suppressRecoveryActions: false,
  isSecondarySectionExpanded: false,
  loadingMatchCardCount: 2,
  matchSectionMinHeightStyle: { minHeight: '360px' },
  scheduledPrimaryGames: [] as Game[],
  scheduledSecondaryGames: [] as Game[],
  liveOrFinishedScheduledGames: [] as Game[],
  scheduledPrimaryGamesBySourceDate: [] as Array<[string, Game[]]>,
  scheduledSecondaryGamesBySourceDate: [] as Array<[string, Game[]]>,
  shouldMountTeamLogos: false,
  onRetry: () => {},
  onSelectPrediction: () => {},
  onToggleSecondarySection: () => {},
};

test('HomeScheduledMatchPanel: renders delayed StateBlock while isGamesDelayed is true', () => {
  const markup = renderToStaticMarkup(
    createElement(HomeScheduledMatchPanel, {
      ...defaultScheduledProps,
      isGamesDelayed: true,
    }),
  );

  // Must render delayed StateBlock and retry button
  assert.match(markup, /data-testid="home-scheduled-delayed"/);
  assert.match(markup, /data-testid="home-scheduled-delayed-retry"/);
  assert.match(markup, /경기 정보가 늦게 도착하고 있어요/);
  assert.match(markup, /다시 불러오기/);

  // Must NOT render empty state
  assert.doesNotMatch(markup, /data-testid="home-scheduled-empty"/);
  assert.doesNotMatch(markup, /앞으로 7일 동안 예정된 경기가 없어요/);
});

test('HomeScheduledMatchPanel: delayed -> success transition renders scheduled games and clears delayed state', () => {
  // Step 1: Delayed
  const delayedMarkup = renderToStaticMarkup(
    createElement(HomeScheduledMatchPanel, {
      ...defaultScheduledProps,
      isGamesDelayed: true,
    }),
  );
  assert.match(delayedMarkup, /data-testid="home-scheduled-delayed"/);

  // Step 2: Real response arrives (success with scheduled games)
  const successMarkup = renderToStaticMarkup(
    createElement(HomeScheduledMatchPanel, {
      ...defaultScheduledProps,
      isGamesDelayed: false,
      scheduledPrimaryGames: [sampleGame],
      scheduledPrimaryGamesBySourceDate: [['2026-09-10', [sampleGame]]],
    }),
  );

  // Scheduled games rendered
  assert.match(successMarkup, /LG 트윈스/);
  assert.match(successMarkup, /두산 베어스/);
  assert.doesNotMatch(successMarkup, /data-testid="home-scheduled-delayed"/);
  assert.doesNotMatch(successMarkup, /data-testid="home-scheduled-empty"/);
  assert.doesNotMatch(successMarkup, /data-testid="home-scheduled-error"/);
});

test('HomeScheduledMatchPanel: delayed -> failure transition renders error StateBlock with retry', () => {
  // Step 1: Delayed
  const delayedMarkup = renderToStaticMarkup(
    createElement(HomeScheduledMatchPanel, {
      ...defaultScheduledProps,
      isGamesDelayed: true,
    }),
  );
  assert.match(delayedMarkup, /data-testid="home-scheduled-delayed"/);

  // Step 2: Request fails
  const failureMarkup = renderToStaticMarkup(
    createElement(HomeScheduledMatchPanel, {
      ...defaultScheduledProps,
      isGamesDelayed: false,
      isScheduledError: true,
    }),
  );

  assert.match(failureMarkup, /data-testid="home-scheduled-error"/);
  assert.match(failureMarkup, /data-testid="home-scheduled-error-retry"/);
  assert.match(failureMarkup, /예정 경기를 불러오지 못했어요/);
  assert.doesNotMatch(failureMarkup, /data-testid="home-scheduled-delayed"/);
  assert.doesNotMatch(failureMarkup, /data-testid="home-scheduled-empty"/);
});

test('HomeScheduledMatchPanel: suppressRecoveryActions hides retry button on delayed and error states', () => {
  const delayedSuppressedMarkup = renderToStaticMarkup(
    createElement(HomeScheduledMatchPanel, {
      ...defaultScheduledProps,
      isGamesDelayed: true,
      suppressRecoveryActions: true,
    }),
  );
  assert.match(delayedSuppressedMarkup, /data-testid="home-scheduled-delayed"/);
  assert.doesNotMatch(delayedSuppressedMarkup, /data-testid="home-scheduled-delayed-retry"/);

  const errorSuppressedMarkup = renderToStaticMarkup(
    createElement(HomeScheduledMatchPanel, {
      ...defaultScheduledProps,
      isScheduledError: true,
      suppressRecoveryActions: true,
    }),
  );
  assert.match(errorSuppressedMarkup, /data-testid="home-scheduled-error"/);
  assert.doesNotMatch(errorSuppressedMarkup, /data-testid="home-scheduled-error-retry"/);
});

const defaultMatchProps = {
  activeLeagueTab: 'regular' as const,
  isLoading: false,
  isGamesError: false,
  isGamesDelayed: false,
  emptyDateNavigation: {
    nextGameDate: '2026-09-11',
    prevGameDate: '2026-09-08',
    isOffSeason: false,
    onJumpToDate: () => {},
    onOpenScheduled: () => {},
    onOpenOffseason: () => {},
  },
  loadFailureReason: null,
  isScheduledLoading: false,
  isScheduledError: false,
  suppressRecoveryActions: false,
  isSecondarySectionExpanded: false,
  loadingMatchCardCount: 2,
  matchSectionMinHeightStyle: { minHeight: '360px' },
  activeStandardGames: [] as Game[],
  scheduledPrimaryGames: [] as Game[],
  scheduledSecondaryGames: [] as Game[],
  liveOrFinishedScheduledGames: [] as Game[],
  scheduledPrimaryGamesBySourceDate: [] as Array<[string, Game[]]>,
  scheduledSecondaryGamesBySourceDate: [] as Array<[string, Game[]]>,
  shouldMountTeamLogos: false,
  LoadingCardComponent: () => null,
  onRetry: () => {},
  onSelectPrediction: () => {},
  onToggleSecondarySection: () => {},
};

test('HomeMatchPanel: renders delayed state without triggering empty state actions', () => {
  const markup = renderToStaticMarkup(
    createElement(HomeMatchPanel, {
      ...defaultMatchProps,
      isGamesDelayed: true,
    }),
  );

  // Delayed state header indicator
  assert.match(markup, /불러오는 중/);
  // Empty state buttons must NOT be rendered while delayed
  assert.doesNotMatch(markup, /data-testid="home-empty-scheduled"/);
  assert.doesNotMatch(markup, /data-testid="home-empty-prev-game"/);
});

test('HomeMatchPanel: delayed -> success transition renders games list', () => {
  // Step 1: Delayed
  const delayedMarkup = renderToStaticMarkup(
    createElement(HomeMatchPanel, {
      ...defaultMatchProps,
      isGamesDelayed: true,
    }),
  );
  assert.match(delayedMarkup, /불러오는 중/);

  // Step 2: Success response arrives
  const successMarkup = renderToStaticMarkup(
    createElement(HomeMatchPanel, {
      ...defaultMatchProps,
      isGamesDelayed: false,
      activeStandardGames: [sampleGame],
    }),
  );

  assert.match(successMarkup, /LG 트윈스/);
  assert.match(successMarkup, /1경기/);
  assert.doesNotMatch(successMarkup, /불러오는 중/);
});

test('HomeMatchPanel: delayed -> failure transition renders error state', () => {
  const failureMarkup = renderToStaticMarkup(
    createElement(HomeMatchPanel, {
      ...defaultMatchProps,
      isGamesDelayed: false,
      isGamesError: true,
    }),
  );

  assert.match(failureMarkup, /확인 필요/);
  assert.doesNotMatch(failureMarkup, /불러오는 중/);
  assert.doesNotMatch(failureMarkup, /data-testid="home-empty-scheduled"/);
});
