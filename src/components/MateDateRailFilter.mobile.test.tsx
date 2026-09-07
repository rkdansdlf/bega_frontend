import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import MateDateRailFilter from './MateDateRailFilter';

const makeDates = (count: number) => Array.from({ length: count }, (_, index) => (
  new Date(2027, 11, 24 + index)
));

const renderFilter = ({
  count = 14,
  expanded = false,
  selectedDate = null,
}: {
  count?: number;
  expanded?: boolean;
  selectedDate?: Date | null;
} = {}) => renderToStaticMarkup(createElement(MateDateRailFilter, {
  dateItems: makeDates(count),
  onDateSelect: () => {},
  selectedDate,
  visualQaStateOverride: { expanded, interactive: true },
} as never));

test('date rail fixture controls are disabled in production', async () => {
  const source = await readFile(new URL('./MateDateRailFilter.tsx', import.meta.url), 'utf8');

  assert.match(source, /import\.meta\.env\?\.PROD !== true/);
  assert.match(source, /visualQaStateOverride/);
  assert.match(source, /visualQaInteractive/);
});

test('date rail owns a contained semantic mobile surface and 44px controls', () => {
  const markup = renderFilter({ count: 0 });

  assert.match(markup, /data-testid="mate-date-rail-filter"/);
  assert.match(markup, /data-date-count="0"/);
  assert.match(markup, /data-expanded="false"/);
  assert.match(markup, /min-w-0/);
  assert.match(markup, /overflow-wrap:anywhere/);
  assert.match(markup, /data-testid="mate-date-rail-filter"[^>]*class="[^"]*p-1/);
  assert.match(markup, /aria-label="경기 날짜 필터"/);
  assert.match(markup, /data-testid="mate-date-rail-all"/);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /min-h-11/);
  assert.match(markup, /전체 0일/);
});

test('collapsed production density shows the exact eight-date boundary and reachable expansion', () => {
  const markup = renderFilter();
  const renderedDateButtons = markup.match(/data-testid="mate-date-rail-date-/g) ?? [];

  assert.equal(renderedDateButtons.length, 8);
  assert.match(markup, /data-testid="mate-date-rail-more"/);
  assert.match(markup, /aria-expanded="false"/);
  assert.match(markup, /aria-controls="mate-date-rail-grid"/);
  assert.match(markup, /\+ 6일 더 보기/);
  assert.match(markup, /active:scale-\[0\.98\]/);
});

test('expanded production density exposes all fourteen dates and a touch-sized collapse control', () => {
  const markup = renderFilter({ expanded: true });
  const renderedDateButtons = markup.match(/data-testid="mate-date-rail-date-/g) ?? [];

  assert.equal(renderedDateButtons.length, 14);
  assert.match(markup, /data-testid="mate-date-rail-more"/);
  assert.match(markup, /aria-expanded="true"/);
  assert.match(markup, />접기</);
  assert.match(markup, /data-testid="mate-date-rail-more"[^>]*class="[^"]*min-h-11/);
});

test('collapsed hidden and outside-range selections remain visibly explainable', () => {
  const dates = makeDates(14);
  const hiddenMarkup = renderFilter({ selectedDate: dates[8] });
  const outsideMarkup = renderFilter({ selectedDate: new Date(2028, 0, 22) });

  assert.match(hiddenMarkup, /data-testid="mate-date-rail-selection-summary"/);
  assert.match(hiddenMarkup, /선택 날짜/);
  assert.match(hiddenMarkup, /더 보기를 열면 선택한 날짜를 확인할 수 있습니다/);
  assert.match(outsideMarkup, /현재 14일 범위 밖/);
  assert.match(outsideMarkup, /data-testid="mate-date-rail-clear-outside"/);
  assert.match(outsideMarkup, /min-h-11/);
  assert.match(outsideMarkup, /flex min-w-0 items-center justify-between gap-2/);
  assert.doesNotMatch(outsideMarkup, /flex-col/);
});
