import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveDesignIntentImpact } from './uiux-impact.mjs';

test('shared tokens and shared contracts fan out to every design profile', () => {
  assert.deepEqual(resolveDesignIntentImpact([
    'bega_frontend/src/index.css',
    'bega_frontend/contracts/ui-ux-design-intent-v1.json',
  ]), {
    changed: true,
    profiles: ['admin', 'auth', 'home', 'landing', 'mate', 'mypage', 'prediction', 'stadium'],
  });
});

test('page implementation and page profile changes stay scoped', () => {
  assert.deepEqual(resolveDesignIntentImpact([
    'src/components/MateFilterBottomSheet.tsx',
    'design-system/bega/pages/mate.md',
  ]), { changed: true, profiles: ['mate'] });
});

test('a page profile document change selects its own profile', () => {
  assert.deepEqual(resolveDesignIntentImpact(['design-system/bega/pages/stadium.md']), {
    changed: true,
    profiles: ['stadium'],
  });
});

test('unrelated and backend paths do not select design-intent browser work', () => {
  assert.deepEqual(resolveDesignIntentImpact([
    'bega_backend/BEGA_PROJECT/README.md',
    'bega_frontend/src/api/auth.ts',
  ]), { changed: false, profiles: [] });
});
