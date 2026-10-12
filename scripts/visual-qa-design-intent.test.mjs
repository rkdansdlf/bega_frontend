import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDesignIntentAudit,
  renderDesignIntentMarkdown,
  renderDesignIntentSummary,
} from './visual-qa-design-intent.mjs';

test('audit binds selected harness evidence to profile rules and preserves screenshot evidence', () => {
  const audit = buildDesignIntentAudit({
    profiles: ['mate'],
    scenarios: [{
      id: 'state:src/components/MateChatComposerPanel.tsx#MateChatComposerPanel:interactions=focus-visible',
      componentId: 'src/components/MateChatComposerPanel.tsx#MateChatComposerPanel',
      profileId: 'mate',
      interaction: 'focus-visible',
      states: { interactions: 'focus-visible' },
      hasInteractionPlan: true,
    }],
    harnessReport: {
      summary: { ok: true, passed: 1, failed: 0, total: 1 },
      results: [{
        scenarioId: 'state:src/components/MateChatComposerPanel.tsx#MateChatComposerPanel:interactions=focus-visible',
        componentId: 'src/components/MateChatComposerPanel.tsx#MateChatComposerPanel',
        status: 'pass',
        screenshot: 'reports/screenshots/mate-focus.png',
        designIntent: {
          profileId: 'mate',
          ruleIds: [
            'interaction.touch-target',
            'interaction.focus-visible',
            'layout.text-scale',
            'motion.reduced',
            'tokens.semantic-colors',
            'framework.react-stack-guidance',
          ],
        },
        touchTargetChecks: { markedTargetCount: 1 },
        interaction: { action: 'focus-visible', verified: true },
      }],
    },
  });

  assert.equal(audit.summary.ok, true);
  assert.equal(audit.results[0].profileId, 'mate');
  assert.equal(audit.results[0].owner, 'frontend-ui');
  assert.equal(audit.results[0].representativeRoute, '/mate');
  assert.ok(audit.results[0].ruleIds.includes('interaction.focus-visible'));
  assert.equal(audit.results[0].checks.focusVisible, 'keyboard-focus-visible-verified');
  assert.equal(audit.results[0].checks.touchTargets, 'measured-1-marked-targets');
  assert.equal(audit.results[0].screenshot, 'reports/screenshots/mate-focus.png');
  assert.match(renderDesignIntentMarkdown(audit), /frontend-ui \| \/mate \|/);
  assert.match(renderDesignIntentMarkdown(audit), /mate-focus\.png/);
  const summary = renderDesignIntentSummary(audit, {
    summary: { recommendationChanges: { added: 2, removed: 1, changed: 3 } },
  });
  assert.match(summary, /Changed profiles: mate/);
  assert.match(summary, /Executed scenarios: 1\/1 passed/);
  assert.match(summary, /Blocking findings: 0/);
  assert.match(summary, /Advisory findings:/);
  assert.match(summary, /2 added, 1 removed, 3 changed/);
});

test('audit fails when a selected profile has no harness result', () => {
  const audit = buildDesignIntentAudit({
    profiles: ['auth'],
    scenarios: [{ id: 'state:auth', componentId: 'src/components/Login.tsx#Login' }],
    harnessReport: { summary: { ok: false, passed: 0, failed: 0, total: 0 }, results: [] },
  });

  assert.equal(audit.summary.ok, false);
  assert.ok(audit.failures.some((failure) => failure.includes('no matching harness result')));
});
