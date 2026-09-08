import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COVERAGE_CONTRACT_PATH,
  loadCoverageContract,
  validateCoverageContract,
} from './visual-qa-coverage-contract.mjs';

const validContract = () => ({
  schemaVersion: 1,
  id: 'bega-visual-qa-supported-ui-v1',
  guarantee: {
    scope: 'all-declared-valid-combinations',
    unknownPolicy: 'fail',
  },
  sourceScope: {
    roots: ['src/components', 'src/pages'],
    extensions: ['.tsx'],
    classifications: ['visual', 'behavior-only', 'grouped-gallery', 'nonvisual', 'excluded'],
    unclassifiedPolicy: 'fail',
  },
  environmentCatalog: {
    browsers: [
      { id: 'chromium', required: true },
      { id: 'webkit', required: true },
    ],
    viewports: [
      { id: 'mobile-320-portrait', width: 320, height: 844, orientation: 'portrait' },
      { id: 'mobile-844-landscape', width: 844, height: 390, orientation: 'landscape' },
    ],
    textScales: [1, 2],
    browserZooms: [1, 2],
    colorSchemes: ['light', 'dark'],
    motionPreferences: ['no-preference', 'reduce'],
    safeAreas: ['none', 'notched'],
    inputModes: ['pointer', 'keyboard', 'soft-keyboard'],
  },
  stateCatalog: {
    data: ['loading', 'empty', 'populated', 'boundary', 'error', 'offline'],
    permissions: ['anonymous', 'user', 'owner', 'admin', 'super-admin'],
    interactions: ['default', 'hover', 'focus-visible', 'pressed', 'disabled', 'open'],
    system: ['online', 'offline', 'timeout', 'realtime-update'],
  },
  combinationPolicy: {
    mode: 'all-valid-component-local-combinations',
    componentVariantRule: 'Every supported component-local variant is declared or evidenced as not applicable.',
    cartesianRule: 'Every valid global-state and component-variant combination executes.',
    constraintRequirements: ['reason', 'owner', 'testEvidence'],
    scenarioCapsAllowed: false,
  },
  classificationEvidencePolicy: {
    appliesTo: ['visual', 'behavior-only', 'grouped-gallery', 'nonvisual'],
    requiredFields: ['reason', 'owner', 'testEvidence'],
  },
  exclusionPolicy: {
    requiredFields: ['reason', 'owner', 'expiresOn', 'issue'],
    expiredPolicy: 'fail',
  },
  releaseGates: [
    'source-symbol-classification-100',
    'visual-scenario-registration-100',
    'valid-state-combination-execution-100',
    'supported-environment-execution-100',
    'scan-errors-zero',
    'unapproved-issues-zero',
    'invalid-exclusions-zero',
  ],
  dataSafety: {
    baseballFixtureSources: ['internal-static', 'trusted-internal-sync', 'operator-manual'],
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
    externalBaseballCollection: 'forbidden',
  },
});

test('the checked-in coverage contract is valid and keeps the guarantee closed', async () => {
  const contract = await loadCoverageContract(COVERAGE_CONTRACT_PATH);
  assert.deepEqual(validateCoverageContract(contract), []);
  assert.equal(contract.guarantee.unknownPolicy, 'fail');
  assert.equal(contract.sourceScope.unclassifiedPolicy, 'fail');
  assert.ok(contract.environmentCatalog.browsers.some(({ id }) => id === 'chromium'));
  assert.ok(contract.environmentCatalog.browsers.some(({ id }) => id === 'webkit'));
});

test('missing required browser engines fail the contract', () => {
  const contract = validContract();
  contract.environmentCatalog.browsers = [{ id: 'chromium', required: true }];
  assert.ok(validateCoverageContract(contract).some((error) => error.includes('webkit')));
});

test('unknown or unclassified components cannot be tolerated', () => {
  const contract = validContract();
  contract.sourceScope.unclassifiedPolicy = 'warn';
  contract.guarantee.unknownPolicy = 'ignore';
  const errors = validateCoverageContract(contract);
  assert.ok(errors.some((error) => error.includes('sourceScope.unclassifiedPolicy')));
  assert.ok(errors.some((error) => error.includes('guarantee.unknownPolicy')));
});

test('duplicate environment ids and incomplete state axes fail the contract', () => {
  const contract = validContract();
  contract.environmentCatalog.viewports.push({
    id: 'mobile-320-portrait',
    width: 390,
    height: 844,
    orientation: 'portrait',
  });
  contract.stateCatalog.permissions = [];
  const errors = validateCoverageContract(contract);
  assert.ok(errors.some((error) => error.includes('duplicate viewport id')));
  assert.ok(errors.some((error) => error.includes('stateCatalog.permissions')));
});

test('exceptions and invalid-combination constraints require durable evidence', () => {
  const contract = validContract();
  contract.exclusionPolicy.requiredFields = ['reason'];
  contract.combinationPolicy.constraintRequirements = ['reason', 'owner'];
  const errors = validateCoverageContract(contract);
  assert.ok(errors.some((error) => error.includes('exclusionPolicy.requiredFields')));
  assert.ok(errors.some((error) => error.includes('combinationPolicy.constraintRequirements')));
});

test('component-local variants and an uncapped cartesian product are contractual', () => {
  const contract = validContract();
  delete contract.combinationPolicy.componentVariantRule;
  contract.combinationPolicy.scenarioCapsAllowed = true;
  const errors = validateCoverageContract(contract);
  assert.ok(errors.some((error) => error.includes('componentVariantRule')));
  assert.ok(errors.some((error) => error.includes('scenarioCapsAllowed')));
});

test('external baseball data sources are rejected even when approved sources remain', () => {
  const contract = validContract();
  contract.dataSafety.baseballFixtureSources.push('external-web');
  assert.ok(validateCoverageContract(contract).some((error) => error.includes('baseballFixtureSources')));
});

test('nonvisual and behavior-only classifications require durable evidence', () => {
  const contract = validContract();
  contract.classificationEvidencePolicy.requiredFields = ['reason'];
  assert.ok(validateCoverageContract(contract).some(
    (error) => error.includes('classificationEvidencePolicy.requiredFields'),
  ));
});

test('normative ownership and guarantee completeness cannot be weakened', async () => {
  const contract = await loadCoverageContract(COVERAGE_CONTRACT_PATH);
  contract.status = 'draft';
  contract.owner = '';
  contract.guarantee.sourceSymbolCompletenessRequired = false;
  contract.guarantee.routeAuditAloneIsSufficient = true;

  const errors = validateCoverageContract(contract);
  assert.ok(errors.some((error) => error.includes('status')));
  assert.ok(errors.some((error) => error.includes('owner')));
  assert.ok(errors.some((error) => error.includes('sourceSymbolCompletenessRequired')));
  assert.ok(errors.some((error) => error.includes('routeAuditAloneIsSufficient')));
});

test('source roots, extractor forms, and the required mobile viewport baseline fail closed', async () => {
  const contract = await loadCoverageContract(COVERAGE_CONTRACT_PATH);
  contract.sourceScope.roots = ['src/components'];
  contract.sourceScope.symbolKinds = ['function-declaration'];
  contract.environmentCatalog.viewports = contract.environmentCatalog.viewports.filter(
    ({ id }) => id !== 'mobile-320-portrait',
  );

  const errors = validateCoverageContract(contract);
  assert.ok(errors.some((error) => error.includes('sourceScope.roots')));
  assert.ok(errors.some((error) => error.includes('sourceScope.symbolKinds')));
  assert.ok(errors.some((error) => error.includes('mobile-320-portrait')));
});

test('the four exact coverage ratios are mandatory and must require 100 percent', async () => {
  const contract = await loadCoverageContract(COVERAGE_CONTRACT_PATH);
  contract.coverageMetrics = {
    component_classification_coverage: {
      numerator: 'classified_component_symbols',
      denominator: 'discovered_component_symbols',
      requiredValue: 0.99,
    },
  };

  const errors = validateCoverageContract(contract);
  assert.ok(errors.some((error) => error.includes('component_classification_coverage.requiredValue')));
  assert.ok(errors.some((error) => error.includes('visual_registration_coverage')));
  assert.ok(errors.some((error) => error.includes('state_execution_coverage')));
  assert.ok(errors.some((error) => error.includes('environment_execution_coverage')));
});

test('layout behavior and accessibility requirements are part of the normative contract', async () => {
  const contract = await loadCoverageContract(COVERAGE_CONTRACT_PATH);
  contract.verificationCatalog = {
    layout: ['horizontal-overflow'],
    behavior: [],
    accessibility: ['semantic-role'],
  };

  const errors = validateCoverageContract(contract);
  assert.ok(errors.some((error) => error.includes('verificationCatalog.layout')));
  assert.ok(errors.some((error) => error.includes('verificationCatalog.behavior')));
  assert.ok(errors.some((error) => error.includes('verificationCatalog.accessibility')));
});

test('environment axes and state catalogs reject duplicate or weakened values', async () => {
  const contract = await loadCoverageContract(COVERAGE_CONTRACT_PATH);
  contract.environmentCatalog.textScales = [1, 1, 2];
  contract.stateCatalog.interactions = ['default'];
  contract.exclusionPolicy.unownedPolicy = 'warn';
  contract.exclusionPolicy.silentExclusionsAllowed = true;

  const errors = validateCoverageContract(contract);
  assert.ok(errors.some((error) => error.includes('duplicate environmentCatalog.textScales')));
  assert.ok(errors.some((error) => error.includes('stateCatalog.interactions')));
  assert.ok(errors.some((error) => error.includes('exclusionPolicy.unownedPolicy')));
  assert.ok(errors.some((error) => error.includes('exclusionPolicy.silentExclusionsAllowed')));
});
