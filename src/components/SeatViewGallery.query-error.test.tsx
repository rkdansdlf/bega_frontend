import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SeatViewGallery from './SeatViewGallery';
import type { SeatViewPhoto } from '../api/diary';

const photo: SeatViewPhoto = {
  photoUrl: '/synthetic-seat.svg', stadium: 'synthetic-stadium', section: 'synthetic-section',
  block: null, diaryDate: '2099-01-01',
};

function render(photos: SeatViewPhoto[], failed: boolean) {
  const client = new QueryClient();
  const key = ['seat-views', photo.stadium, [photo.section], 9];
  client.setQueryData(key, photos);
  if (failed) client.getQueryCache().find({ queryKey: key })!.setState({
    status: 'error', error: new Error('SYNTHETIC_QUERY_FAILURE'), fetchStatus: 'idle',
  });
  const html = renderToStaticMarkup(createElement(QueryClientProvider, { client },
    createElement(StaticRouter, { location: '/' }, createElement(SeatViewGallery, {
      stadium: photo.stadium, section: photo.section!,
    }))));
  client.clear();
  return html;
}

test('failed query is an alert, not a healthy empty invitation', () => {
  const html = render([], true);
  assert.match(html, /role="alert"/);
  assert.match(html, /사진 조회 실패/);
  assert.doesNotMatch(html, /아직 등록된 시야가 없어요|seat-view-share-link/);
});

test('healthy empty query preserves the original invitation without an error', () => {
  const html = render([], false);
  assert.match(html, /아직 등록된 시야가 없어요/);
  assert.match(html, /seat-view-share-link/);
  assert.doesNotMatch(html, /seat-view-query-error/);
});

test('failed background refresh retains cached photos alongside the alert', () => {
  const html = render([photo], true);
  assert.match(html, /seat-view-query-error/);
  assert.match(html, /seat-view-photo-0/);
  assert.match(html, /synthetic-seat.svg/);
  assert.doesNotMatch(html, /아직 등록된 시야가 없어요/);
});

test('healthy populated query retains photos without an error', () => {
  const html = render([photo], false);
  assert.match(html, /seat-view-photo-0/);
  assert.doesNotMatch(html, /seat-view-query-error/);
});
