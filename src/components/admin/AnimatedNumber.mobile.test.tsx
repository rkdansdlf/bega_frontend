import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { AnimatedNumber } from './AnimatedNumber';

test('animated number renders a settled zero-duration maximum deterministically', () => {
  const markup = renderToStaticMarkup(
    <AnimatedNumber
      duration={0}
      testId="animated-number-under-test"
      value={Number.MAX_SAFE_INTEGER}
    />,
  );

  assert.match(markup, /data-testid="animated-number-under-test"/);
  assert.match(markup, /9,007,199,254,740,991/);
  assert.match(markup, /max-w-full/);
  assert.match(markup, /overflow-wrap:anywhere/);
  assert.doesNotMatch(markup, /NaN|Infinity/);
});

test('animated number exposes deterministic non-production frames and normalizes invalid values', () => {
  const midpointMarkup = renderToStaticMarkup(
    <AnimatedNumber value={1_000} visualQaDisplayValueOverride={937} />,
  );
  const invalidMarkup = renderToStaticMarkup(
    <AnimatedNumber duration={0} value={Number.POSITIVE_INFINITY} />,
  );
  const initialMarkup = renderToStaticMarkup(
    <AnimatedNumber duration={1_000} value={1_000} />,
  );

  assert.match(midpointMarkup, />937</);
  assert.match(invalidMarkup, />0</);
  assert.match(initialMarkup, />0</);
  assert.doesNotMatch(invalidMarkup, /Infinity|NaN/);
});
