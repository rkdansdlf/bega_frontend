import { formatDateForAPI } from './home';
import { toLocalMiddayDate } from './homeSeasonLogic';

export const normalizeSameSeasonNavigationDate = (
  value: string | null | undefined,
  seasonYear: number,
): string | null => {
  if (!value) {
    return null;
  }

  const parsedDate = toLocalMiddayDate(value);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.getFullYear() !== seasonYear) {
    return null;
  }

  return formatDateForAPI(parsedDate);
};

export interface NavigationDateOptions {
  prev?: string | null;
  next?: string | null;
}

export const resolveNavigationTargetDate = (
  direction: 'prev' | 'next',
  navigation: NavigationDateOptions | null | undefined,
  seasonYear: number,
  isGamesDelayed: boolean = false,
): string | null => {
  if (isGamesDelayed) {
    return null;
  }
  const candidate = direction === 'prev' ? navigation?.prev : navigation?.next;
  return normalizeSameSeasonNavigationDate(candidate, seasonYear);
};

export const resolveJumpToDateTarget = (
  dateKey: string | null | undefined,
  isGamesDelayed: boolean = false,
): Date | null => {
  if (isGamesDelayed || !dateKey) {
    return null;
  }
  const targetDate = toLocalMiddayDate(dateKey);
  if (Number.isNaN(targetDate.getTime())) {
    return null;
  }
  return targetDate;
};

export const canPerformEmptyDateNavigation = (options: { isGamesDelayed?: boolean }): boolean => {
  return !options.isGamesDelayed;
};

export type HomeMatchPanelState = 'loading' | 'error' | 'delayed' | 'empty' | 'content';

export interface HomeMatchPanelDecisionInput {
  isLoading: boolean;
  isGamesError: boolean;
  isGamesDelayed?: boolean;
  activeStandardGamesCount: number;
}

export const resolveHomeMatchPanelState = ({
  isLoading,
  isGamesError,
  isGamesDelayed = false,
  activeStandardGamesCount,
}: HomeMatchPanelDecisionInput): HomeMatchPanelState => {
  if (isLoading) return 'loading';
  if (isGamesError) return 'error';
  if (isGamesDelayed) return 'delayed';
  if (activeStandardGamesCount === 0) return 'empty';
  return 'content';
};

export type HomeScheduledPanelState = 'loading' | 'error' | 'delayed' | 'empty' | 'content';

export interface HomeScheduledPanelDecisionInput {
  isScheduledLoading: boolean;
  isScheduledError: boolean;
  isGamesDelayed?: boolean;
  scheduledPrimaryGamesCount: number;
  scheduledSecondaryGamesCount: number;
}

export const resolveHomeScheduledPanelState = ({
  isScheduledLoading,
  isScheduledError,
  isGamesDelayed = false,
  scheduledPrimaryGamesCount,
  scheduledSecondaryGamesCount,
}: HomeScheduledPanelDecisionInput): HomeScheduledPanelState => {
  if (isScheduledLoading) return 'loading';
  if (isScheduledError) return 'error';
  if (isGamesDelayed) return 'delayed';
  if (scheduledPrimaryGamesCount === 0 && scheduledSecondaryGamesCount === 0) return 'empty';
  return 'content';
};
