import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import AutosizeTextarea from './autosize-textarea';

test('autosize textarea has standalone mobile width containment and row defaults', () => {
  const html = renderToStaticMarkup(createElement(AutosizeTextarea, {
    'aria-label': '댓글',
    className: 'w-full',
    minRows: 2,
  }));
  assert.match(html, /class="[^"]*min-w-0[^"]*max-w-full[^"]*w-full/);
  assert.match(html, /rows="2"/);
  assert.match(html, /style="overflow-y:hidden"/);
});
