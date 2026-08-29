import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import ClientErrorTrendChart from './ClientErrorTrendChart';

type TrendPoint = {
  label: string;
  api: number;
  runtime: number;
  feedback: number;
};

const renderChart = (chartData: TrendPoint[], loading = false) => (
  renderToStaticMarkup(createElement(ClientErrorTrendChart, { chartData, loading }))
);

test('client error trend chart announces loading and empty outcomes from a stable root', () => {
  const loadingHtml = renderChart([], true);
  const emptyHtml = renderChart([]);

  for (const html of [loadingHtml, emptyHtml]) {
    const root = html.match(
      /<div[^>]*data-testid="admin-client-error-trend-chart"[^>]*>/,
    )?.[0];
    assert.ok(root);
    assert.match(root, /min-w-0/);
    assert.match(root, /max-w-full/);
  }
  assert.match(
    loadingHtml,
    /data-testid="admin-client-error-trend-chart-status"[^>]+role="status"[^>]+aria-live="polite"[^>]+aria-busy="true"/,
  );
  assert.match(
    emptyHtml,
    /data-testid="admin-client-error-trend-chart-status"[^>]+role="status"[^>]+aria-live="polite"/,
  );
  assert.doesNotMatch(emptyHtml, /aria-busy="true"/);
});

test('client error trend chart owns narrow horizontal scrolling without shrinking its canvas', () => {
  const html = renderChart([
    { label: '00:00', api: 3, runtime: 2, feedback: 1 },
    { label: '01:00', api: 4, runtime: 1, feedback: 2 },
  ]);
  const scrollOwner = html.match(
    /<div[^>]*data-testid="admin-client-error-trend-chart-scroll"[^>]*>/,
  )?.[0];
  const svg = html.match(/<svg[^>]*role="img"[^>]*>/)?.[0];

  assert.ok(scrollOwner);
  assert.match(scrollOwner, /w-full/);
  assert.match(scrollOwner, /max-w-full/);
  assert.match(scrollOwner, /overflow-x-auto/);
  assert.match(scrollOwner, /overflow-y-hidden/);
  assert.ok(svg);
  assert.match(svg, /width="720"/);
  assert.match(svg, /height="260"/);
  assert.match(svg, /class="[^"]*w-\[720px\][^"]*max-w-none/);
  assert.match(
    svg,
    /aria-label="클라이언트 오류 추이 차트, 2개 구간, API 최대 4, Runtime 최대 2, Feedback 최대 2"/,
  );
});

test('client error trend chart bounds painted labels and preserves every full point label', () => {
  const labels = Array.from({ length: 20 }, (_, index) => (
    index === 10
      ? `가장 긴 한국어 시간 구간 ${'모바일시각점검'.repeat(5)}`
      : `MOCK_UNBROKEN_LABEL_${index}_${'TOKEN'.repeat(12)}`
  ));
  const html = renderChart(labels.map((label, index) => ({
    label,
    api: index,
    runtime: index + 1,
    feedback: index + 2,
  })));
  const paintedLabels = html.match(/<text[^>]*data-vqa-axis="x-label"[^>]*>/g) ?? [];
  const pointTitles = html.match(/<circle[^>]*>\s*<title>[^<]+<\/title>\s*<\/circle>/g) ?? [];

  assert.ok(paintedLabels.length > 1);
  assert.ok(paintedLabels.length <= 6);
  assert.match(paintedLabels[0] ?? '', /text-anchor="start"/);
  assert.match(paintedLabels.at(-1) ?? '', /text-anchor="end"/);
  assert.equal(pointTitles.length, 60);
  for (const label of labels) {
    assert.match(html, new RegExp(label));
  }
  assert.match(html, />[^<]{1,11}…<\/text>/);
});

test('client error trend chart removes duplicate low-value ticks and repeated-label key warnings', () => {
  const messages: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    messages.push(args.map(String).join(' '));
  };

  try {
    const html = renderChart([
      { label: '동일 구간', api: 0, runtime: 1, feedback: 0 },
      { label: '동일 구간', api: 1, runtime: 0, feedback: 1 },
    ]);
    const ticks = Array.from(
      html.matchAll(/<text[^>]*data-vqa-axis="y-tick"[^>]*>(\d+)<\/text>/g),
      (match) => match[1],
    );

    assert.deepEqual(ticks, ['1', '0']);
    assert.equal(new Set(ticks).size, ticks.length);
    assert.equal((html.match(/data-vqa-axis="x-label"/g) ?? []).length, 2);
    assert.equal((html.match(/<circle/g) ?? []).length, 6);
    assert.equal(messages.filter((message) => /unique "key"|same key/i.test(message)).length, 0);
  } finally {
    console.error = originalError;
  }
});
