import assert from 'node:assert/strict';
import test from 'node:test';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';

import PublicNavbarMenuPanel from './PublicNavbarMenuPanel';

test('public navbar menu renders safely outside Vite and exposes every public destination', () => {
  const html = renderToStaticMarkup(
    <StaticRouter location="/home">
      <PublicNavbarMenuPanel
        onClose={() => {}}
        prefetchPredictionPage={() => {}}
      />
    </StaticRouter>,
  );

  for (const destination of ['/cheer', '/stadium', '/mate']) {
    assert.match(html, new RegExp(`href="${destination}"`));
  }
  assert.match(html, /href="\/prediction\?date=\d{4}-\d{2}-\d{2}"/);
  assert.match(html, />로그인<\/button>/);
});

test('public navbar menu navigation exposes a deliberate keyboard focus treatment', () => {
  const html = renderToStaticMarkup(
    <StaticRouter location="/home">
      <PublicNavbarMenuPanel
        onClose={() => {}}
        prefetchPredictionPage={() => {}}
      />
    </StaticRouter>,
  );
  const cheerLink = html.match(/<a[^>]+href="\/cheer"[^>]*>/)?.[0];

  assert.ok(cheerLink);
  assert.match(cheerLink, /focus-visible:ring-2/);
  assert.match(cheerLink, /focus-visible:ring-offset-2/);
});
