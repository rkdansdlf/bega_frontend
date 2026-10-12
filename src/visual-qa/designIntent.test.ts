import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveDesignIntent } from './designIntent';

test('resolves page-specific intent for a component-state scenario', () => {
  const intent = resolveDesignIntent('src/components/MateChatComposerPanel.tsx#MateChatComposerPanel');
  assert.equal(intent.profileId, 'mate');
  assert.ok(intent.ruleIds.includes('interaction.touch-target'));
  assert.ok(intent.ruleIds.includes('interaction.focus-visible'));
});

test('uses the BEGA master profile for shared UI components', () => {
  const intent = resolveDesignIntent('src/components/ui/button.tsx#Button');
  assert.equal(intent.profileId, 'bega');
});

test('keeps framework-specific React guidance advisory when the project is React 18', () => {
  const intent = resolveDesignIntent('src/components/Login.tsx#Login');
  assert.deepEqual(intent.stackGuidance, {
    reactProjectVersion: '18.3.1',
    reactRecommendationVersion: '19.2.x',
    applicability: 'advisory-incompatible',
  });
});
