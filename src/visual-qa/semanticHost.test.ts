import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Outlet } from 'react-router-dom';

import { TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { renderInSemanticHost } from './semanticHost';

test('table primitives render beneath the HTML ancestors required by their element type', () => {
  const headerHtml = renderToStaticMarkup(renderInSemanticHost(
    createElement(TableHeader, null, createElement(TableRow)),
    'table',
  ));
  assert.match(headerHtml, /^<div[^>]*data-vqa-semantic-host-container="true"[^>]*><table[^>]*><thead[^>]*><tr/);
  assert.match(headerHtml, /^<div class="[^"]*max-w-full[^"]*overflow-x-auto[^"]*overscroll-x-contain/);
  assert.doesNotMatch(headerHtml, /touch-pan-x/);

  const rowHtml = renderToStaticMarkup(renderInSemanticHost(
    createElement(TableRow, null, createElement(TableCell, null, '행')),
    'table-body',
  ));
  assert.match(rowHtml, /^<div[^>]*><table[^>]*><tbody><tr[^>]*><td/);

  const headHtml = renderToStaticMarkup(renderInSemanticHost(
    createElement(TableHead, null, '열'),
    'table-header-row',
  ));
  assert.match(headHtml, /^<div[^>]*><table[^>]*><thead><tr><th/);

  const cellHtml = renderToStaticMarkup(renderInSemanticHost(
    createElement(TableCell, null, '셀'),
    'table-body-row',
  ));
  assert.match(cellHtml, /^<div[^>]*><table[^>]*><tbody><tr><td/);
});

test('semantic host rendering is fail-closed for an unknown host', () => {
  assert.throws(
    () => renderInSemanticHost(createElement('span'), 'unknown' as never),
    /지원하지 않는 Visual QA semantic host/,
  );
});

test('admin route host unmounts the guard after navigation leaves /admin', () => {
  const guard = createElement('div', { 'data-testid': 'admin-route-guard' }, 'guard');
  const adminHtml = renderToStaticMarkup(createElement(
    MemoryRouter,
    { initialEntries: ['/admin'] },
    renderInSemanticHost(guard, 'admin-route'),
  ));
  assert.match(adminHtml, /data-testid="admin-route-guard"/);

  const loginHtml = renderToStaticMarkup(createElement(
    MemoryRouter,
    { initialEntries: ['/login?redirect=%2Fadmin'] },
    renderInSemanticHost(guard, 'admin-route'),
  ));
  assert.doesNotMatch(loginHtml, /data-testid="admin-route-guard"/);
});

test('auth route hosts mount guards only on their owned route families', () => {
  const protectedGuard = createElement(
    'div',
    { 'data-testid': 'protected-route-guard' },
    'protected guard',
  );
  const protectedHtml = renderToStaticMarkup(createElement(
    MemoryRouter,
    { initialEntries: ['/messages/@bega'] },
    renderInSemanticHost(protectedGuard, 'protected-route' as never),
  ));
  assert.match(protectedHtml, /data-testid="protected-route-guard"/);

  const protectedDestinationHtml = renderToStaticMarkup(createElement(
    MemoryRouter,
    { initialEntries: ['/login'] },
    renderInSemanticHost(protectedGuard, 'protected-route' as never),
  ));
  assert.doesNotMatch(protectedDestinationHtml, /data-testid="protected-route-guard"/);

  const publicGuard = createElement(
    'div',
    { 'data-testid': 'public-only-route-guard' },
    'public guard',
  );
  const publicHtml = renderToStaticMarkup(createElement(
    MemoryRouter,
    { initialEntries: ['/login'] },
    renderInSemanticHost(publicGuard, 'public-only-auth-route' as never),
  ));
  assert.match(publicHtml, /data-testid="public-only-route-guard"/);

  const publicDestinationHtml = renderToStaticMarkup(createElement(
    MemoryRouter,
    { initialEntries: ['/home'] },
    renderInSemanticHost(publicGuard, 'public-only-auth-route' as never),
  ));
  assert.doesNotMatch(publicDestinationHtml, /data-testid="public-only-route-guard"/);
});

test('outlet route host renders a deterministic nested route child', () => {
  const html = renderToStaticMarkup(createElement(
    MemoryRouter,
    { initialEntries: ['/__visual-qa__'] },
    renderInSemanticHost(createElement(Outlet), 'outlet-route' as never),
  ));

  assert.match(html, /data-testid="app-query-provider-outlet"/);
  assert.match(html, /중첩 라우트 콘텐츠/);
});

test('suspense host keeps lazy route suspension inside a visible deterministic fallback', () => {
  const SuspendsForever = () => {
    throw new Promise<never>(() => {});
  };
  const html = renderToStaticMarkup(renderInSemanticHost(
    createElement(SuspendsForever),
    'suspense' as never,
  ));

  assert.match(html, /data-testid="visual-qa-lazy-route-fallback"/);
  assert.match(html, /라우트 화면을 불러오는 중입니다/);
});
