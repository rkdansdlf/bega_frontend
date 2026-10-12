#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import pageProfileContract from '../contracts/ui-ux-page-profiles-v1.json' with { type: 'json' };
import designIntentContract from '../contracts/ui-ux-design-intent-v1.json' with { type: 'json' };
import proMaxLock from '../contracts/ui-ux-pro-max-lock.json' with { type: 'json' };
import { resolveDesignIntent } from '../src/visual-qa/designIntent.ts';
import { AUTOMATIC_COMPONENT_STATE_SCENARIOS } from '../src/visual-qa/harnessCatalog.ts';

const normalizeScenarioInteraction = (scenario) => scenario.states?.interactions ?? 'default';

const scenarioQuality = (scenario) => {
  const states = scenario.states ?? {};
  const preferredData = new Set(['single', 'populated', 'ready', 'empty', 'pass', 'prompt']);
  let score = 0;
  if (states.system && !['online', 'idle'].includes(states.system)) score += 20;
  if (states.data && !preferredData.has(states.data)) score += 10;
  if (scenario.variants?.theme === 'dark') score += 2;
  if (states.permissions === 'anonymous') score += 1;
  return score;
};

const selectScenario = (scenarios, componentId, interaction) => scenarios
  .filter((scenario) => scenario.componentId === componentId
    && normalizeScenarioInteraction(scenario) === interaction)
  .sort((left, right) => scenarioQuality(left) - scenarioQuality(right)
    || left.id.localeCompare(right.id))[0];

export const buildDesignIntentPlan = ({ profiles, scenarios = AUTOMATIC_COMPONENT_STATE_SCENARIOS }) => {
  const requestedProfiles = [...new Set(profiles)].sort();
  const unknownProfiles = requestedProfiles.filter((profileId) => (
    !pageProfileContract.profiles.some((profile) => profile.id === profileId)
  ));
  if (unknownProfiles.length > 0) throw new Error(`Unknown UI UX profiles: ${unknownProfiles.join(', ')}`);

  const selectedById = new Map();
  for (const profileId of requestedProfiles) {
    const profile = pageProfileContract.profiles.find((candidate) => candidate.id === profileId);
    const representativeId = profile.representativeComponents
      .find((componentId) => scenarios.some((scenario) => scenario.componentId === componentId));
    const representative = representativeId
      ? selectScenario(scenarios, representativeId, 'default')
      : undefined;
    if (!representative) {
      throw new Error(`Profile ${profileId} has no registered Visual QA representative component.`);
    }
    const defaultScenario = representative;
    const focusScenario = selectScenario(scenarios, representative.componentId, 'focus-visible')
      ?? scenarios.filter((scenario) => (
        normalizeScenarioInteraction(scenario) === 'focus-visible'
        && resolveDesignIntent(scenario.componentId).profileId === profileId
      )).sort((left, right) => scenarioQuality(left) - scenarioQuality(right)
        || left.id.localeCompare(right.id))[0];
    if (!focusScenario) {
      throw new Error(`Profile ${profileId} has no registered focus-visible Visual QA scenario.`);
    }
    [defaultScenario, focusScenario].forEach((scenario) => selectedById.set(scenario.id, scenario));
  }

  const selectedScenarios = [...selectedById.values()].map((scenario) => {
    const intent = resolveDesignIntent(scenario.componentId);
    const profile = pageProfileContract.profiles.find((candidate) => candidate.id === intent.profileId);
    return {
      id: scenario.id,
      componentId: scenario.componentId,
      profileId: intent.profileId,
      owner: profile?.owner ?? 'unassigned',
      representativeRoute: profile?.representativeRoute ?? null,
      ruleIds: intent.ruleIds,
      interaction: normalizeScenarioInteraction(scenario),
      hasInteractionPlan: Boolean(scenario.interactionPlan),
    };
  }).sort((left, right) => left.id.localeCompare(right.id));

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: { repository: proMaxLock.repository, commit: proMaxLock.commit },
    intentContractId: designIntentContract.contractId,
    profiles: requestedProfiles,
    scenarios: selectedScenarios,
  };
};

export const buildDesignIntentAudit = ({ profiles, scenarios, harnessReport, generatedAt = new Date().toISOString() }) => {
  const harnessResults = new Map((harnessReport?.results ?? []).map((result) => [result.scenarioId, result]));
  const failures = [];
  const results = scenarios.map((scenario) => {
    const harnessResult = harnessResults.get(scenario.id);
    const intent = resolveDesignIntent(scenario.componentId);
    const profile = pageProfileContract.profiles.find((candidate) => candidate.id === intent.profileId);
    if (!harnessResult) failures.push(`${scenario.id}: no matching harness result`);
    if (intent.profileId !== scenario.profileId) {
      failures.push(`${scenario.id}: expected profile ${scenario.profileId}, resolved ${intent.profileId}`);
    }
    if (harnessResult?.status !== 'pass') {
      failures.push(`${scenario.id}: harness status ${harnessResult?.status ?? 'missing'}`);
    }
    if (harnessResult?.designIntent?.profileId !== intent.profileId) {
      failures.push(`${scenario.id}: rendered Design Intent profile does not match ${intent.profileId}`);
    }
    if (harnessResult?.designIntent?.ruleIds?.join(',') !== intent.ruleIds.join(',')) {
      failures.push(`${scenario.id}: rendered Design Intent rule ids do not match the local contract`);
    }
    const focusVisibleVerified = scenario.interaction === 'focus-visible'
      && scenario.hasInteractionPlan === true
      && harnessResult?.interaction?.action === 'focus-visible'
      && harnessResult.interaction.verified === true;
    if (scenario.interaction === 'focus-visible' && !focusVisibleVerified) {
      failures.push(`${scenario.id}: keyboard focus-visible interaction was not verified`);
    }
    const markedTargetCount = harnessResult?.touchTargetChecks?.markedTargetCount;
    return {
      scenarioId: scenario.id,
      componentId: scenario.componentId,
      profileId: intent.profileId,
      owner: profile?.owner ?? 'unassigned',
      representativeRoute: profile?.representativeRoute ?? null,
      ruleIds: intent.ruleIds,
      interaction: scenario.interaction,
      status: harnessResult?.status ?? 'missing',
      checks: {
        focusVisible: focusVisibleVerified ? 'keyboard-focus-visible-verified' : 'not-run',
        touchTargets: Number.isInteger(markedTargetCount) && markedTargetCount > 0
          ? `measured-${markedTargetCount}-marked-targets`
          : 'no-marked-targets-in-scenario',
        textScale: 'delegated-to-existing-visual-qa-gates',
        reducedMotion: 'delegated-to-existing-route-specific-gates',
        semanticTokens: 'local-token-authority-review',
        reactStack: 'uiux-policy-check',
      },
      screenshot: harnessResult?.screenshot ?? null,
      error: harnessResult?.error ?? null,
    };
  });
  if (harnessReport?.summary?.ok !== true) failures.push('Visual QA harness report summary is not passing.');
  const summary = {
    ok: failures.length === 0,
    planned: scenarios.length,
    passed: results.filter((result) => result.status === 'pass').length,
    failed: failures.length,
    profiles: profiles.length,
  };
  return {
    schemaVersion: 1,
    generatedAt,
    source: { repository: proMaxLock.repository, commit: proMaxLock.commit },
    intentContractId: designIntentContract.contractId,
    profiles,
    summary,
    failures,
    coverageLimitations: [
      'Touch target measurements cover only elements marked with data-vqa-min-touch.',
      'Text-scale and reduced-motion assertions are delegated to the existing Visual QA gates; this representative harness run does not claim full matrix coverage.',
      'Visual QA coverage contract implementation.fullGuaranteeActive remains the source for overall matrix completion status.',
    ],
    blockingFindings: failures,
    advisoryFindings: [
      `React ${proMaxLock.reactRecommendationVersion} Pro Max guidance is advisory-incompatible with BEGA React ${proMaxLock.projectStack.react}.`,
      'Pinned Pro Max recommendations do not alter BEGA rules without an explicit reviewed contract change.',
      ...[
        'Touch target measurements cover only elements marked with data-vqa-min-touch.',
        'Text-scale and reduced-motion assertions use the existing Visual QA gates; this representative audit does not claim full matrix coverage.',
      ],
    ],
    results,
  };
};

export const renderDesignIntentMarkdown = (audit) => {
  const lines = [
    '# UI UX Design Intent Audit',
    '',
    `- Result: **${audit.summary.ok ? 'PASS' : 'FAIL'}**`,
    `- Profiles: ${audit.profiles.join(', ') || 'none'}`,
    `- Harness scenarios: ${audit.summary.passed}/${audit.summary.planned} passed`,
    `- Pinned source: ${audit.source.repository}@${audit.source.commit}`,
    '',
    '| Profile | Owner | Route | Component | Interaction | Result | Focus evidence | Touch evidence | Screenshot |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...audit.results.map((result) => (
      `| ${result.profileId} | ${result.owner} | ${result.representativeRoute ?? '-'} | ${result.componentId} | ${result.interaction} | ${result.status} | ${result.checks.focusVisible} | ${result.checks.touchTargets} | ${result.screenshot ?? '-'} |`
    )),
    '',
    '## Coverage notes',
    '',
    ...audit.coverageLimitations.map((limitation) => `- ${limitation}`),
  ];
  if (audit.failures.length > 0) lines.push('', '## Failures', '', ...audit.failures.map((failure) => `- ${failure}`));
  lines.push('', 'Pro Max guidance is advisory. BEGA Design Intent and local Guidelines remain authoritative.', '');
  return lines.join('\n');
};

export const renderDesignIntentSummary = (audit, upgradeReview = null) => {
  const blockingFindings = audit.blockingFindings ?? audit.failures ?? [];
  const advisoryFindings = audit.advisoryFindings ?? audit.coverageLimitations ?? [];
  const recommendationChanges = upgradeReview?.summary?.recommendationChanges;
  const lines = [
    '### UI UX Design Intent',
    '',
    `- Result: **${audit.summary.ok ? 'PASS' : 'FAIL'}**`,
    `- Changed profiles: ${audit.profiles.join(', ') || 'none'}`,
    `- Executed scenarios: ${audit.summary.passed}/${audit.summary.planned} passed (${audit.results.map((result) => result.scenarioId).join(', ') || 'none'})`,
    `- Blocking findings: ${blockingFindings.length}`,
    ...(blockingFindings.length > 0 ? blockingFindings.slice(0, 5).map((finding) => `  - ${finding}`) : ['  - None']),
    `- Advisory findings: ${advisoryFindings.length}`,
    ...advisoryFindings.slice(0, 3).map((finding) => `  - ${finding}`),
    `- Pro Max recommendation changes: ${recommendationChanges
      ? `${recommendationChanges.added} added, ${recommendationChanges.removed} removed, ${recommendationChanges.changed} changed`
      : 'no snapshot comparison attached to this run'}`,
  ];
  if (blockingFindings.length > 5) lines.push(`  - ${blockingFindings.length - 5} additional blocking finding(s) are in the JSON artifact.`);
  if (advisoryFindings.length > 3) lines.push(`  - ${advisoryFindings.length - 3} additional advisory finding(s) are in the JSON artifact.`);
  return `${lines.join('\n')}\n`;
};

const readArg = (name, fallback) => {
  const prefix = `--${name}=`;
  const value = process.argv.find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
};

const writeJson = async (path, value) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const main = async () => {
  if (process.argv.includes('--plan')) {
    const profiles = readArg('profiles', '').split(',').map((value) => value.trim()).filter(Boolean);
    if (profiles.length === 0) throw new Error('--profiles must list at least one page profile');
    const plan = buildDesignIntentPlan({ profiles });
    const output = resolve(process.cwd(), readArg('output', 'reports/ui-ux-design-intent-plan.json'));
    await writeJson(output, plan);
    console.log(`[uiux:design-intent] plan=${output} profiles=${plan.profiles.join(',')} scenarios=${plan.scenarios.length}`);
    return;
  }
  if (process.argv.includes('--summary')) {
    const auditPath = resolve(process.cwd(), readArg('audit', 'reports/ui-ux-design-intent-audit.json'));
    const upgradePath = resolve(process.cwd(), readArg('upgrade-review', 'reports/ui-ux-pro-max-upgrade-review.json'));
    const audit = JSON.parse(await readFile(auditPath, 'utf8'));
    let upgradeReview = null;
    try {
      upgradeReview = JSON.parse(await readFile(upgradePath, 'utf8'));
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    process.stdout.write(renderDesignIntentSummary(audit, upgradeReview));
    return;
  }
  if (process.argv.includes('--finalize')) {
    const planPath = resolve(process.cwd(), readArg('plan-file', 'reports/ui-ux-design-intent-plan.json'));
    const harnessPath = resolve(process.cwd(), readArg('harness-report', 'reports/ui-ux-design-intent-harness.json'));
    const jsonPath = resolve(process.cwd(), readArg('json', 'reports/ui-ux-design-intent-audit.json'));
    const markdownPath = resolve(process.cwd(), readArg('markdown', 'reports/ui-ux-design-intent-audit.md'));
    const plan = JSON.parse(await readFile(planPath, 'utf8'));
    const harnessReport = JSON.parse(await readFile(harnessPath, 'utf8'));
    const audit = buildDesignIntentAudit({
      profiles: plan.profiles,
      scenarios: plan.scenarios,
      harnessReport,
    });
    await writeJson(jsonPath, audit);
    await mkdir(dirname(markdownPath), { recursive: true });
    await writeFile(markdownPath, renderDesignIntentMarkdown(audit), 'utf8');
    console.log(`[uiux:design-intent] ${audit.summary.ok ? 'PASS' : 'FAIL'} ${audit.summary.passed}/${audit.summary.planned} scenarios · report=${jsonPath}`);
    if (!audit.summary.ok) process.exitCode = 1;
    return;
  }
  throw new Error('Use --plan or --finalize.');
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(`[uiux:design-intent] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
