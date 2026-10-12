import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  collectUiUxPolicyFailures,
  findUiUxVendorRuntimeReferences,
} from './uiux-policy-check.mjs';

const readPolicySource = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

const cloneIntentContract = () => JSON.parse(readPolicySource('../contracts/ui-ux-design-intent-v1.json'));
const cloneDecisionLedger = () => JSON.parse(readPolicySource('../contracts/ui-ux-decision-ledger-v1.json'));

const findRule = (intent, id) => intent.rules.find((rule) => rule.id === id);

test('checked-in UI UX contracts satisfy the policy', () => {
  assert.deepEqual(collectUiUxPolicyFailures({ root: process.cwd() }), []);
  assert.deepEqual(findUiUxVendorRuntimeReferences(`${process.cwd()}/src`), []);
});

test('policy treats a scoped :root override as distinct from the base token block', () => {
  const css = readPolicySource('../src/index.css');
  const failures = collectUiUxPolicyFailures({
    root: process.cwd(),
    overrides: {
      css: `${css}\n@media (orientation: landscape) and (max-height: 430px) { :root { --mobile-chrome-height: 44px; } }`,
    },
  });

  assert.deepEqual(failures, []);
});

test('policy rejects React 19 guidance as normative for the React 18 project', () => {
  const failures = collectUiUxPolicyFailures({
    root: process.cwd(),
    overrides: {
      lock: {
        projectStack: { react: '18.3.1' },
        reactRecommendationVersion: '19.2.x',
        guidanceApplicability: { react: 'adopted' },
      },
    },
  });
  assert.ok(failures.some((failure) => failure.includes('React 19')));
});

test('policy requires local provenance and a resolvable representative component per profile', () => {
  const failures = collectUiUxPolicyFailures({
    root: process.cwd(),
    overrides: {
      intent: { rules: [{
        id: 'broken.rule',
        status: 'required',
        source: { local: ['missing/Guidelines.md'] },
      }] },
      profiles: { profiles: [{
        id: 'broken',
        representativeComponents: ['src/components/Missing.tsx#Missing'],
      }] },
    },
  });
  assert.ok(failures.some((failure) => failure.includes('missing/Guidelines.md')));
  assert.ok(failures.some((failure) => failure.includes('Missing.tsx#Missing')));
});

test('policy fails when the minimum touch target drifts in Guidelines, CSS, or Design Intent', () => {
  const guidelines = readPolicySource('../src/guidelines/Guidelines.md');
  const css = readPolicySource('../src/index.css');
  for (const changedValue of [40, 32]) {
    const changedIntent = cloneIntentContract();
    findRule(changedIntent, 'interaction.touch-target').assertion.width = changedValue;
    findRule(changedIntent, 'interaction.touch-target').assertion.height = changedValue;
    const driftCases = [
      {
        source: 'Guidelines.md',
        overrides: { guidelines: guidelines.replace('Minimum touch target: `44px`', `Minimum touch target: \`${changedValue}px\``) },
      },
      {
        source: 'index.css',
        overrides: { css: css.replace('--touch-target-min: 44px;', `--touch-target-min: ${changedValue}px;`) },
      },
      { source: 'Design Intent', overrides: { intent: changedIntent } },
    ];

    for (const driftCase of driftCases) {
      const failures = collectUiUxPolicyFailures({ root: process.cwd(), overrides: driftCase.overrides });
      assert.ok(
        failures.some((failure) => /touch target/i.test(failure)),
        `${driftCase.source} ${changedValue}px drift should fail the policy check`,
      );
    }
  }
});

test('policy keeps semantic token names aligned across Guidelines, CSS, and Design Intent', () => {
  const guidelines = readPolicySource('../src/guidelines/Guidelines.md');
  const css = readPolicySource('../src/index.css');
  const changedIntent = cloneIntentContract();
  const semanticRule = findRule(changedIntent, 'tokens.semantic-colors');
  semanticRule.assertion.tokens = semanticRule.assertion.tokens.filter((token) => token !== 'surface-default');

  const driftCases = [
    {
      source: 'Guidelines.md',
      overrides: { guidelines: guidelines.replace('`surface-default`', '`surface-default-changed`') },
    },
    {
      source: 'index.css',
      overrides: { css: css.replace('--surface-default: var(--primitive-color-neutral-0);', '--surface-default-changed: var(--primitive-color-neutral-0);') },
    },
    { source: 'Design Intent', overrides: { intent: changedIntent } },
  ];

  for (const driftCase of driftCases) {
    const failures = collectUiUxPolicyFailures({ root: process.cwd(), overrides: driftCase.overrides });
    assert.ok(
      failures.some((failure) => /semantic token/i.test(failure)),
      `${driftCase.source} drift should fail the policy check`,
    );
  }
});

test('policy keeps text scaling, visible focus, and reduced-motion rules connected to source evidence', () => {
  const guidelines = readPolicySource('../src/guidelines/Guidelines.md');
  const css = readPolicySource('../src/index.css');
  const changedTextScale = guidelines.replace('Text zoom: `200%`', 'Text zoom: `150%`');
  const hiddenFocusRing = css.replaceAll(':focus-visible', ':focus');
  const ignoredReducedMotion = css.replaceAll('prefers-reduced-motion: reduce', 'prefers-reduced-motion: no-preference');
  const changedIntent = cloneIntentContract();
  findRule(changedIntent, 'layout.text-scale').assertion.scale = 1.5;
  findRule(changedIntent, 'interaction.focus-visible').assertion.type = 'hover-focus';
  findRule(changedIntent, 'motion.reduced').assertion.type = 'motion-allowed';

  const driftCases = [
    { source: 'Guidelines.md text scaling', overrides: { guidelines: changedTextScale } },
    { source: 'CSS visible focus', overrides: { css: hiddenFocusRing } },
    { source: 'CSS reduced motion', overrides: { css: ignoredReducedMotion } },
    { source: 'Design Intent accessibility assertions', overrides: { intent: changedIntent } },
  ];

  for (const driftCase of driftCases) {
    const failures = collectUiUxPolicyFailures({ root: process.cwd(), overrides: driftCase.overrides });
    assert.ok(failures.length > 0, `${driftCase.source} drift should fail the policy check`);
  }
});

test('BEGA Guidelines and CSS remain authoritative ahead of the machine mirror and Pro Max', () => {
  const failures = collectUiUxPolicyFailures({ root: process.cwd() });
  assert.deepEqual(failures, []);
});

test('policy rejects an authority order that promotes the machine mirror over BEGA sources', () => {
  const changedIntent = cloneIntentContract();
  changedIntent.authorityOrder = [
    'this contract (machine-checked mirror; drift fails CI)',
    'src/guidelines/Guidelines.md',
    'src/index.css',
    'pinned UI UX Pro Max recommendations',
  ];
  const failures = collectUiUxPolicyFailures({ root: process.cwd(), overrides: { intent: changedIntent } });
  assert.ok(failures.some((failure) => failure.includes('must remain authoritative')));
});

test('policy rejects downgrading a required Design Intent rule', () => {
  const changedIntent = cloneIntentContract();
  findRule(changedIntent, 'interaction.touch-target').status = 'advisory';
  const failures = collectUiUxPolicyFailures({ root: process.cwd(), overrides: { intent: changedIntent } });
  assert.ok(failures.some((failure) => failure.includes('interaction.touch-target must retain required status')));
});

test('decision ledger requires valid decisions, complete evidence, and adopted required rules', () => {
  const ledger = cloneDecisionLedger();
  const sourceSnapshot = JSON.parse(readPolicySource('../design-system/bega/source.json'));
  const baselineDecision = ledger.decisions[0];
  const cases = [
    {
      label: 'invalid status',
      mutate: (decision) => { decision.decision = 'maybe'; },
      expected: /invalid decision status/,
    },
    {
      label: 'missing rationale',
      mutate: (decision) => { decision.reason = ''; },
      expected: /needs a rationale/,
    },
    {
      label: 'accepted decision without adopted rules',
      mutate: (decision) => { decision.decision = 'accepted'; decision.adoptedRuleIds = []; },
      expected: /must name adopted Design Intent rules/,
    },
    {
      label: 'accepted decision with an unrequired rule',
      mutate: (decision) => { decision.decision = 'accepted'; decision.adoptedRuleIds = ['framework.react-stack-guidance']; },
      expected: /non-required or missing rule/,
    },
  ];

  for (const mutation of cases) {
    const changed = structuredClone(ledger);
    mutation.mutate(changed.decisions[0]);
    const failures = collectUiUxPolicyFailures({
      root: process.cwd(),
      overrides: { ledger: changed, sourceSnapshot },
    });
    assert.ok(failures.some((failure) => mutation.expected.test(failure)), `${mutation.label} should fail`);
  }

  const missingEvidence = structuredClone(ledger);
  missingEvidence.decisions = missingEvidence.decisions.slice(1);
  const missingFailures = collectUiUxPolicyFailures({
    root: process.cwd(),
    overrides: { ledger: missingEvidence, sourceSnapshot },
  });
  assert.ok(missingFailures.some((failure) => failure.includes('missing bega recommendation evidence')));

  const changedSource = structuredClone(sourceSnapshot);
  changedSource.searches[0].observed = 'changed without ledger review';
  const evidenceFailures = collectUiUxPolicyFailures({
    root: process.cwd(),
    overrides: { ledger, sourceSnapshot: changedSource },
  });
  assert.ok(evidenceFailures.some((failure) => failure.includes('summary does not match captured evidence')));
  assert.equal(baselineDecision.decision, 'pending');
});
