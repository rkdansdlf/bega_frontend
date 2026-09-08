import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveViewportDeferredIntersectionMode } from './harnessBrowserState';

test('viewport-deferred phases map to deterministic IntersectionObserver modes', () => {
  assert.equal(resolveViewportDeferredIntersectionMode({
    kind: 'component-state',
    adapterId: 'viewport-deferred',
    variants: { phase: 'fallback' },
  }), 'non-intersecting');
  assert.equal(resolveViewportDeferredIntersectionMode({
    kind: 'component-state',
    adapterId: 'viewport-deferred',
    variants: { phase: 'content' },
  }), 'intersecting');
  assert.equal(resolveViewportDeferredIntersectionMode({
    kind: 'component-state',
    adapterId: 'loading.spinner',
    variants: { phase: 'fallback' },
  }), null);
  assert.throws(() => resolveViewportDeferredIntersectionMode({
    kind: 'component-state',
    adapterId: 'viewport-deferred',
    variants: { phase: 'unknown' },
  }), /unsupported ViewportDeferred phase/);
});
