import assert from 'node:assert/strict';
import test from 'node:test';

import type { AsyncStatus } from '../utils/stadiumGuideUtils';
import { resolveMapFallbackReason } from './stadiumMapFallbackReason';

test('resolves to missing-key when API key is missing', () => {
  const mapStatus: AsyncStatus = 'idle';
  const reason = resolveMapFallbackReason({
    hasSelectedStadium: true,
    canRenderMap: false,
    mapFailureReason: null,
    hasApiKey: false,
    mapStatus,
  });
  assert.equal(reason, 'missing-key');
});

test('resolves to unavailable when API key is present and mapStatus is error', () => {
  const mapStatus: AsyncStatus = 'error';
  const reason = resolveMapFallbackReason({
    hasSelectedStadium: true,
    canRenderMap: false,
    mapFailureReason: null,
    hasApiKey: true,
    mapStatus,
  });
  assert.equal(reason, 'unavailable');
});

test('explicit mapFailureReason takes precedence over missing-key or error status (e.g. offline)', () => {
  const mapStatus: AsyncStatus = 'error';
  const reasonOfflineWithMissingKey = resolveMapFallbackReason({
    hasSelectedStadium: true,
    canRenderMap: false,
    mapFailureReason: 'offline',
    hasApiKey: false,
    mapStatus,
  });
  assert.equal(reasonOfflineWithMissingKey, 'offline');

  const reasonOfflineWithKey = resolveMapFallbackReason({
    hasSelectedStadium: true,
    canRenderMap: false,
    mapFailureReason: 'offline',
    hasApiKey: true,
    mapStatus,
  });
  assert.equal(reasonOfflineWithKey, 'offline');
});

test('returns null when no stadium is selected', () => {
  const mapStatus: AsyncStatus = 'error';
  const reason = resolveMapFallbackReason({
    hasSelectedStadium: false,
    canRenderMap: false,
    mapFailureReason: 'offline',
    hasApiKey: false,
    mapStatus,
  });
  assert.equal(reason, null);
});

test('returns null when map can render', () => {
  const mapStatus: AsyncStatus = 'success';
  const reason = resolveMapFallbackReason({
    hasSelectedStadium: true,
    canRenderMap: true,
    mapFailureReason: null,
    hasApiKey: true,
    mapStatus,
  });
  assert.equal(reason, null);
});

test('returns null with no failure reason when key is present and mapStatus is success but coordinates are invalid (canRenderMap is false)', () => {
  // 실제 동작: API 키가 있고 mapStatus는 'success'이나 구장 좌표가 유효하지 않아
  // canRenderMap이 false인 경우, 스크립트 로드 자체의 오류가 아니므로
  // mapFallbackReason은 null을 반환합니다.
  // 런타임 UI에서는 StadiumMapFallback 대신 좌표 미제공 안내 Card 프레임을 렌더링합니다.
  const mapStatus: AsyncStatus = 'success';
  const reason = resolveMapFallbackReason({
    hasSelectedStadium: true,
    canRenderMap: false,
    mapFailureReason: null,
    hasApiKey: true,
    mapStatus,
  });
  assert.equal(reason, null);
});
