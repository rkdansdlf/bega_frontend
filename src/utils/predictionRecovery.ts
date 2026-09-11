export const PREDICTION_NETWORK_RETRY_DELAYS_MS = [1000, 2000, 4000] as const;
export const PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS = PREDICTION_NETWORK_RETRY_DELAYS_MS.length;
export const PREDICTION_RUN_SESSION_TTL_MS = 120_000;
export const PREDICTION_RUN_SESSION_MIN_RESTORE_AGE_MS = 1_500;
export const PREDICTION_RUN_SESSION_STORAGE_KEY = 'prediction:run-session:v1';
export const LEGACY_PREDICTION_RUN_SESSION_STORAGE_KEY = 'prediction:run-session';
export const PREDICTION_RUN_SESSION_EVENT = 'prediction:run-session-updated';

export type PredictionRetryActionKey = 'submitVote' | 'cancelVote' | 'voteStatus';
export type PredictionRunAction = 'vote' | 'cancel';
export type PredictionRunTimeoutStage = 'none' | 'warning' | 'fatal';
export type PredictionRetryAttemptState = Record<PredictionRetryActionKey, number>;

export interface PredictionRunSessionV1 {
  flowId: string;
  gameId: string;
  action: PredictionRunAction;
  startedAt: number;
  team?: 'home' | 'away';
  bannerDismissed: boolean;
  timeoutStage: PredictionRunTimeoutStage;
}

export const readPredictionRunSession = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    window.sessionStorage.getItem(PREDICTION_RUN_SESSION_STORAGE_KEY)
    || window.sessionStorage.getItem(LEGACY_PREDICTION_RUN_SESSION_STORAGE_KEY)
  );
};

export const hasPredictionRunSession = (): boolean => Boolean(readPredictionRunSession());

export const emitPredictionRunSessionUpdated = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(PREDICTION_RUN_SESSION_EVENT));
};

export const createPredictionRetryAttemptState = (): PredictionRetryAttemptState => ({
  submitVote: 0,
  cancelVote: 0,
  voteStatus: 0,
});

export const increasePredictionRetryAttempt = (
  state: PredictionRetryAttemptState,
  actionKey: PredictionRetryActionKey
): number => {
  const nextAttempt = state[actionKey] + 1;
  state[actionKey] = nextAttempt;
  return nextAttempt;
};

export const resetPredictionRetryAttempt = (
  state: PredictionRetryAttemptState,
  actionKey: PredictionRetryActionKey
) => {
  state[actionKey] = 0;
};

export const getPredictionRetryDelayMs = (attempt: number): number => {
  const normalizedAttempt = Number.isFinite(attempt) ? Math.max(1, Math.floor(attempt)) : 1;
  const index = Math.min(normalizedAttempt - 1, PREDICTION_NETWORK_RETRY_DELAYS_MS.length - 1);
  return PREDICTION_NETWORK_RETRY_DELAYS_MS[index];
};

export const canSchedulePredictionRetry = (
  nextRetryAttempt: number,
  maxAttempts: number = PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS
): boolean => {
  return nextRetryAttempt > 0 && nextRetryAttempt <= Math.max(1, maxAttempts);
};

export const hasExceededPredictionRetryLimit = (
  nextRetryAttempt: number,
  maxAttempts: number = PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS
): boolean => {
  return !canSchedulePredictionRetry(nextRetryAttempt, maxAttempts);
};

export const isPredictionRunSessionStale = (
  startedAt: number,
  nowMs: number = Date.now(),
  ttlMs: number = PREDICTION_RUN_SESSION_TTL_MS
): boolean => {
  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    return true;
  }
  const elapsed = nowMs - startedAt;
  if (!Number.isFinite(elapsed) || elapsed < 0) {
    return true;
  }
  return elapsed > ttlMs;
};

// 세션이 방금(같은 렌더 사이클의 executeVote/executeCancelVote 호출) 쓰여진 것인지
// 구분한다. 복원은 페이지가 실제로 새로고침/탭 전환된 뒤 남겨진 세션을 대상으로 하는
// 기능이라, 그런 경우 startedAt은 항상 "지금"보다 최소 수백ms~수초 이전이다. 반면
// runInProgressRef를 갱신하는 effect가 React 18 배치 렌더링에서 mount effect와 함께
// 재실행되며 restoreRunSession이 곧바로 호출되면 startedAt이 거의 "지금"과 같다 —
// 이 경우는 복원 대상이 아니라 지금 막 시작된 자기 자신의 실행이므로 건드리면 안 된다.
export const isPredictionRunSessionTooFreshToRestore = (
  startedAt: number,
  nowMs: number = Date.now(),
  minAgeMs: number = PREDICTION_RUN_SESSION_MIN_RESTORE_AGE_MS
): boolean => {
  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    return false;
  }
  const elapsed = nowMs - startedAt;
  if (!Number.isFinite(elapsed)) {
    return false;
  }
  return elapsed < minAgeMs;
};

export const parsePredictionRunSession = (rawValue: string | null): PredictionRunSessionV1 | null => {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PredictionRunSessionV1>;
    const hasValidAction = parsed.action === 'vote' || parsed.action === 'cancel';
    const hasValidTimeoutStage = parsed.timeoutStage === 'none'
      || parsed.timeoutStage === 'warning'
      || parsed.timeoutStage === 'fatal';
    const hasValidTeam = parsed.team == null || parsed.team === 'home' || parsed.team === 'away';

    if (
      typeof parsed.flowId !== 'string'
      || typeof parsed.gameId !== 'string'
      || !hasValidAction
      || typeof parsed.startedAt !== 'number'
      || typeof parsed.bannerDismissed !== 'boolean'
      || !hasValidTimeoutStage
      || !hasValidTeam
    ) {
      return null;
    }

    return {
      flowId: parsed.flowId,
      gameId: parsed.gameId,
      action: parsed.action as PredictionRunAction,
      startedAt: parsed.startedAt,
      team: parsed.team as 'home' | 'away' | undefined,
      bannerDismissed: parsed.bannerDismissed,
      timeoutStage: parsed.timeoutStage as PredictionRunTimeoutStage,
    };
  } catch {
    return null;
  }
};
