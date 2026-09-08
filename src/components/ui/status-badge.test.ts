import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { StatusBadge } from './status-badge';

const renderBadge = (label: string, title?: string) => renderToStaticMarkup(createElement(StatusBadge, {
  label,
  title,
  'data-testid': 'status-badge',
}));

test('status badge yields width to mobile siblings and confines hostile labels', () => {
  const html = renderBadge(`경기 상태 ${'상'.repeat(180)}`);
  const badge = /data-testid="status-badge"[^>]*class="([^"]+)"/.exec(html);
  assert.ok(badge, 'status badge must render');
  assert.match(badge[1], /max-w-full/);
  assert.match(badge[1], /min-w-0/);
  assert.doesNotMatch(badge[1], /(?:^|\s)shrink-0(?:\s|$)/);
  assert.doesNotMatch(badge[1], /overflow-hidden/);

  const label = /<span class="([^"]*status-badge-label[^"]*)"[^>]*>경기 상태/.exec(html);
  assert.ok(label, 'status badge label must render');
  assert.match(label[1], /min-w-0/);
  assert.match(label[1], /overflow-hidden/);
  assert.match(label[1], /text-ellipsis/);
  assert.match(label[1], /whitespace-nowrap/);
});

test('status badge exposes a truncated string label through its title', () => {
  const inferred = renderBadge('매우 긴 상태 이름');
  assert.match(inferred, /title="매우 긴 상태 이름"/);

  const explicit = renderBadge('매우 긴 상태 이름', '운영자 지정 설명');
  assert.match(explicit, /title="운영자 지정 설명"/);
  assert.doesNotMatch(explicit, /title="매우 긴 상태 이름"/);
});

test('status badge documents variant inputs that are visually equivalent', () => {
  const lineDot = renderToStaticMarkup(createElement(StatusBadge, {
    label: '라인', marker: 'dot', tone: 'danger', variant: 'line',
  }));
  const lineGlyph = renderToStaticMarkup(createElement(StatusBadge, {
    label: '라인', marker: 'diamond', tone: 'danger', variant: 'line',
  }));
  assert.equal(lineGlyph, lineDot);

  const filledNeutral = renderToStaticMarkup(createElement(StatusBadge, {
    label: '채움', marker: 'dot', tone: 'neutral', variant: 'filled',
  }));
  const filledIgnoredInputs = renderToStaticMarkup(createElement(StatusBadge, {
    label: '채움', marker: 'check', tone: 'danger', variant: 'filled',
  }));
  assert.equal(filledIgnoredInputs, filledNeutral);

  const quietDefault = renderToStaticMarkup(createElement(StatusBadge, {
    label: '기본', variant: 'quiet',
  }));
  const quietIgnoredColors = renderToStaticMarkup(createElement(StatusBadge, {
    dotColor: '#facc15', filledTextColor: '#f8fafc', label: '기본', variant: 'quiet',
  }));
  assert.equal(quietIgnoredColors, quietDefault);
});
