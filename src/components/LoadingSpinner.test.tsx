import assert from 'node:assert/strict';
import test from 'node:test';

import { renderToStaticMarkup } from 'react-dom/server';

import LoadingSpinner from './LoadingSpinner';

test('LoadingSpinner wraps unbroken primary and secondary copy on narrow surfaces', () => {
  const inline = renderToStaticMarkup(
    <LoadingSpinner message={'L'.repeat(160)} fullScreen={false} />,
  );
  assert.match(inline, /\[overflow-wrap:anywhere\]/);

  const branded = renderToStaticMarkup(
    <LoadingSpinner
      message={'L'.repeat(160)}
      subMessage={'S'.repeat(220)}
      variant="app"
    />,
  );
  assert.equal(branded.match(/\[overflow-wrap:anywhere\]/g)?.length, 2);
  assert.match(branded, /overflow-x-clip/);
  assert.match(branded, /px-3/);
  assert.match(branded, /sm:px-6/);
  assert.match(branded, /p-6/);
  assert.match(branded, /sm:p-8/);
  assert.match(branded, /break-keep/);
  assert.match(branded, /text-base/);
  assert.match(branded, /sm:text-lg/);
  assert.doesNotMatch(branded, /(?:^|\s)overflow-hidden(?:\s|$)/);
  assert.equal(inline.match(/motion-reduce:animate-none/g)?.length, 1);
  assert.equal(branded.match(/motion-reduce:animate-none/g)?.length, 2);
});
