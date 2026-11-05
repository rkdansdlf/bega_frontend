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
    hasStadiumCoordinates: true,
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
    hasStadiumCoordinates: true,
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
    hasStadiumCoordinates: true,
  });
  assert.equal(reasonOfflineWithMissingKey, 'offline');

  const reasonOfflineWithKey = resolveMapFallbackReason({
    hasSelectedStadium: true,
    canRenderMap: false,
    mapFailureReason: 'offline',
    hasApiKey: true,
    mapStatus,
    hasStadiumCoordinates: true,
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
    hasStadiumCoordinates: true,
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
    hasStadiumCoordinates: true,
  });
  assert.equal(reason, null);
});

test('resolves to no-coordinates when key is present and mapStatus is success but coordinates are invalid (canRenderMap is false)', () => {
  const mapStatus: AsyncStatus = 'success';
  const reason = resolveMapFallbackReason({
    hasSelectedStadium: true,
    canRenderMap: false,
    mapFailureReason: null,
    hasApiKey: true,
    mapStatus,
    hasStadiumCoordinates: false,
  });
  assert.equal(reason, 'no-coordinates');
});

test('no-coordinates takes precedence over missing-key, unavailable and SDK failure reasons', () => {
  const cases: Array<{ hasApiKey: boolean; mapStatus: AsyncStatus; mapFailureReason: 'offline' | 'unavailable' | null }> = [
    { hasApiKey: false, mapStatus: 'idle', mapFailureReason: null },
    { hasApiKey: true, mapStatus: 'error', mapFailureReason: null },
    { hasApiKey: true, mapStatus: 'error', mapFailureReason: 'offline' },
    { hasApiKey: true, mapStatus: 'error', mapFailureReason: 'unavailable' },
    { hasApiKey: true, mapStatus: 'loading', mapFailureReason: null },
  ];
  for (const c of cases) {
    const reason = resolveMapFallbackReason({
      hasSelectedStadium: true,
      canRenderMap: false,
      hasStadiumCoordinates: false,
      ...c,
    });
    assert.equal(reason, 'no-coordinates', JSON.stringify(c));
  }
});
