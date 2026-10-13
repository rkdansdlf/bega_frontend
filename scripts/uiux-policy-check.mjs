#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const normalizeDeclaredVersion = (value) => String(value ?? '').replace(/^[~^]/, '');

const readJson = (root, path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));

const localSources = (rule) => {
  const value = rule?.source?.local;
  return Array.isArray(value) ? value : value ? [value] : [];
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const readText = (root, path) => readFileSync(resolve(root, path), 'utf8');

const extractMarkdownSection = (source, heading) => {
  const start = source.indexOf(heading);
  if (start < 0) return '';
  const nextHeading = source.indexOf('\n## ', start + heading.length);
  return source.slice(start, nextHeading < 0 ? source.length : nextHeading);
};

const collectCssBlocks = (source) => {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = [];
  const stack = [];
  let headerStart = 0;

  for (let index = 0; index < css.length; index += 1) {
    if (css[index] === '{') {
      stack.push({
        header: css.slice(headerStart, index).trim(),
        open: index,
        ancestors: stack.map((block) => block.header),
      });
      headerStart = index + 1;
    } else if (css[index] === '}') {
      const block = stack.pop();
      if (block) {
        blocks.push({
          header: block.header,
          body: css.slice(block.open + 1, index),
          ancestors: block.ancestors,
        });
      }
      headerStart = index + 1;
    }
  }
  return blocks;
};

const captureAll = (source, pattern) => [...source.matchAll(pattern)].map((match) => match[1]);

const collectGuidelineTouchTargetValues = (guidelines) => [
  ...captureAll(guidelines, /Minimum touch target:\s*`?(\d+(?:\.\d+)?)px`?/gi),
  ...captureAll(guidelines, /Auth controls keep\s*`?(\d+(?:\.\d+)?)px`?\s+minimum height/gi),
  ...captureAll(guidelines, /buttons keep\s*`?(\d+(?:\.\d+)?)px\+?`?\s+touch targets/gi),
].map(Number);

const collectGuidelineSemanticTokens = (guidelines) => captureAll(
  extractMarkdownSection(guidelines, '### Semantic Tokens'),
  /`([a-z][a-z0-9-]*)`/g,
);

const collectCssPixelTokenValues = (css, token) => captureAll(
  css,
  new RegExp(`${escapeRegExp(token)}\\s*:\\s*(\\d+(?:\\.\\d+)?)px\\s*;`, 'g'),
).map(Number);

export const findUiUxVendorRuntimeReferences = (sourceRoot) => {
  const references = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory)) {
      const path = resolve(directory, entry);
      const stat = statSync(path);
      if (stat.isDirectory()) {
        visit(path);
      } else if (/\.(?:[cm]?[jt]sx?)$/.test(entry)) {
        const content = readFileSync(path, 'utf8');
        if (/\.agents\/skills\/ui-ux-pro-max|ui-ux-pro-max\/(?:scripts|data|references)\//.test(content)) {
          references.push(path);
        }
      }
    }
  };
  visit(sourceRoot);
  return references;
};

export const collectUiUxPolicyFailures = ({ root = process.cwd(), overrides = {} } = {}) => {
  const failures = [];
  const read = (key, path) => overrides[key] ?? readJson(root, path);

  let lock;
  let profiles;
  let intent;
  let packageJson;
  let skill;
  let stateContract;
  let guidelines;
  let css;
  let appRoutes;
  let sourceSnapshot;
  let decisionLedger;
  try {
    lock = read('lock', 'contracts/ui-ux-pro-max-lock.json');
    profiles = read('profiles', 'contracts/ui-ux-page-profiles-v1.json');
    intent = read('intent', 'contracts/ui-ux-design-intent-v1.json');
    packageJson = readJson(root, 'package.json');
    skill = readJson(root, '.agents/skills/ui-ux-pro-max/skill.json');
    stateContract = readJson(root, 'contracts/visual-qa-component-states-v1.json');
    guidelines = overrides.guidelines ?? readText(root, 'src/guidelines/Guidelines.md');
    css = overrides.css ?? readText(root, 'src/index.css');
    appRoutes = readText(root, 'src/components/AppRoutes.tsx');
    sourceSnapshot = read('sourceSnapshot', 'design-system/bega/source.json');
    decisionLedger = read('ledger', 'contracts/ui-ux-decision-ledger-v1.json');
  } catch (error) {
    return [`Unable to read required UI UX policy files: ${error instanceof Error ? error.message : String(error)}`];
  }

  if (lock.schemaVersion !== 1 || !/^[a-f0-9]{40}$/i.test(lock.commit ?? '')) {
    failures.push('UI UX Pro Max lock must pin schema version 1 and a full 40-character commit.');
  }
  if (!/^[a-f0-9]{64}$/i.test(lock.archiveSha256 ?? '')) {
    failures.push('UI UX Pro Max lock must include the verified archive SHA-256.');
  }
  if (lock.ciSearchEnabled !== false || lock.autoUpdate !== false) {
    failures.push('CI recommendation search and automatic Pro Max updates must remain disabled.');
  }
  if (lock.runtimeImportAllowed !== false) {
    failures.push('The vendored skill must not be allowed into the browser runtime bundle.');
  }
  for (const path of findUiUxVendorRuntimeReferences(resolve(root, 'src'))) {
    failures.push(`Vendored Pro Max code/data must not be imported by browser source: ${path}.`);
  }
  if (skill.version !== lock.snapshotDeclaredVersion || skill.repository !== `https://github.com/${lock.repository}`) {
    failures.push('Vendored UI UX Pro Max metadata does not match the pinned source and declared snapshot version.');
  }
  if (sourceSnapshot.source?.repository !== lock.repository || sourceSnapshot.source?.commit !== lock.commit) {
    failures.push('BEGA recommendation provenance does not match the pinned UI UX Pro Max lock.');
  }

  for (const dependency of ['react', 'tailwindcss', 'vite']) {
    const declared = packageJson.dependencies?.[dependency] ?? packageJson.devDependencies?.[dependency];
    if (normalizeDeclaredVersion(declared) !== lock.projectStack?.[dependency]) {
      failures.push(`Pinned project stack ${dependency} does not match package.json.`);
    }
  }
  const projectReactMajor = Number(String(lock.projectStack?.react ?? '').split('.')[0]);
  const recommendedReactMajor = Number(String(lock.reactRecommendationVersion ?? '').split('.')[0]);
  if (!Number.isFinite(projectReactMajor) || !Number.isFinite(recommendedReactMajor)) {
    failures.push('Project and Pro Max React versions must be pinned before stack applicability can be checked.');
  }
  if (projectReactMajor !== recommendedReactMajor
    && lock.guidanceApplicability?.react !== 'advisory-incompatible') {
    failures.push(`React ${recommendedReactMajor} UI UX Pro Max guidance must remain advisory-incompatible with the React ${lock.projectStack?.react} project.`);
  }

  if (profiles.schemaVersion !== 1 || !Array.isArray(profiles.profiles)) {
    failures.push('UI UX page profile contract must use schema version 1 and include profiles.');
  }
  const profileIds = new Set();
  const stateComponents = new Set((stateContract.components ?? []).map((component) => component.id));
  for (const profile of profiles.profiles ?? []) {
    if (profileIds.has(profile.id)) failures.push(`Duplicate page profile id: ${profile.id}.`);
    profileIds.add(profile.id);
    if (typeof profile.owner !== 'string' || !profile.owner.trim()) {
      failures.push(`Page profile ${profile.id} needs an explicit coverage owner.`);
    }
    if (typeof profile.representativeRoute !== 'string' || !profile.representativeRoute.startsWith('/')) {
      failures.push(`Page profile ${profile.id} needs a representative route beginning with /.`);
    } else if (!new RegExp(`<Route\\s+path="${escapeRegExp(profile.representativeRoute)}"`).test(appRoutes)) {
      failures.push(`Page profile ${profile.id} references missing route ${profile.representativeRoute}.`);
    }
    if (!Array.isArray(profile.match) || profile.match.length === 0) {
      failures.push(`Page profile ${profile.id} needs at least one source matcher.`);
    }
    if (!Array.isArray(profile.representativeComponents) || profile.representativeComponents.length === 0) {
      failures.push(`Page profile ${profile.id} needs a representative Visual QA component.`);
    }
    for (const [name, value] of Object.entries(profile.dials ?? {})) {
      if (!Number.isInteger(value) || value < 1 || value > 10) {
        failures.push(`Page profile ${profile.id} has an invalid ${name} dial.`);
      }
    }
    for (const componentId of profile.representativeComponents ?? []) {
      if (!stateComponents.has(componentId)) {
        failures.push(`Profile ${profile.id} references missing Visual QA component ${componentId}.`);
      }
    }
    if (!overrides.profiles) {
      try {
        if (!readFileSync(resolve(root, profile.file), 'utf8').trim()) {
          failures.push(`Page profile document is missing or empty: ${profile.file}.`);
        }
      } catch {
        failures.push(`Page profile document is missing or empty: ${profile.file}.`);
      }
    }
  }

  if (decisionLedger.schemaVersion !== 1
    || decisionLedger.source?.repository !== lock.repository
    || decisionLedger.source?.commit !== lock.commit
    || !Array.isArray(decisionLedger.decisions)) {
    failures.push('UI UX decision ledger must be schema version 1 and match the pinned source.');
  }
  const sourceSearches = sourceSnapshot.searches ?? [];
  const searchByKey = new Map(sourceSearches.map((search) => [`${search.profile}\u0000${search.query}`, search]));
  const ledgerKeys = new Set();
  const ledgerIds = new Set();
  const requiredRuleIdsInContract = new Set((intent.rules ?? [])
    .filter((rule) => rule.status === 'required')
    .map((rule) => rule.id));
  for (const decision of decisionLedger.decisions ?? []) {
    const key = `${decision.profile}\u0000${decision.query}`;
    if (ledgerIds.has(decision.id)) failures.push(`Duplicate UI UX decision ledger id: ${decision.id}.`);
    if (ledgerKeys.has(key)) failures.push(`Duplicate UI UX decision for ${decision.profile}: ${decision.query}.`);
    ledgerIds.add(decision.id);
    ledgerKeys.add(key);
    const sourceSearch = searchByKey.get(key);
    if (!sourceSearch) {
      failures.push(`UI UX decision ${decision.id} does not match a recorded recommendation query.`);
    } else if (decision.recommendationSummary !== sourceSearch.observed) {
      failures.push(`UI UX decision ${decision.id} recommendation summary does not match captured evidence.`);
    }
    if (!['accepted', 'rejected', 'pending'].includes(decision.decision)) {
      failures.push(`UI UX decision ${decision.id} has an invalid decision status.`);
    }
    if (!decision.reason?.trim()) failures.push(`UI UX decision ${decision.id} needs a rationale.`);
    if (sourceSearch?.decision?.includes('rejected') && decision.decision !== 'rejected') {
      failures.push(`UI UX decision ${decision.id} must preserve the recorded rejection.`);
    }
    if (sourceSearch?.decision?.includes('unadopted') && decision.decision !== 'pending') {
      failures.push(`UI UX decision ${decision.id} must remain pending until BEGA records a decision.`);
    }
    if (decision.decision === 'accepted') {
      if (!Array.isArray(decision.adoptedRuleIds) || decision.adoptedRuleIds.length === 0) {
        failures.push(`Accepted UI UX decision ${decision.id} must name adopted Design Intent rules.`);
      }
      for (const ruleId of decision.adoptedRuleIds ?? []) {
        if (!requiredRuleIdsInContract.has(ruleId)) {
          failures.push(`Accepted UI UX decision ${decision.id} references non-required or missing rule ${ruleId}.`);
        }
      }
    } else if ((decision.adoptedRuleIds ?? []).length > 0) {
      failures.push(`Non-accepted UI UX decision ${decision.id} cannot claim adopted rules.`);
    }
  }
  for (const sourceSearch of sourceSearches) {
    if (!ledgerKeys.has(`${sourceSearch.profile}\u0000${sourceSearch.query}`)) {
      failures.push(`UI UX decision ledger is missing ${sourceSearch.profile} recommendation evidence.`);
    }
  }

  const requiredRuleIds = new Set([
    'interaction.touch-target',
    'interaction.focus-visible',
    'layout.text-scale',
    'motion.reduced',
    'tokens.semantic-colors',
  ]);
  const ruleIds = new Set();
  const rulesById = new Map();
  for (const rule of intent.rules ?? []) {
    if (ruleIds.has(rule.id)) failures.push(`Duplicate Design Intent rule id: ${rule.id}.`);
    ruleIds.add(rule.id);
    rulesById.set(rule.id, rule);
    if (!['required', 'advisory', 'rejected'].includes(rule.status)) {
      failures.push(`Design Intent rule ${rule.id} has an invalid decision status.`);
    }
    for (const path of localSources(rule)) {
      try {
        readFileSync(resolve(root, path), 'utf8');
      } catch {
        failures.push(`Design Intent rule ${rule.id} references missing local provenance ${path}.`);
      }
    }
    if (rule.source?.proMax && !['advisory', 'advisory-incompatible', 'rejected'].includes(rule.source.proMax.disposition)) {
      failures.push(`Pro Max recommendation for ${rule.id} must remain advisory or rejected.`);
    }
  }
  for (const ruleId of requiredRuleIds) {
    const requiredRule = rulesById.get(ruleId);
    if (!requiredRule) failures.push(`Required Design Intent rule is missing: ${ruleId}.`);
    else if (requiredRule.status !== 'required') {
      failures.push(`Required Design Intent rule ${ruleId} must retain required status.`);
    }
  }

  const touchRule = rulesById.get('interaction.touch-target');
  const touchAssertion = touchRule?.assertion ?? {};
  const guidelineTouchValues = collectGuidelineTouchTargetValues(guidelines);
  if (guidelineTouchValues.length < 3) {
    failures.push('Guidelines must declare the shared, authentication, and touch-control minimum target sizes.');
  }
  if (new Set(guidelineTouchValues).size > 1) {
    failures.push(`Guidelines touch-target declarations disagree: ${guidelineTouchValues.join(', ')}px.`);
  }
  if (touchAssertion.token !== '--touch-target-min') {
    failures.push('Design Intent touch-target rule must reference the --touch-target-min CSS token.');
  }
  const cssBlocks = collectCssBlocks(css);
  const baseRootBlocks = cssBlocks.filter((block) => (
    block.header.trim() === ':root'
    && /(?:^|\n)\s*@layer\s+base\s*$/.test(block.ancestors.at(-1)?.trim() ?? '')
  ));
  if (baseRootBlocks.length !== 1) {
    failures.push(`src/index.css must define one base :root token block; found ${baseRootBlocks.length}.`);
  }
  const baseRootCss = baseRootBlocks.map((block) => block.body).join('\n');
  const cssTouchValues = collectCssPixelTokenValues(baseRootCss, touchAssertion.token ?? '--touch-target-min');
  if (cssTouchValues.length !== 1) {
    failures.push(`CSS must define --touch-target-min exactly once; found ${cssTouchValues.length} definitions.`);
  }
  if (new Set(cssTouchValues).size > 1) {
    failures.push(`CSS --touch-target-min definitions disagree: ${cssTouchValues.join(', ')}px.`);
  }
  const touchTokenPattern = /var\(--touch-target-min\)/;
  for (const dimension of ['width', 'height']) {
    const declaration = new RegExp(`min-${dimension}:\\s*${touchTokenPattern.source}`);
    if (!declaration.test(css)) failures.push(`CSS minimum ${dimension} must use --touch-target-min.`);
  }
  const touchContractValues = [touchAssertion.width, touchAssertion.height].map(Number);
  const allTouchValues = [...guidelineTouchValues, ...cssTouchValues, ...touchContractValues];
  if (allTouchValues.some((value) => !Number.isFinite(value)) || new Set(allTouchValues).size > 1) {
    const guidelineValue = guidelineTouchValues.length > 0 ? guidelineTouchValues.join('/') : 'missing';
    const cssValue = cssTouchValues.length > 0 ? cssTouchValues.join('/') : 'missing';
    const contractValue = touchContractValues.map((value) => Number.isFinite(value) ? value : 'missing').join('x');
    failures.push(`Minimum touch target drifts across sources (Guidelines=${guidelineValue}px; CSS=${cssValue}px; Design Intent=${contractValue}px).`);
  }

  const semanticRule = rulesById.get('tokens.semantic-colors');
  const semanticAssertion = semanticRule?.assertion ?? {};
  const guidelineTokens = collectGuidelineSemanticTokens(guidelines).sort();
  const cssTokens = new Set(captureAll(baseRootCss, /--([a-z][a-z0-9-]*)\s*:/g));
  const contractTokens = Array.isArray(semanticAssertion.tokens)
    ? [...semanticAssertion.tokens].sort()
    : [];
  if (semanticAssertion.sourceOfTruth !== 'src/index.css') {
    failures.push('Design Intent semantic tokens must name src/index.css as their authoritative source.');
  }
  if (JSON.stringify(guidelineTokens) !== JSON.stringify(contractTokens)) {
    failures.push('Semantic token names in Guidelines and Design Intent do not match.');
  }
  const missingCssTokens = [...new Set([...guidelineTokens, ...contractTokens])]
    .filter((token) => !cssTokens.has(token));
  if (missingCssTokens.length > 0) {
    failures.push(`Semantic tokens in Guidelines or Design Intent are missing from src/index.css: ${missingCssTokens.join(', ')}.`);
  }

  const textScaleRule = rulesById.get('layout.text-scale');
  const textScaleMatch = guidelines.match(/Text zoom:\s*`?(\d+(?:\.\d+)?)%/i);
  if (!textScaleMatch || textScaleRule?.assertion?.type !== 'reflow') {
    failures.push('Guidelines text zoom and the Design Intent reflow rule must both be declared.');
  } else if (Number(textScaleRule.assertion.scale) !== Number(textScaleMatch[1]) / 100) {
    failures.push(`Text zoom in Guidelines (${textScaleMatch[1]}%) disagrees with the Design Intent reflow scale (${textScaleRule.assertion.scale}).`);
  }
  if (/\btext-size-adjust\s*:\s*none\b/i.test(css)) {
    failures.push('src/index.css disables text resizing and conflicts with the Design Intent reflow rule.');
  }

  const focusRule = rulesById.get('interaction.focus-visible');
  const focusBlocks = cssBlocks.filter((block) => /:focus-visible\b/i.test(block.header));
  const hasVisibleFocusStyle = focusBlocks.some((block) => (
    /(?:outline|box-shadow)\s*:\s*(?!none\b|0(?:px)?\s*(?:;|$))/i.test(block.body)
  ));
  if (focusRule?.assertion?.type !== 'visible-focus'
    || !/focus ring must be visible on keyboard navigation/i.test(guidelines)
    || !/use `?focus-visible`?/i.test(guidelines)
    || !hasVisibleFocusStyle) {
    failures.push('Visible keyboard focus must agree across Guidelines, the CSS focus-visible style, and Design Intent.');
  }

  const reducedMotionRule = rulesById.get('motion.reduced');
  const reducedMotionBlocks = cssBlocks.filter((block) => (
    /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/i.test(block.header)
  ));
  const hasReducedMotionOverride = reducedMotionBlocks.some((block) => (
    /(?:animation|transition|scroll-behavior)\s*:\s*(?:none|auto)\b/i.test(block.body)
  ));
  if (reducedMotionRule?.assertion?.type !== 'reduced-motion'
    || !/prefers-reduced-motion/i.test(guidelines)
    || !/reduced-motion fallback/i.test(guidelines)
    || !hasReducedMotionOverride) {
    failures.push('Reduced-motion support must agree across Guidelines, CSS media rules, and Design Intent.');
  }

  const authorityOrder = intent.authorityOrder ?? [];
  const guidelinesIndex = authorityOrder.indexOf('src/guidelines/Guidelines.md');
  const cssIndex = authorityOrder.indexOf('src/index.css');
  const contractIndex = authorityOrder.findIndex((source) => source.includes('this contract'));
  const proMaxIndex = authorityOrder.findIndex((source) => source.includes('pinned UI UX Pro Max'));
  if (guidelinesIndex < 0 || cssIndex < 0 || contractIndex < 0 || proMaxIndex < 0
    || guidelinesIndex > contractIndex || cssIndex > contractIndex || contractIndex > proMaxIndex) {
    failures.push('BEGA Guidelines and CSS must remain authoritative ahead of the Design Intent mirror and Pro Max recommendations.');
  }

  return failures;
};

const main = () => {
  const root = process.cwd();
  const failures = collectUiUxPolicyFailures({ root });
  if (failures.length > 0) {
    failures.forEach((failure) => console.error(`[uiux-policy] ${failure}`));
    process.exitCode = 1;
    return;
  }
  console.log('[uiux-policy] pinned source, profile map, drift guard, React guard, and runtime boundary passed');
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
