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

test('map fallback links the selected stadium to its Kakao Map place page without a duplicate route action', () => {
  const html = renderFallback();

  assert.match(html, /data-map-failure-reason="unavailable"/);
  assert.match(html, /지도를 불러오지 못했어요/);
  assert.match(html, /href="https:\/\/map\.kakao\.com\/link\/map\/%EC%B0%BD%EC%9B%90NC%ED%8C%8C%ED%81%AC,35\.2225,128\.5823"/);
  // 구장 이름은 위 위치 카드에 이미 있어 화면에는 다시 쓰지 않고, 링크 이름에만 둡니다.
  assert.match(html, /aria-label="창원NC파크 카카오맵에서 보기"/);
  assert.doesNotMatch(html, />창원NC파크</);
  assert.match(html, /카카오맵에서 보기/);
  // 길찾기는 위 위치 카드에만 있습니다.
  assert.doesNotMatch(html, /map\.kakao\.com\/link\/to\//);
  assert.doesNotMatch(html, /길찾기/);
  assert.match(html, /data-testid="stadium-map-fallback-retry"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test('map fallback never shows operator diagnostics', () => {
  for (const reason of ['offline', 'unavailable', 'missing-key', 'no-coordinates'] as const) {
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
  // disabled 로 막으면 포커스가 body 로 빠지므로 aria-disabled 로만 표시합니다.
  assert.match(html, /<button[^>]*aria-disabled="true"[^>]*aria-busy="true"[^>]*data-testid="stadium-map-fallback-retry"/);
  assert.doesNotMatch(html, /<button[^>]*\sdisabled=""/);
});

test('map fallback falls back to a name search without coordinates', () => {
  const html = renderFallback({ lat: null, lng: null });

  assert.match(html, /href="https:\/\/map\.kakao\.com\/\?q=%EC%B0%BD%EC%9B%90NC%ED%8C%8C%ED%81%AC"/);
});

test('map fallback renders no-coordinates without retry button and with kakao search link', () => {
  const html = renderFallback({
    reason: 'no-coordinates',
    lat: null,
    lng: null,
  });

  assert.match(html, /data-map-failure-reason="no-coordinates"/);
  assert.match(html, /지도에 구장 위치를 표시할 수 없어요/);
  assert.match(html, /href="https:\/\/map\.kakao\.com\/\?q=%EC%B0%BD%EC%9B%90NC%ED%8C%8C%ED%81%AC"/);
  assert.doesNotMatch(html, /data-testid="stadium-map-fallback-retry"/);
});
