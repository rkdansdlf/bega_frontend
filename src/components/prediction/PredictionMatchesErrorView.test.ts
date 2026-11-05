import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import PredictionMatchesErrorView from './PredictionMatchesErrorView';

test('PredictionMatchesErrorView는 수동 데이터 empty state를 사용자 문구와 CTA로 표시한다', () => {
  const html = renderToStaticMarkup(createElement(PredictionMatchesErrorView, {
    matchesLoadErrorMessage: 'MANUAL_BASEBALL_DATA_REQUIRED: 야구 데이터 준비가 필요합니다.',
    matchesLoadErrorCode: 'MANUAL_BASEBALL_DATA_REQUIRED',
    predictionRecoveryPath: '/prediction',
    onReloadMatches: () => {},
  }));

  assert.match(html, /data-testid="prediction-empty-state"/);
  assert.match(html, /야구 데이터 준비가 필요합니다/);
  assert.match(html, /운영자가 데이터를 제공하면 다시 확인할 수 있습니다/);
  assert.match(html, /data-testid="prediction-empty-retry"/);
  assert.match(html, /다시 불러오기/);
  // 이미 목록 화면이면 같은 곳으로 가는 버튼은 보여주지 않습니다.
  assert.doesNotMatch(html, /data-testid="prediction-empty-recovery"/);
  assert.doesNotMatch(html, /예측으로 돌아가기/);
  assert.doesNotMatch(html, /MANUAL_BASEBALL_DATA_REQUIRED/);
  assert.doesNotMatch(html, /경기 일정을 불러오지 못했어요/);
});

test('PredictionMatchesErrorView는 연결 실패를 실제 경기 상태로 표현하지 않는다', () => {
  const html = renderToStaticMarkup(createElement(PredictionMatchesErrorView, {
    matchesLoadErrorMessage: '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.',
    matchesLoadErrorCode: 'NETWORK_ERROR',
    predictionRecoveryPath: '/prediction',
    onReloadMatches: () => {},
  }));

  assert.match(html, /경기 일정을 불러오지 못했어요/);
  assert.match(html, /다시 불러오면 경기 일정을 확인할 수 있어요/);
  assert.doesNotMatch(html, /우천|경기 중단/);
  assert.match(html, /data-testid="prediction-empty-retry"/);
});

test('PredictionMatchesErrorView는 서버 원문 메시지를 사용자에게 노출하지 않는다', () => {
  const html = renderToStaticMarkup(createElement(PredictionMatchesErrorView, {
    matchesLoadErrorMessage: 'org.hibernate.exception.JDBCConnectionException: Unable to acquire JDBC Connection',
    matchesLoadErrorCode: 'INTERNAL_SERVER_ERROR',
    predictionRecoveryPath: '/prediction?date=2026-07-15',
    showRecoveryLink: true,
    onReloadMatches: () => {},
  }));

  assert.doesNotMatch(html, /JDBC|hibernate|INTERNAL_SERVER_ERROR/);
  assert.match(html, /data-testid="prediction-empty-recovery"/);
  assert.match(html, /전체 경기 목록 보기/);
});
