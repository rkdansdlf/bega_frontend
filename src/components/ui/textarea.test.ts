import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Textarea } from './textarea';

test('textarea stays inside narrow flex layouts and avoids mobile input zoom', () => {
  const html = renderToStaticMarkup(createElement(Textarea, {
    'aria-label': '설명',
    defaultValue: `설명-${'가'.repeat(120)}`,
  }));
  const textarea = /data-slot="textarea" class="([^"]+)"/.exec(html);
  assert.ok(textarea);
  assert.match(textarea[1], /min-w-0/);
  assert.match(textarea[1], /max-w-full/);
  assert.match(textarea[1], /w-full/);
  assert.match(textarea[1], /text-base/);
  assert.match(textarea[1], /min-h-16/);
});
