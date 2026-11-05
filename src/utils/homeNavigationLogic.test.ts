import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canPerformEmptyDateNavigation,
  normalizeSameSeasonNavigationDate,
  resolveHomeMatchPanelState,
  resolveHomeScheduledPanelState,
  resolveJumpToDateTarget,
  resolveNavigationTargetDate,
} from './homeNavigationLogic';
import { shouldAutoSwitchToScheduled } from './homeScheduleClassification';

test('resolveHomeMatchPanelState: handles delayed->success and delayed->failure transitions', () => {
  // Phase 1: Soft-fallback delayed state
  const delayedState = resolveHomeMatchPanelState({
    isLoading: false,
    isGamesError: false,
    isGamesDelayed: true,
    activeStandardGamesCount: 0,
  });
  assert.equal(delayedState, 'delayed');

  // Phase 2A: Delayed -> Success transition (games returned)
  const successState = resolveHomeMatchPanelState({
    isLoading: false,
    isGamesError: false,
    isGamesDelayed: false,
    activeStandardGamesCount: 3,
  });
  assert.equal(successState, 'content');

  // Phase 2B: Delayed -> Success transition (no games on date)
  const emptySuccessState = resolveHomeMatchPanelState({
    isLoading: false,
    isGamesError: false,
    isGamesDelayed: false,
    activeStandardGamesCount: 0,
  });
  assert.equal(emptySuccessState, 'empty');

  // Phase 2C: Delayed -> Failure transition (request failed)
  const failureState = resolveHomeMatchPanelState({
    isLoading: false,
    isGamesError: true,
    isGamesDelayed: false,
    activeStandardGamesCount: 0,
  });
  assert.equal(failureState, 'error');

  // Initial loading state
  const loadingState = resolveHomeMatchPanelState({
    isLoading: true,
    isGamesError: false,
    isGamesDelayed: false,
    activeStandardGamesCount: 0,
  });
  assert.equal(loadingState, 'loading');
});

test('resolveHomeScheduledPanelState: handles delayed->success and delayed->failure transitions', () => {
  // Phase 1: Soft-fallback delayed state
  const delayedState = resolveHomeScheduledPanelState({
    isScheduledLoading: false,
    isScheduledError: false,
    isGamesDelayed: true,
    scheduledPrimaryGamesCount: 0,
    scheduledSecondaryGamesCount: 0,
  });
  assert.equal(delayedState, 'delayed');

  // Phase 2A: Delayed -> Success transition (scheduled games returned)
  const successState = resolveHomeScheduledPanelState({
    isScheduledLoading: false,
    isScheduledError: false,
    isGamesDelayed: false,
    scheduledPrimaryGamesCount: 2,
    scheduledSecondaryGamesCount: 1,
  });
  assert.equal(successState, 'content');

  // Phase 2B: Delayed -> Success transition (0 scheduled games in 7 days window)
  const emptySuccessState = resolveHomeScheduledPanelState({
    isScheduledLoading: false,
    isScheduledError: false,
    isGamesDelayed: false,
    scheduledPrimaryGamesCount: 0,
    scheduledSecondaryGamesCount: 0,
  });
  assert.equal(emptySuccessState, 'empty');

  // Phase 2C: Delayed -> Failure transition (bootstrap fetch error)
  const failureState = resolveHomeScheduledPanelState({
    isScheduledLoading: false,
    isScheduledError: true,
    isGamesDelayed: false,
    scheduledPrimaryGamesCount: 0,
    scheduledSecondaryGamesCount: 0,
  });
  assert.equal(failureState, 'error');

  // Initial loading state
  const loadingState = resolveHomeScheduledPanelState({
    isScheduledLoading: true,
    isScheduledError: false,
    isGamesDelayed: false,
    scheduledPrimaryGamesCount: 0,
    scheduledSecondaryGamesCount: 0,
  });
  assert.equal(loadingState, 'loading');
});

test('shouldAutoSwitchToScheduled does NOT switch while isGamesDelayed is true', () => {
  const switchAllowedWhenDelayed = shouldAutoSwitchToScheduled({
    activeLeagueTab: 'regular',
    hasUserChangedTab: false,
    isLoading: false,
    isScheduledLoading: false,
    isGamesDelayed: true,
    regularCount: 0,
    postseasonCount: 0,
    koreanSeriesCount: 0,
    scheduledPrimaryCount: 2,
  });
  assert.equal(switchAllowedWhenDelayed, false, 'Automatic tab switch must not fire while delayed');

  const switchAllowedWhenReady = shouldAutoSwitchToScheduled({
    activeLeagueTab: 'regular',
    hasUserChangedTab: false,
    isLoading: false,
    isScheduledLoading: false,
    isGamesDelayed: false,
    regularCount: 0,
    postseasonCount: 0,
    koreanSeriesCount: 0,
    scheduledPrimaryCount: 2,
  });
  assert.equal(switchAllowedWhenReady, true, 'Automatic tab switch should fire once response confirms empty regular games');
});

test('canPerformEmptyDateNavigation prevents emptyDateNavigation actions while delayed', () => {
  assert.equal(canPerformEmptyDateNavigation({ isGamesDelayed: true }), false);
  assert.equal(canPerformEmptyDateNavigation({ isGamesDelayed: false }), true);
});

test('resolveNavigationTargetDate handles prev/next movement within season and blocks when delayed', () => {
  const nav = { prev: '2026-05-01', next: '2026-05-03' };

  // Previous movement within same season
  assert.equal(resolveNavigationTargetDate('prev', nav, 2026, false), '2026-05-01');

  // Next movement within same season
  assert.equal(resolveNavigationTargetDate('next', nav, 2026, false), '2026-05-03');

  // Movement blocked while delayed
  assert.equal(resolveNavigationTargetDate('prev', nav, 2026, true), null);
  assert.equal(resolveNavigationTargetDate('next', nav, 2026, true), null);

  // Cross-season date rejected
  const crossSeasonNav = { prev: '2025-10-30', next: '2027-04-01' };
  assert.equal(resolveNavigationTargetDate('prev', crossSeasonNav, 2026, false), null);
  assert.equal(resolveNavigationTargetDate('next', crossSeasonNav, 2026, false), null);

  // Missing navigation
  assert.equal(resolveNavigationTargetDate('prev', null, 2026, false), null);
  assert.equal(resolveNavigationTargetDate('next', { prev: null, next: null }, 2026, false), null);
});

test('resolveJumpToDateTarget resolves valid date target and blocks when delayed', () => {
  const targetDate = resolveJumpToDateTarget('2026-06-15', false);
  assert.ok(targetDate instanceof Date);
  assert.equal(targetDate.getFullYear(), 2026);
  assert.equal(targetDate.getMonth(), 5); // June is index 5
  assert.equal(targetDate.getDate(), 15);

  // Blocked while delayed
  assert.equal(resolveJumpToDateTarget('2026-06-15', true), null);

  // Invalid or empty dateKey
  assert.equal(resolveJumpToDateTarget(null, false), null);
  assert.equal(resolveJumpToDateTarget('not-a-date', false), null);
});

test('normalizeSameSeasonNavigationDate filters dates by seasonYear', () => {
  assert.equal(normalizeSameSeasonNavigationDate('2026-08-20', 2026), '2026-08-20');
  assert.equal(normalizeSameSeasonNavigationDate('2025-08-20', 2026), null);
  assert.equal(normalizeSameSeasonNavigationDate(null, 2026), null);
});
