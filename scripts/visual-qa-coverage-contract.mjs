#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const COVERAGE_CONTRACT_PATH = fileURLToPath(
  new URL('../contracts/visual-qa-coverage-v1.json', import.meta.url),
);

const REQUIRED_CLASSIFICATIONS = [
  'visual',
  'behavior-only',
  'grouped-gallery',
  'nonvisual',
  'excluded',
];
const REQUIRED_CLASSIFICATION_EVIDENCE_CLASSES = [
  'visual',
  'behavior-only',
  'grouped-gallery',
  'nonvisual',
];
const REQUIRED_BROWSERS = ['chromium', 'webkit'];
const REQUIRED_SOURCE_ROOTS = ['src/components', 'src/pages'];
const REQUIRED_SOURCE_EXTENSIONS = ['.tsx'];
const REQUIRED_IGNORED_FILE_PATTERNS = [
  '**/*.test.tsx',
  '**/*.spec.tsx',
  '**/__tests__/**',
];
const REQUIRED_SYMBOL_KINDS = [
  'function-declaration',
  'function-expression',
  'arrow-function',
  'class-component',
  'pascal-runtime-class',
  'pascal-runtime-value',
  'memo-wrapper',
  'forward-ref-wrapper',
  'lazy-wrapper',
];
const REQUIRED_VIEWPORTS = [
  { id: 'mobile-320-portrait', width: 320, height: 844, orientation: 'portrait' },
  { id: 'mobile-360-portrait', width: 360, height: 844, orientation: 'portrait' },
  { id: 'mobile-390-portrait', width: 390, height: 844, orientation: 'portrait' },
  { id: 'mobile-430-portrait', width: 430, height: 844, orientation: 'portrait' },
  { id: 'mobile-480-portrait', width: 480, height: 1024, orientation: 'portrait' },
  { id: 'mobile-600-portrait', width: 600, height: 1024, orientation: 'portrait' },
  { id: 'mobile-767-portrait', width: 767, height: 1024, orientation: 'portrait' },
  { id: 'tablet-768-portrait', width: 768, height: 1024, orientation: 'portrait' },
  { id: 'tablet-834-portrait', width: 834, height: 1024, orientation: 'portrait' },
  { id: 'desktop-1024', width: 1024, height: 900, orientation: 'landscape' },
  { id: 'desktop-1040', width: 1040, height: 900, orientation: 'landscape' },
  { id: 'desktop-1160', width: 1160, height: 900, orientation: 'landscape' },
  { id: 'desktop-1280', width: 1280, height: 900, orientation: 'landscape' },
  { id: 'desktop-1440', width: 1440, height: 900, orientation: 'landscape' },
  { id: 'mobile-568-landscape', width: 568, height: 320, orientation: 'landscape' },
  { id: 'mobile-667-landscape', width: 667, height: 375, orientation: 'landscape' },
  { id: 'mobile-844-landscape', width: 844, height: 390, orientation: 'landscape' },
  { id: 'mobile-932-landscape', width: 932, height: 430, orientation: 'landscape' },
];
const REQUIRED_STATE_AXES = ['data', 'permissions', 'interactions', 'system'];
const REQUIRED_STATE_VALUES = {
  data: [
    'loading',
    'empty',
    'single',
    'populated',
    'maximum-supported',
    'long-korean',
    'unbroken-token',
    'null-optional',
    'missing-image',
    'broken-image',
    'manual-required',
    'boundary-minimum',
    'boundary-maximum',
    'error-400',
    'error-401',
    'error-403',
    'error-404',
    'error-409',
    'error-422',
    'error-429',
    'error-500',
    'error-503',
  ],
  permissions: ['anonymous', 'user', 'owner', 'non-owner', 'admin', 'super-admin'],
  interactions: ['default', 'hover', 'focus-visible', 'pressed', 'selected', 'open', 'keyboard-navigation'],
  system: ['online', 'offline', 'timeout', 'retrying', 'realtime-update'],
};
const REQUIRED_CONSTRAINT_FIELDS = ['reason', 'owner', 'testEvidence'];
const REQUIRED_EXCLUSION_FIELDS = ['reason', 'owner', 'expiresOn', 'issue'];
const REQUIRED_RELEASE_GATES = [
  'source-symbol-classification-100',
  'visual-scenario-registration-100',
  'valid-state-combination-execution-100',
  'supported-environment-execution-100',
  'scan-errors-zero',
  'unapproved-issues-zero',
  'invalid-exclusions-zero',
];
const APPROVED_BASEBALL_FIXTURE_SOURCES = [
  'internal-static',
  'trusted-internal-sync',
  'operator-manual',
];
const REQUIRED_COVERAGE_METRICS = {
  component_classification_coverage: {
    numerator: 'classified_component_symbols',
    denominator: 'discovered_component_symbols',
  },
  visual_registration_coverage: {
    numerator: 'registered_visual_components',
    denominator: 'classified_visual_components',
  },
  state_execution_coverage: {
    numerator: 'executed_valid_states',
    denominator: 'generated_valid_states',
  },
  environment_execution_coverage: {
    numerator: 'executed_required_environments',
    denominator: 'required_environments',
  },
};
const REQUIRED_VERIFICATION_CATALOG = {
  layout: [
    'horizontal-overflow',
    'viewport-overflow',
    'content-clipping',
    'interactive-overlap',
    'touch-target',
    'fixed-content-obstruction',
  ],
  behavior: [
    'declared-interaction-execution',
    'interaction-result',
    'keyboard-navigation',
    'focus-visible',
  ],
  accessibility: [
    'semantic-role',
    'accessible-name',
    'keyboard-operability',
    'focus-order',
    'text-scale-200',
    'reduced-motion',
  ],
};
const REQUIRED_EVIDENCE = [
  'component-symbol-inventory',
  'classification-coverage-report',
  'component-state-scenario-report',
  'browser-environment-execution-report',
  'visual-diff-artifacts',
  'accessibility-and-layout-findings',
  'exclusion-ledger',
];

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const hasEvery = (values, required) => Array.isArray(values)
  && required.every((value) => values.includes(value));

const duplicateValues = (values) => values.filter((value, index) => values.indexOf(value) !== index);
const sameValueSet = (values, required) => Array.isArray(values)
  && values.length === required.length
  && hasEvery(values, required);

export const validateCoverageContract = (contract) => {
  const errors = [];
  const requireArray = (value, path) => {
    if (!Array.isArray(value) || value.length === 0) {
      errors.push(`${path} must be a non-empty array`);
      return false;
    }
    return true;
  };

  if (!isObject(contract)) return ['contract must be an object'];
  if (contract.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!isNonEmptyString(contract.id)) errors.push('id must be a non-empty string');
  if (contract.status !== 'normative') errors.push('status must be normative');
  if (!isNonEmptyString(contract.owner)) errors.push('owner must be a non-empty string');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(contract.approvedOn ?? '')) {
    errors.push('approvedOn must be an ISO date');
  }

  if (!isObject(contract.implementation)) {
    errors.push('implementation must be an object');
  } else {
    requireArray(contract.implementation.completedStages, 'implementation.completedStages');
    requireArray(contract.implementation.pendingStages, 'implementation.pendingStages');
    requireArray(contract.implementation.currentEnforcement, 'implementation.currentEnforcement');
    if (typeof contract.implementation.fullGuaranteeActive !== 'boolean') {
      errors.push('implementation.fullGuaranteeActive must be boolean');
    } else if (
      contract.implementation.fullGuaranteeActive
      && contract.implementation.pendingStages.length > 0
    ) {
      errors.push('implementation.fullGuaranteeActive requires no pendingStages');
    }
  }

  if (!isObject(contract.guarantee)) {
    errors.push('guarantee must be an object');
  } else {
    if (contract.guarantee.scope !== 'all-declared-valid-combinations') {
      errors.push('guarantee.scope must be all-declared-valid-combinations');
    }
    if (contract.guarantee.unknownPolicy !== 'fail') {
      errors.push('guarantee.unknownPolicy must be fail');
    }
    if (!isNonEmptyString(contract.guarantee.statement)) {
      errors.push('guarantee.statement must be a non-empty string');
    }
    if (contract.guarantee.sourceSymbolCompletenessRequired !== true) {
      errors.push('guarantee.sourceSymbolCompletenessRequired must be true');
    }
    if (contract.guarantee.routeAuditAloneIsSufficient !== false) {
      errors.push('guarantee.routeAuditAloneIsSufficient must be false');
    }
  }

  if (!isObject(contract.coverageMetrics)) {
    errors.push('coverageMetrics must be an object');
  } else {
    for (const [metricId, expected] of Object.entries(REQUIRED_COVERAGE_METRICS)) {
      const metric = contract.coverageMetrics[metricId];
      if (!isObject(metric)) {
        errors.push(`coverageMetrics.${metricId} must be an object`);
        continue;
      }
      if (metric.numerator !== expected.numerator) {
        errors.push(`coverageMetrics.${metricId}.numerator must be ${expected.numerator}`);
      }
      if (metric.denominator !== expected.denominator) {
        errors.push(`coverageMetrics.${metricId}.denominator must be ${expected.denominator}`);
      }
      if (metric.requiredValue !== 1) {
        errors.push(`coverageMetrics.${metricId}.requiredValue must be 1`);
      }
    }
  }

  if (!isObject(contract.sourceScope)) {
    errors.push('sourceScope must be an object');
  } else {
    if (!sameValueSet(contract.sourceScope.roots, REQUIRED_SOURCE_ROOTS)) {
      errors.push(`sourceScope.roots must equal ${REQUIRED_SOURCE_ROOTS.join(', ')}`);
    }
    if (!sameValueSet(contract.sourceScope.extensions, REQUIRED_SOURCE_EXTENSIONS)) {
      errors.push(`sourceScope.extensions must equal ${REQUIRED_SOURCE_EXTENSIONS.join(', ')}`);
    }
    if (!hasEvery(contract.sourceScope.ignoredFilePatterns, REQUIRED_IGNORED_FILE_PATTERNS)) {
      errors.push(`sourceScope.ignoredFilePatterns must include ${REQUIRED_IGNORED_FILE_PATTERNS.join(', ')}`);
    }
    if (!hasEvery(contract.sourceScope.symbolKinds, REQUIRED_SYMBOL_KINDS)) {
      errors.push(`sourceScope.symbolKinds must include ${REQUIRED_SYMBOL_KINDS.join(', ')}`);
    }
    if (!isNonEmptyString(contract.sourceScope.candidateRule)) {
      errors.push('sourceScope.candidateRule must be a non-empty string');
    }
    if (!hasEvery(contract.sourceScope.classifications, REQUIRED_CLASSIFICATIONS)) {
      errors.push(`sourceScope.classifications must include ${REQUIRED_CLASSIFICATIONS.join(', ')}`);
    }
    if (contract.sourceScope.unclassifiedPolicy !== 'fail') {
      errors.push('sourceScope.unclassifiedPolicy must be fail');
    }
    if (contract.sourceScope.groupedGalleryPolicy !== 'every-exported-symbol-must-render') {
      errors.push('sourceScope.groupedGalleryPolicy must be every-exported-symbol-must-render');
    }
  }

  if (!isObject(contract.environmentCatalog)) {
    errors.push('environmentCatalog must be an object');
  } else {
    const { browsers, viewports } = contract.environmentCatalog;
    if (contract.environmentCatalog.combinationMode !== 'all-applicable-component-local-combinations') {
      errors.push('environmentCatalog.combinationMode must be all-applicable-component-local-combinations');
    }
    if (requireArray(browsers, 'environmentCatalog.browsers')) {
      for (const browser of REQUIRED_BROWSERS) {
        if (!browsers.some((entry) => entry?.id === browser && entry.required === true)) {
          errors.push(`environmentCatalog.browsers must require ${browser}`);
        }
      }
      const duplicateBrowserIds = duplicateValues(browsers.map((entry) => entry?.id));
      if (duplicateBrowserIds.length > 0) {
        errors.push(`duplicate browser id: ${[...new Set(duplicateBrowserIds)].join(', ')}`);
      }
    }
    if (requireArray(viewports, 'environmentCatalog.viewports')) {
      const ids = viewports.map((viewport) => viewport?.id);
      const duplicateViewportIds = duplicateValues(ids);
      if (duplicateViewportIds.length > 0) {
        errors.push(`duplicate viewport id: ${[...new Set(duplicateViewportIds)].join(', ')}`);
      }
      for (const [index, viewport] of viewports.entries()) {
        const path = `environmentCatalog.viewports[${index}]`;
        if (!isObject(viewport) || !isNonEmptyString(viewport.id)) {
          errors.push(`${path}.id must be a non-empty string`);
          continue;
        }
        if (!Number.isInteger(viewport.width) || viewport.width < 1) {
          errors.push(`${path}.width must be a positive integer`);
        }
        if (!Number.isInteger(viewport.height) || viewport.height < 1) {
          errors.push(`${path}.height must be a positive integer`);
        }
        if (!['portrait', 'landscape'].includes(viewport.orientation)) {
          errors.push(`${path}.orientation must be portrait or landscape`);
        } else if (viewport.orientation === 'portrait' && viewport.width > viewport.height) {
          errors.push(`${path} portrait dimensions are inverted`);
        } else if (viewport.orientation === 'landscape' && viewport.width < viewport.height) {
          errors.push(`${path} landscape dimensions are inverted`);
        }
      }
      for (const requiredViewport of REQUIRED_VIEWPORTS) {
        const actual = viewports.find(({ id }) => id === requiredViewport.id);
        if (!actual) {
          errors.push(`environmentCatalog.viewports must include ${requiredViewport.id}`);
        } else if (
          actual.width !== requiredViewport.width
          || actual.height !== requiredViewport.height
          || actual.orientation !== requiredViewport.orientation
        ) {
          errors.push(`environmentCatalog.viewports ${requiredViewport.id} dimensions must remain normative`);
        }
      }
    }
    for (const [axis, requiredValues] of [
      ['textScales', [1, 2]],
      ['browserZooms', [1, 2]],
      ['colorSchemes', ['light', 'dark']],
      ['motionPreferences', ['no-preference', 'reduce']],
      ['safeAreas', ['none', 'notched']],
      ['inputModes', ['pointer', 'keyboard', 'soft-keyboard']],
    ]) {
      const values = contract.environmentCatalog[axis];
      if (!hasEvery(values, requiredValues)) {
        errors.push(`environmentCatalog.${axis} must include ${requiredValues.join(', ')}`);
      }
      if (Array.isArray(values)) {
        const duplicates = duplicateValues(values);
        if (duplicates.length > 0) {
          errors.push(`duplicate environmentCatalog.${axis}: ${[...new Set(duplicates)].join(', ')}`);
        }
      }
    }
  }

  if (!isObject(contract.stateCatalog)) {
    errors.push('stateCatalog must be an object');
  } else {
    for (const axis of REQUIRED_STATE_AXES) {
      const values = contract.stateCatalog[axis];
      if (!requireArray(values, `stateCatalog.${axis}`)) continue;
      const duplicates = duplicateValues(values);
      if (duplicates.length > 0) {
        errors.push(`duplicate stateCatalog.${axis}: ${[...new Set(duplicates)].join(', ')}`);
      }
      if (!values.every(isNonEmptyString)) {
        errors.push(`stateCatalog.${axis} values must be non-empty strings`);
      }
      if (!hasEvery(values, REQUIRED_STATE_VALUES[axis])) {
        errors.push(`stateCatalog.${axis} must include ${REQUIRED_STATE_VALUES[axis].join(', ')}`);
      }
    }
  }

  if (!isObject(contract.combinationPolicy)) {
    errors.push('combinationPolicy must be an object');
  } else {
    if (contract.combinationPolicy.mode !== 'all-valid-component-local-combinations') {
      errors.push('combinationPolicy.mode must be all-valid-component-local-combinations');
    }
    if (!isNonEmptyString(contract.combinationPolicy.applicabilityRule)) {
      errors.push('combinationPolicy.applicabilityRule must be a non-empty string');
    }
    if (!isNonEmptyString(contract.combinationPolicy.componentVariantRule)) {
      errors.push('combinationPolicy.componentVariantRule must be a non-empty string');
    }
    if (!isNonEmptyString(contract.combinationPolicy.cartesianRule)) {
      errors.push('combinationPolicy.cartesianRule must be a non-empty string');
    }
    if (contract.combinationPolicy.scenarioCapsAllowed !== false) {
      errors.push('combinationPolicy.scenarioCapsAllowed must be false');
    }
    if (!hasEvery(contract.combinationPolicy.constraintRequirements, REQUIRED_CONSTRAINT_FIELDS)) {
      errors.push(`combinationPolicy.constraintRequirements must include ${REQUIRED_CONSTRAINT_FIELDS.join(', ')}`);
    }
  }

  if (!isObject(contract.exclusionPolicy)) {
    errors.push('exclusionPolicy must be an object');
  } else {
    if (!hasEvery(contract.exclusionPolicy.requiredFields, REQUIRED_EXCLUSION_FIELDS)) {
      errors.push(`exclusionPolicy.requiredFields must include ${REQUIRED_EXCLUSION_FIELDS.join(', ')}`);
    }
    if (contract.exclusionPolicy.expiredPolicy !== 'fail') {
      errors.push('exclusionPolicy.expiredPolicy must be fail');
    }
    if (contract.exclusionPolicy.unownedPolicy !== 'fail') {
      errors.push('exclusionPolicy.unownedPolicy must be fail');
    }
    if (contract.exclusionPolicy.silentExclusionsAllowed !== false) {
      errors.push('exclusionPolicy.silentExclusionsAllowed must be false');
    }
  }

  if (!isObject(contract.classificationEvidencePolicy)) {
    errors.push('classificationEvidencePolicy must be an object');
  } else {
    if (!hasEvery(
      contract.classificationEvidencePolicy.appliesTo,
      REQUIRED_CLASSIFICATION_EVIDENCE_CLASSES,
    )) {
      errors.push(`classificationEvidencePolicy.appliesTo must include ${REQUIRED_CLASSIFICATION_EVIDENCE_CLASSES.join(', ')}`);
    }
    if (!hasEvery(contract.classificationEvidencePolicy.requiredFields, REQUIRED_CONSTRAINT_FIELDS)) {
      errors.push(`classificationEvidencePolicy.requiredFields must include ${REQUIRED_CONSTRAINT_FIELDS.join(', ')}`);
    }
  }

  if (!hasEvery(contract.releaseGates, REQUIRED_RELEASE_GATES)) {
    errors.push(`releaseGates must include ${REQUIRED_RELEASE_GATES.join(', ')}`);
  }

  if (!isObject(contract.verificationCatalog)) {
    errors.push('verificationCatalog must be an object');
  } else {
    for (const [category, requiredChecks] of Object.entries(REQUIRED_VERIFICATION_CATALOG)) {
      const checks = contract.verificationCatalog[category];
      if (!hasEvery(checks, requiredChecks)) {
        errors.push(`verificationCatalog.${category} must include ${requiredChecks.join(', ')}`);
      }
      if (Array.isArray(checks)) {
        const duplicates = duplicateValues(checks);
        if (duplicates.length > 0) {
          errors.push(`duplicate verificationCatalog.${category}: ${[...new Set(duplicates)].join(', ')}`);
        }
      }
    }
  }

  if (!hasEvery(contract.requiredEvidence, REQUIRED_EVIDENCE)) {
    errors.push(`requiredEvidence must include ${REQUIRED_EVIDENCE.join(', ')}`);
  }

  if (!isObject(contract.dataSafety)) {
    errors.push('dataSafety must be an object');
  } else {
    if (contract.dataSafety.externalBaseballCollection !== 'forbidden') {
      errors.push('dataSafety.externalBaseballCollection must be forbidden');
    }
    if (contract.dataSafety.missingBaseballDataContract !== 'MANUAL_BASEBALL_DATA_REQUIRED') {
      errors.push('dataSafety.missingBaseballDataContract must be MANUAL_BASEBALL_DATA_REQUIRED');
    }
    if (!hasEvery(contract.dataSafety.baseballFixtureSources, APPROVED_BASEBALL_FIXTURE_SOURCES)
      || contract.dataSafety.baseballFixtureSources.some(
        (source) => !APPROVED_BASEBALL_FIXTURE_SOURCES.includes(source),
      )) {
      errors.push('dataSafety.baseballFixtureSources must only use approved internal/manual source classes');
    }
  }

  return errors;
};

export const loadCoverageContract = async (path = COVERAGE_CONTRACT_PATH) => {
  const raw = await readFile(resolve(path), 'utf8');
  return JSON.parse(raw);
};

const main = async () => {
  const contract = await loadCoverageContract();
  const errors = validateCoverageContract(contract);
  if (errors.length > 0) {
    for (const error of errors) console.error(`[visual-qa:contract] ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `[visual-qa:contract] valid · ${contract.environmentCatalog.browsers.length} browsers · `
      + `${contract.environmentCatalog.viewports.length} viewports · `
      + `${Object.keys(contract.stateCatalog).length} state axes`,
  );
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(`[visual-qa:contract] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
