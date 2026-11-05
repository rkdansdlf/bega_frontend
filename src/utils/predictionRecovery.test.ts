import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS,
  PREDICTION_RUN_SESSION_TTL_MS,
  canSchedulePredictionRetry,
  createPredictionRetryAttemptState,
  getPredictionRetryDelayMs,
  hasPredictionRunSession,
  hasExceededPredictionRetryLimit,
  increasePredictionRetryAttempt,
  isPredictionRunSessionStale,
  readPredictionRunSession,
  parsePredictionRunSession,
  resetPredictionRetryAttempt,
  removePredictionRunSession,
  writePredictionRunSession,
} from './predictionRecovery';

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
};

test('retry counter는 동작별로 증가하고 초기화할 수 있다', () => {
  const state = createPredictionRetryAttemptState();

  assert.equal(increasePredictionRetryAttempt(state, 'submitVote'), 1);
  assert.equal(increasePredictionRetryAttempt(state, 'submitVote'), 2);
  assert.equal(increasePredictionRetryAttempt(state, 'cancelVote'), 1);
  assert.equal(state.voteStatus, 0);

  resetPredictionRetryAttempt(state, 'submitVote');
  assert.equal(state.submitVote, 0);
});

test('retry limit 3회 초과 시 fallback 대상이 된다', () => {
  assert.equal(canSchedulePredictionRetry(1), true);
  assert.equal(canSchedulePredictionRetry(PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS), true);
  assert.equal(canSchedulePredictionRetry(PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS + 1), false);
  assert.equal(hasExceededPredictionRetryLimit(PREDICTION_NETWORK_RETRY_MAX_ATTEMPTS + 1), true);
});

test('retry delay는 1s -> 2s -> 4s 백오프를 사용한다', () => {
  assert.equal(getPredictionRetryDelayMs(1), 1000);
  assert.equal(getPredictionRetryDelayMs(2), 2000);
  assert.equal(getPredictionRetryDelayMs(3), 4000);
  assert.equal(getPredictionRetryDelayMs(7), 4000);
});

test('run session stale 판정과 복원 가능 판정', () => {
  const now = 1_700_000_000_000;
  const freshStartedAt = now - (PREDICTION_RUN_SESSION_TTL_MS - 1_000);
  const staleStartedAt = now - (PREDICTION_RUN_SESSION_TTL_MS + 1_000);

  assert.equal(isPredictionRunSessionStale(freshStartedAt, now), false);
  assert.equal(isPredictionRunSessionStale(staleStartedAt, now), true);
});

test('run session JSON 파싱은 스키마가 맞지 않으면 null을 반환한다', () => {
  const valid = JSON.stringify({
    flowId: 'flow-1',
    gameId: '20260222HHSS0',
    action: 'vote',
    startedAt: 1_700_000_000_000,
    team: 'home',
    bannerDismissed: false,
    timeoutStage: 'warning',
  });

  const invalid = JSON.stringify({
    flowId: 'flow-2',
    gameId: '20260222HHSS0',
    action: 'invalid',
    startedAt: 1_700_000_000_000,
    bannerDismissed: false,
    timeoutStage: 'none',
  });

  const parsed = parsePredictionRunSession(valid);
  assert.ok(parsed);
  assert.equal(parsed?.action, 'vote');
  assert.equal(parsed?.timeoutStage, 'warning');
  assert.equal(parsePredictionRunSession(invalid), null);
  assert.equal(parsePredictionRunSession('{invalid-json'), null);
});

test('run session은 viewer별 저장소에서만 읽고 지운다', () => {
  const storage = createStorage();
  const viewerAScope = { viewerId: 101, sessionEpoch: 3 };
  const viewerBscope = { viewerId: 202, sessionEpoch: 4 };
  const viewerASession = {
    flowId: 'flow-a',
    gameId: 'synthetic-game-a',
    action: 'vote' as const,
    startedAt: 1_700_000_000_000,
    team: 'home' as const,
    bannerDismissed: false,
    timeoutStage: 'warning' as const,
  };
  const serialized = JSON.stringify(viewerASession);

  assert.equal(writePredictionRunSession(viewerAScope, viewerASession, () => true, storage), true);
  assert.equal(readPredictionRunSession(viewerAScope.viewerId, storage), serialized);
  assert.equal(readPredictionRunSession(viewerBscope.viewerId, storage), null);
  assert.equal(hasPredictionRunSession(viewerAScope.viewerId, storage), true);
  assert.equal(hasPredictionRunSession(viewerBscope.viewerId, storage), false);
  assert.equal(storage.getItem('prediction:run-session:v1'), null);
  assert.equal(removePredictionRunSession(viewerAScope, () => true, storage), true);
  assert.equal(readPredictionRunSession(viewerAScope.viewerId, storage), null);
});

test('viewer 전환 뒤 도착한 이전 세션 쓰기·삭제 응답은 현재 저장값을 건드리지 않는다', () => {
  const storage = createStorage();
  const viewerAScope = { viewerId: 101, sessionEpoch: 3 };
  let currentScope = viewerAScope;
  const isCurrentScope = () => (
    viewerAScope.viewerId === currentScope.viewerId
    && viewerAScope.sessionEpoch === currentScope.sessionEpoch
  );
  const viewerASession = {
    flowId: 'flow-a',
    gameId: 'synthetic-game-a',
    action: 'vote' as const,
    startedAt: 1_700_000_000_000,
    team: 'home' as const,
    bannerDismissed: false,
    timeoutStage: 'warning' as const,
  };
  const delayedViewerASession = { ...viewerASession, flowId: 'late-flow-a' };

  assert.equal(writePredictionRunSession(viewerAScope, viewerASession, isCurrentScope, storage), true);
  currentScope = { viewerId: 202, sessionEpoch: 4 };

  assert.equal(writePredictionRunSession(viewerAScope, delayedViewerASession, isCurrentScope, storage), false);
  assert.equal(removePredictionRunSession(viewerAScope, isCurrentScope, storage), false);
  assert.equal(readPredictionRunSession(101, storage), JSON.stringify(viewerASession));
  assert.equal(readPredictionRunSession(202, storage), null);
});

test('legacy ownerless run session is never restored for any viewer', () => {
  const storage = createStorage();
  storage.setItem('prediction:run-session:v1', 'legacy-ownerless-value');
  storage.setItem('prediction:run-session', 'legacy-value');

  assert.equal(readPredictionRunSession(101, storage), null);
  assert.equal(hasPredictionRunSession(101, storage), false);
});
