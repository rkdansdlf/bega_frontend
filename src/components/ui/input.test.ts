import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Input } from './input';

test('input keeps a 44px mobile target without changing desktop density', () => {
  const html = renderToStaticMarkup(createElement(Input, {
    'aria-label': '검색',
    placeholder: '검색어',
  }));
  const input = /data-slot="input" class="([^"]+)"/.exec(html);
  assert.ok(input);
  assert.match(input[1], /(?:^|\s)h-11(?:\s|$)/);
  assert.match(input[1], /sm:h-9/);
  assert.match(input[1], /min-w-0/);
  assert.match(input[1], /text-base/);
});
