import assert from 'node:assert/strict';
import test from 'node:test';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import StadiumMapFallback from './StadiumMapFallback';

const renderFallback = (props: Partial<Parameters<typeof StadiumMapFallback>[0]> = {}) => renderToStaticMarkup(
  createElement(StadiumMapFallback, {
    reason: 'unavailable',
    stadiumName: '창원NC파크',
    lat: 35.2225,
    lng: 128.5823,
    onRetry: () => {},
    ...props,
  }),
);

test('map fallback links the selected stadium to Kakao Map place and route pages', () => {
  const html = renderFallback();

  assert.match(html, /data-map-failure-reason="unavailable"/);
  assert.match(html, /지도를 불러오지 못했어요/);
  assert.match(html, /href="https:\/\/map\.kakao\.com\/link\/map\/%EC%B0%BD%EC%9B%90NC%ED%8C%8C%ED%81%AC,35\.2225,128\.5823"/);
  assert.match(html, /href="https:\/\/map\.kakao\.com\/link\/to\/%EC%B0%BD%EC%9B%90NC%ED%8C%8C%ED%81%AC,35\.2225,128\.5823"/);
  assert.match(html, /카카오맵에서 보기/);
  assert.match(html, /길찾기/);
  assert.match(html, /data-testid="stadium-map-fallback-retry"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test('map fallback never shows operator diagnostics', () => {
  for (const reason of ['offline', 'unavailable', 'missing-key'] as const) {
    const html = renderFallback({ reason });
    assert.doesNotMatch(html, /API 키|도메인|광고 차단|스크립트|VITE_/);
  }
});

test('map fallback hides retry when the failure cannot change on retry', () => {
  const html = renderFallback({ reason: 'missing-key' });

  assert.match(html, /지금은 지도를 보여드릴 수 없어요/);
  assert.doesNotMatch(html, /data-testid="stadium-map-fallback-retry"/);
  assert.match(html, /카카오맵에서 보기/);
});

test('map fallback keeps retry for offline and marks it busy while retrying', () => {
  const html = renderFallback({ reason: 'offline', isRetrying: true });

  assert.match(html, /인터넷 연결이 끊겨 지도를 못 불러왔어요/);
  assert.match(html, /<button[^>]*disabled=""[^>]*aria-busy="true"[^>]*data-testid="stadium-map-fallback-retry"/);
});

test('map fallback falls back to a name search without coordinates and drops the route link', () => {
  const html = renderFallback({ lat: null, lng: null });

  assert.match(html, /href="https:\/\/map\.kakao\.com\/\?q=%EC%B0%BD%EC%9B%90NC%ED%8C%8C%ED%81%AC"/);
  assert.doesNotMatch(html, /data-testid="stadium-map-fallback-route"/);
});
