import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

const renderTable = () => renderToStaticMarkup(createElement(
  Table,
  null,
  createElement(TableCaption, null, `CAPTION-${'C'.repeat(180)}`),
  createElement(
    TableHeader,
    null,
    createElement(TableRow, null, createElement(TableHead, null, `HEAD-${'H'.repeat(140)}`)),
  ),
  createElement(
    TableBody,
    null,
    createElement(TableRow, null, createElement(TableCell, null, `CELL-${'D'.repeat(220)}`)),
  ),
));

test('table confines horizontal scrolling to its own mobile container', () => {
  const html = renderTable();
  assert.match(
    html,
    /data-slot="table-container" class="[^"]*max-w-full[^"]*overflow-x-auto[^"]*overscroll-x-contain/,
  );
  assert.doesNotMatch(html, /touch-pan-x/);
  assert.match(html, /data-slot="table" class="[^"]*min-w-full/);
});

test('table header and body cells wrap hostile content on mobile and retain desktop density', () => {
  const html = renderTable();
  for (const slot of ['table-head', 'table-cell']) {
    const tag = new RegExp(`data-slot="${slot}" class="([^"]+)"`).exec(html);
    assert.ok(tag, `${slot} must render`);
    const className = tag[1];
    assert.match(className, /min-w-24/);
    assert.match(className, /max-w-\[min\(18rem,75vw\)\]/);
    assert.match(className, /whitespace-normal/);
    assert.match(className, /break-words/);
    assert.match(className, /\[overflow-wrap:anywhere\]/);
    assert.match(className, /sm:min-w-0/);
    assert.match(className, /sm:whitespace-nowrap/);
  }
});

test('table captions wrap without widening the viewport', () => {
  const html = renderTable();
  const caption = /data-slot="table-caption" class="([^"]+)"/.exec(html);
  assert.ok(caption);
  assert.match(caption[1], /max-w-full/);
  assert.match(caption[1], /break-words/);
  assert.match(caption[1], /\[overflow-wrap:anywhere\]/);
});
