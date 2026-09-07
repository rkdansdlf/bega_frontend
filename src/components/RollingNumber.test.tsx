import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import RollingNumber from './RollingNumber';

const renderRollingNumber = (props: Record<string, unknown>) => renderToStaticMarkup(
  createElement(
    RollingNumber as unknown as ComponentType<Record<string, unknown>>,
    props,
  ),
);

test('RollingNumber renders a scalable, stable numeric surface', () => {
  const html = renderRollingNumber({ value: Number.MAX_SAFE_INTEGER });

  assert.match(html, /data-testid="rolling-number"/);
  assert.match(html, /data-rolling-transitioning="false"/);
  assert.match(html, /min-h-\[1\.5em\]/);
  assert.match(html, /min-w-\[1\.125em\]/);
  assert.match(html, /break-all/);
  assert.match(html, /tabular-nums/);
  assert.match(html, />9007199254740991<\/span>/);
  assert.doesNotMatch(html, /data-testid="rolling-number-previous"/);
});

test('RollingNumber exposes a deterministic midpoint for increase and decrease previews', () => {
  const increase = renderRollingNumber({
    value: 100,
    transitionPreview: { from: 99, progress: 0.5 },
  });
  assert.match(increase, /data-rolling-direction="up"/);
  assert.match(increase, /data-rolling-transitioning="true"/);
  assert.match(increase, /data-testid="rolling-number-width-sizer"/);
  assert.match(increase, /data-testid="rolling-number-previous"/);
  assert.match(increase, /aria-hidden="true"/);
  assert.match(increase, /motion-reduce:hidden/);
  assert.match(increase, /motion-reduce:animate-none/);
  assert.match(increase, /transform:translateY\(-6px\);opacity:0\.5/);
  assert.match(increase, /transform:translateY\(6px\);opacity:0\.5/);

  const decrease = renderRollingNumber({
    value: 99,
    transitionPreview: { from: 100, progress: 0.5 },
  });
  assert.match(decrease, /data-rolling-direction="down"/);
  assert.match(decrease, /transform:translateY\(6px\);opacity:0\.5/);
  assert.match(decrease, /transform:translateY\(-6px\);opacity:0\.5/);
  assert.match(decrease, /data-testid="rolling-number-width-sizer"[^>]*>100<\/span>/);
});
