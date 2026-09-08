import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDraftStateManifest,
  expandComponentStateCombinations,
  validateComponentStateManifest,
} from './visual-qa-component-states.mjs';

const coverageContract = {
  stateCatalog: {
    data: ['empty', 'populated'],
    permissions: ['anonymous', 'user'],
    interactions: [
      'default',
      'hover',
      'focus-visible',
      'pressed',
      'open',
      'input',
      'submitting',
      'keyboard-navigation',
    ],
    system: ['online', 'offline'],
  },
  combinationPolicy: {
    constraintRequirements: ['reason', 'owner', 'testEvidence'],
  },
};

const classifications = {
  components: [
    { id: 'src/components/A.tsx#A', classification: 'visual', renderAccess: 'module-export' },
    { id: 'src/components/B.tsx#B', classification: 'visual', renderAccess: 'hosted' },
    { id: 'src/components/Icon.tsx#Icon', classification: 'grouped-gallery', renderAccess: 'module-export' },
  ],
};

const evidence = {
  reason: 'The component does not branch on this axis.',
  owner: 'frontend-platform',
  testEvidence: 'scripts/visual-qa-component-states.test.mjs',
};

const axis = (values) => ({ values });
const notApplicable = () => ({ notApplicable: evidence });
const noVariants = () => ({ notApplicable: evidence });

test('draft manifests include every visual symbol exactly once and keep render access', () => {
  const manifest = buildDraftStateManifest(classifications);
  assert.deepEqual(manifest.components, [
    { id: 'src/components/A.tsx#A', status: 'pending', renderAccess: 'module-export' },
    { id: 'src/components/B.tsx#B', status: 'pending', renderAccess: 'hosted' },
  ]);
});

test('registered component states expand the full cartesian product minus evidenced constraints', () => {
  const component = {
    id: 'src/components/A.tsx#A',
    status: 'registered',
    renderAccess: 'module-export',
    render: { mode: 'direct', adapterId: 'a.default' },
    axes: {
      data: axis(['empty', 'populated']),
      permissions: axis(['anonymous', 'user']),
      interactions: axis(['default']),
      system: notApplicable(),
    },
    variants: {
      dimensions: [{
        name: 'feedTab',
        values: ['all', 'following'],
        ...evidence,
      }],
    },
    constraints: [{
      excludeWhen: {
        data: 'populated',
        permissions: 'anonymous',
        'variant.feedTab': 'following',
      },
      ...evidence,
    }],
  };
  const combinations = expandComponentStateCombinations(component, coverageContract);
  assert.equal(combinations.length, 7);
  assert.deepEqual(combinations.at(-1), {
    id: 'data=populated|permissions=user|interactions=default|variant.feedTab=following',
    states: { data: 'populated', permissions: 'user', interactions: 'default' },
    variants: { feedTab: 'following' },
  });
  assert.ok(!combinations.some(({ states, variants }) => (
    states.data === 'populated'
      && states.permissions === 'anonymous'
      && variants.feedTab === 'following'
  )));
});

test('entries without component-local variants retain an explicit empty variant object', () => {
  const component = {
    axes: {
      data: axis(['empty']),
      permissions: notApplicable(),
      interactions: notApplicable(),
      system: notApplicable(),
    },
    variants: noVariants(),
    constraints: [],
  };
  assert.deepEqual(expandComponentStateCombinations(component, coverageContract), [{
    id: 'data=empty',
    states: { data: 'empty' },
    variants: {},
  }]);
});

test('state validation fails closed for pending, missing, stale, and unknown state values', () => {
  const manifest = buildDraftStateManifest(classifications);
  manifest.components.push({
    id: 'src/components/Stale.tsx#Stale',
    status: 'registered',
    renderAccess: 'module-export',
    render: { mode: 'direct', adapterId: 'stale.default' },
    axes: {
      data: axis(['not-in-contract']),
      permissions: notApplicable(),
      interactions: notApplicable(),
      system: notApplicable(),
    },
    variants: noVariants(),
    constraints: [],
  });
  manifest.components = manifest.components.filter(({ id }) => id !== 'src/components/B.tsx#B');
  const validation = validateComponentStateManifest({
    manifest,
    classificationManifest: classifications,
    coverageContract,
    requireComplete: true,
  });
  assert.deepEqual(validation.pending, ['src/components/A.tsx#A']);
  assert.deepEqual(validation.missing, ['src/components/B.tsx#B']);
  assert.deepEqual(validation.stale, ['src/components/Stale.tsx#Stale']);
  assert.equal(validation.ok, false);
});

test('registered entries require explicit treatment of all four state axes', () => {
  const manifest = {
    schemaVersion: 1,
    components: [{
      id: 'src/components/A.tsx#A',
      status: 'registered',
      renderAccess: 'module-export',
      render: { mode: 'direct', adapterId: 'a.default' },
      axes: { data: axis(['empty']) },
      constraints: [],
    }, {
      id: 'src/components/B.tsx#B',
      status: 'pending',
      renderAccess: 'hosted',
    }],
  };
  const validation = validateComponentStateManifest({
    manifest,
    classificationManifest: classifications,
    coverageContract,
    requireComplete: false,
  });
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((message) => message.includes('permissions')));
  assert.ok(validation.errors.some((message) => message.includes('interactions')));
  assert.ok(validation.errors.some((message) => message.includes('system')));
  assert.ok(validation.errors.some((message) => message.includes('variants')));
});

test('registered entries fail closed for invalid or unevidenced component-local variants', () => {
  const manifest = {
    schemaVersion: 1,
    components: [{
      id: 'src/components/A.tsx#A',
      status: 'registered',
      renderAccess: 'module-export',
      render: { mode: 'direct', adapterId: 'a.default' },
      axes: {
        data: axis(['empty']),
        permissions: notApplicable(),
        interactions: notApplicable(),
        system: notApplicable(),
      },
      variants: {
        dimensions: [
          { name: 'feedTab', values: ['all', 'all'] },
          { name: 'feedTab', values: ['following'], ...evidence },
        ],
      },
      constraints: [],
    }, {
      id: 'src/components/B.tsx#B',
      status: 'pending',
      renderAccess: 'hosted',
    }],
  };
  const validation = validateComponentStateManifest({
    manifest,
    classificationManifest: classifications,
    coverageContract,
    requireComplete: false,
  });
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((message) => message.includes('duplicate variant dimension')));
  assert.ok(validation.errors.some((message) => message.includes('duplicate values')));
  assert.ok(validation.errors.some((message) => message.includes('requires reason')));
});

test('every non-default interaction requires an evidenced executable plan', () => {
  const manifest = {
    schemaVersion: 1,
    components: [{
      id: 'src/components/A.tsx#A',
      status: 'registered',
      renderAccess: 'module-export',
      render: { mode: 'direct', adapterId: 'a.default' },
      axes: {
        data: axis(['empty']),
        permissions: notApplicable(),
        interactions: axis(['default', 'hover', 'focus-visible', 'pressed']),
        system: notApplicable(),
      },
      variants: noVariants(),
      interactionPlans: {
        hover: {
          action: 'hover',
          selector: 'button',
          reason: evidence.reason,
          owner: evidence.owner,
        },
        'focus-visible': { action: 'hover', selector: 'button', ...evidence },
        selected: { action: 'selected', selector: 'button', ...evidence },
      },
      constraints: [],
    }, {
      id: 'src/components/B.tsx#B',
      status: 'pending',
      renderAccess: 'hosted',
    }],
  };
  const validation = validateComponentStateManifest({
    manifest,
    classificationManifest: classifications,
    coverageContract,
    requireComplete: false,
  });

  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((message) => message.includes('focus-visible action must equal focus-visible')));
  assert.ok(validation.errors.some((message) => message.includes('pressed requires interactionPlans.pressed')));
  assert.ok(validation.errors.some((message) => message.includes('undeclared interaction plan selected')));
  assert.ok(validation.errors.some((message) => message.includes('interactionPlans.hover requires testEvidence')));
});

test('implemented interaction plans keep registered entries valid', () => {
  const manifest = {
    schemaVersion: 1,
    components: [{
      id: 'src/components/A.tsx#A',
      status: 'registered',
      renderAccess: 'module-export',
      render: { mode: 'direct', adapterId: 'a.default' },
      axes: {
        data: axis(['empty']),
        permissions: notApplicable(),
        interactions: axis(['default', 'hover', 'focus-visible', 'pressed']),
        system: notApplicable(),
      },
      variants: noVariants(),
      interactionPlans: {
        hover: { action: 'hover', selector: 'button', ...evidence },
        'focus-visible': { action: 'focus-visible', selector: 'button', ...evidence },
        pressed: { action: 'pressed', selector: 'button', ...evidence },
      },
      constraints: [],
    }, {
      id: 'src/components/B.tsx#B',
      status: 'pending',
      renderAccess: 'hosted',
    }],
  };
  const validation = validateComponentStateManifest({
    manifest,
    classificationManifest: classifications,
    coverageContract,
    requireComplete: false,
  });

  assert.equal(validation.ok, true);
  assert.equal(validation.validCombinations, 4);
});

test('change interactions require a press-key action plan', () => {
  const validation = validateComponentStateManifest({
    manifest: {
      schemaVersion: 1,
      components: [{
        id: 'src/components/A.tsx#A',
        status: 'registered',
        renderAccess: 'module-export',
        render: { mode: 'direct', adapterId: 'a.default' },
        axes: {
          data: axis(['empty']),
          permissions: notApplicable(),
          interactions: axis(['default', 'change']),
          system: notApplicable(),
        },
        variants: noVariants(),
        interactionPlans: {
          change: { action: 'press-key', selector: 'select', key: 'End', ...evidence },
        },
        constraints: [],
      }, {
        id: 'src/components/B.tsx#B',
        status: 'pending',
        renderAccess: 'hosted',
      }],
    },
    classificationManifest: classifications,
    coverageContract: {
      ...coverageContract,
      stateCatalog: {
        ...coverageContract.stateCatalog,
        interactions: [...coverageContract.stateCatalog.interactions, 'change'],
      },
    },
    requireComplete: false,
  });

  assert.equal(validation.ok, true);
  assert.equal(validation.validCombinations, 2);
});

test('change interactions accept fail-closed select-option evidence without weakening press-key', () => {
  const component = {
    id: 'src/components/A.tsx#A',
    status: 'registered',
    renderAccess: 'module-export',
    render: { mode: 'direct', adapterId: 'a.default' },
    axes: {
      data: axis(['empty']),
      permissions: notApplicable(),
      interactions: axis(['default', 'change']),
      system: notApplicable(),
    },
    variants: noVariants(),
    interactionPlans: {
      change: {
        action: 'select-option',
        selector: 'select',
        value: 'LG',
        waitForSelector: 'select:has(option[value="LG"]:checked)',
        ...evidence,
      },
    },
    constraints: [],
  };
  const validate = (entry) => validateComponentStateManifest({
    manifest: { schemaVersion: 1, components: [entry] },
    classificationManifest: {
      components: [{ id: component.id, classification: 'visual', renderAccess: 'module-export' }],
    },
    coverageContract: {
      ...coverageContract,
      stateCatalog: {
        ...coverageContract.stateCatalog,
        interactions: [...coverageContract.stateCatalog.interactions, 'change'],
      },
    },
    requireComplete: true,
  });

  const valid = validate(component);
  assert.equal(valid.ok, true, valid.errors.join('\n'));
  assert.equal(valid.validCombinations, 2);

  const missingValue = structuredClone(component);
  delete missingValue.interactionPlans.change.value;
  assert.ok(validate(missingValue).errors.some((message) => (
    message.includes('select-option action requires value')
  )));

  const missingVerifier = structuredClone(component);
  delete missingVerifier.interactionPlans.change.waitForSelector;
  assert.ok(validate(missingVerifier).errors.some((message) => (
    message.includes('select-option action requires waitForSelector')
  )));
});

test('multi-target interaction plans expand every declared target into an independent combination', () => {
  const component = {
    id: 'src/components/A.tsx#A',
    status: 'registered',
    renderAccess: 'module-export',
    render: { mode: 'direct', adapterId: 'a.default' },
    axes: {
      data: axis(['empty']),
      permissions: notApplicable(),
      interactions: axis(['default', 'hover']),
      system: notApplicable(),
    },
    variants: noVariants(),
    interactionPlans: {
      hover: {
        action: 'hover',
        targets: [
          { id: 'retry', selector: '[data-testid="retry"]' },
          { id: 'recovery', selector: '[data-testid="recovery"]' },
        ],
        ...evidence,
      },
    },
    constraints: [],
  };
  const manifest = {
    schemaVersion: 1,
    components: [component, {
      id: 'src/components/B.tsx#B',
      status: 'pending',
      renderAccess: 'hosted',
    }],
  };
  const validation = validateComponentStateManifest({
    manifest,
    classificationManifest: classifications,
    coverageContract,
    requireComplete: false,
  });
  const combinations = expandComponentStateCombinations(component, coverageContract);

  assert.equal(validation.ok, true);
  assert.equal(validation.validCombinations, 3);
  assert.deepEqual(combinations.map(({ id }) => id), [
    'data=empty|interactions=default',
    'data=empty|interactions=hover|interactionTarget=retry',
    'data=empty|interactions=hover|interactionTarget=recovery',
  ]);
  assert.deepEqual(combinations.at(-1)?.interactionTarget, {
    id: 'recovery',
    selector: '[data-testid="recovery"]',
  });
});

test('conditional interaction targets expand only for matching component states and variants', () => {
  const component = {
    id: 'src/components/A.tsx#A',
    status: 'registered',
    renderAccess: 'module-export',
    render: { mode: 'direct', adapterId: 'a.default' },
    axes: {
      data: axis(['empty', 'populated']),
      permissions: notApplicable(),
      interactions: axis(['default', 'open']),
      system: axis(['online', 'offline']),
    },
    variants: {
      dimensions: [{ name: 'enabled', values: ['false', 'true'], ...evidence }],
    },
    interactionPlans: {
      open: {
        action: 'click',
        targets: [{
          id: 'available-card',
          selector: '[data-testid="available-card"]',
          when: {
            data: 'populated',
            system: ['online'],
            'variant.enabled': 'true',
          },
          setup: [{
            action: 'click',
            selector: '[data-testid="inventory-toggle"]',
            waitForSelector: '[data-testid="inventory-panel"]',
          }],
          waitForSelector: '[role="dialog"]',
        }],
        ...evidence,
      },
    },
    constraints: [],
  };
  const manifest = {
    schemaVersion: 1,
    components: [component, {
      id: 'src/components/B.tsx#B',
      status: 'pending',
      renderAccess: 'hosted',
    }],
  };
  const validation = validateComponentStateManifest({
    manifest,
    classificationManifest: classifications,
    coverageContract,
    requireComplete: false,
  });
  const combinations = expandComponentStateCombinations(component, coverageContract);
  const openCombinations = combinations.filter(({ states }) => states.interactions === 'open');

  assert.equal(validation.ok, true);
  assert.equal(openCombinations.length, 1);
  assert.deepEqual(openCombinations[0], {
    id: 'data=populated|interactions=open|system=online|variant.enabled=true|interactionTarget=available-card',
    states: { data: 'populated', interactions: 'open', system: 'online' },
    variants: { enabled: 'true' },
    interactionTarget: component.interactionPlans.open.targets[0],
  });
});

test('interaction validation rejects undeclared conditions, values, and setup actions', () => {
  const invalidTarget = (target) => ({
    schemaVersion: 1,
    components: [{
      id: 'src/components/A.tsx#A',
      status: 'registered',
      renderAccess: 'module-export',
      render: { mode: 'direct', adapterId: 'a.default' },
      axes: {
        data: axis(['empty']),
        permissions: notApplicable(),
        interactions: axis(['default', 'open']),
        system: notApplicable(),
      },
      variants: noVariants(),
      interactionPlans: {
        open: {
          action: 'click',
          targets: [target],
          ...evidence,
        },
      },
      constraints: [],
    }, {
      id: 'src/components/B.tsx#B',
      status: 'pending',
      renderAccess: 'hosted',
    }],
  });
  const validate = (target) => validateComponentStateManifest({
    manifest: invalidTarget(target),
    classificationManifest: classifications,
    coverageContract,
    requireComplete: false,
  });

  const unknownCondition = validate({
    id: 'card',
    selector: 'button',
    when: { 'variant.missing': 'true' },
  });
  assert.ok(unknownCondition.errors.some((message) => (
    message.includes('references undeclared variant.missing=true')
  )));

  const unknownValue = validate({
    id: 'card',
    selector: 'button',
    when: { data: ['empty', 'unknown'] },
  });
  assert.ok(unknownValue.errors.some((message) => (
    message.includes('references undeclared data=unknown')
  )));

  const invalidSetup = validate({
    id: 'card',
    selector: 'button',
    setup: [{ action: 'hover', selector: 'button' }],
  });
  assert.ok(invalidSetup.errors.some((message) => (
    message.includes('setup.0 action hover is not executable')
  )));
});

test('input, submitting, and keyboard navigation plans require executable payloads', () => {
  const component = {
    id: 'src/components/A.tsx#A',
    status: 'registered',
    renderAccess: 'module-export',
    render: { mode: 'direct', adapterId: 'a.default' },
    axes: {
      data: axis(['populated']),
      permissions: axis(['user']),
      interactions: axis(['default', 'input', 'submitting', 'keyboard-navigation']),
      system: notApplicable(),
    },
    variants: noVariants(),
    interactionPlans: {
      input: {
        action: 'fill',
        selector: 'textarea',
        value: '후기',
        ...evidence,
      },
      submitting: {
        action: 'click',
        selector: '[data-testid="submit"]',
        setup: [{ action: 'fill', selector: 'textarea', value: '후기' }],
        ...evidence,
      },
      'keyboard-navigation': {
        action: 'press-key',
        selector: '[role="radio"]',
        key: 'ArrowRight',
        ...evidence,
      },
    },
    constraints: [],
  };

  const validation = validateComponentStateManifest({
    manifest: { schemaVersion: 1, components: [component] },
    classificationManifest: {
      components: [
        { id: component.id, classification: 'visual', renderAccess: 'module-export' },
      ],
    },
    coverageContract,
    requireComplete: true,
  });

  assert.equal(validation.ok, true, validation.errors.join('\n'));
  assert.equal(validation.validCombinations, 4);

  const missingValue = structuredClone(component);
  delete missingValue.interactionPlans.input.value;
  const missingValueValidation = validateComponentStateManifest({
    manifest: { schemaVersion: 1, components: [missingValue] },
    classificationManifest: {
      components: [
        { id: component.id, classification: 'visual', renderAccess: 'module-export' },
      ],
    },
    coverageContract,
    requireComplete: true,
  });
  assert.ok(missingValueValidation.errors.some((message) => message.includes('requires value')));
});

test('registered direct renders validate production stylesheet dependencies', () => {
  const component = {
    id: 'src/components/A.tsx#A',
    status: 'registered',
    renderAccess: 'module-export',
    render: {
      mode: 'direct',
      adapterId: 'a.default',
      styles: ['src/components/a.css'],
    },
    axes: {
      data: axis(['empty']),
      permissions: notApplicable(),
      interactions: notApplicable(),
      system: notApplicable(),
    },
    variants: noVariants(),
    constraints: [],
  };
  const validation = validateComponentStateManifest({
    manifest: {
      schemaVersion: 1,
      components: [component, {
        id: 'src/components/B.tsx#B',
        status: 'pending',
        renderAccess: 'hosted',
      }],
    },
    classificationManifest: classifications,
    coverageContract,
    requireComplete: false,
  });
  assert.equal(validation.ok, true);

  const invalid = validateComponentStateManifest({
    manifest: {
      schemaVersion: 1,
      components: [{
        ...component,
        render: {
          ...component.render,
          styles: ['src/components/a.css', 'src/components/a.css', '../outside.css'],
        },
      }, {
        id: 'src/components/B.tsx#B',
        status: 'pending',
        renderAccess: 'hosted',
      }],
    },
    classificationManifest: classifications,
    coverageContract,
    requireComplete: false,
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.some((message) => message.includes('duplicate styles')));
  assert.ok(invalid.errors.some((message) => message.includes('invalid stylesheet')));
});

test('hosted entries require explicit host scenarios and constraints require evidence', () => {
  const manifest = {
    schemaVersion: 1,
    components: [{
      id: 'src/components/A.tsx#A',
      status: 'pending',
      renderAccess: 'module-export',
    }, {
      id: 'src/components/B.tsx#B',
      status: 'registered',
      renderAccess: 'hosted',
      render: { mode: 'hosted', hostScenarioIds: [] },
      axes: {
        data: axis(['empty']),
        permissions: notApplicable(),
        interactions: notApplicable(),
      system: notApplicable(),
    },
      variants: noVariants(),
      constraints: [{ excludeWhen: { data: 'empty' } }],
    }],
  };
  const validation = validateComponentStateManifest({
    manifest,
    classificationManifest: classifications,
    coverageContract,
    requireComplete: false,
  });
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((message) => message.includes('hostScenarioIds')));
  assert.ok(validation.errors.some((message) => message.includes('testEvidence')));
});

test('hosted evidence must reference a generated direct scenario', () => {
  const manifest = {
    schemaVersion: 1,
    components: [{
      id: 'src/components/A.tsx#A',
      status: 'registered',
      renderAccess: 'module-export',
      render: { mode: 'direct', adapterId: 'a.default' },
      axes: {
        data: axis(['empty']),
        permissions: notApplicable(),
        interactions: notApplicable(),
        system: notApplicable(),
      },
      variants: noVariants(),
      constraints: [],
    }, {
      id: 'src/components/B.tsx#B',
      status: 'registered',
      renderAccess: 'hosted',
      render: {
        mode: 'hosted',
        hostScenarioIds: ['state:src/components/A.tsx#A:data=populated'],
      },
      axes: {
        data: axis(['empty']),
        permissions: notApplicable(),
        interactions: notApplicable(),
        system: notApplicable(),
      },
      variants: noVariants(),
      constraints: [],
    }],
  };

  const validation = validateComponentStateManifest({
    manifest,
    classificationManifest: classifications,
    coverageContract,
    requireComplete: false,
  });

  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((message) => (
    message.includes('unknown host scenario')
      && message.includes('state:src/components/A.tsx#A:data=populated')
  )));
});

const validateHostedCombinationContribution = (hosted) => validateComponentStateManifest({
  manifest: {
    schemaVersion: 1,
    components: [{
      id: 'src/components/A.tsx#A',
      status: 'registered',
      renderAccess: 'module-export',
      render: { mode: 'direct', adapterId: 'a.default' },
      axes: {
        data: axis(['empty']),
        permissions: notApplicable(),
        interactions: notApplicable(),
        system: notApplicable(),
      },
      variants: noVariants(),
      constraints: [],
    }, hosted],
  },
  classificationManifest: classifications,
  coverageContract,
  requireComplete: false,
});

test('fully nonapplicable hosted wrappers add no independent valid combination', () => {
  const validation = validateHostedCombinationContribution({
    id: 'src/components/B.tsx#B',
    status: 'registered',
    renderAccess: 'hosted',
    render: {
      mode: 'hosted',
      hostScenarioIds: ['state:src/components/A.tsx#A:data=empty'],
    },
    axes: {
      data: notApplicable(),
      permissions: notApplicable(),
      interactions: notApplicable(),
      system: notApplicable(),
    },
    variants: noVariants(),
    constraints: [],
  });

  assert.equal(validation.ok, true);
  assert.equal(validation.validCombinations, 1);
});

test('hosted entries with applicable state retain their independent combination count', () => {
  const validation = validateHostedCombinationContribution({
    id: 'src/components/B.tsx#B',
    status: 'registered',
    renderAccess: 'hosted',
    render: {
      mode: 'hosted',
      hostScenarioIds: ['state:src/components/A.tsx#A:data=empty'],
    },
    axes: {
      data: axis(['empty', 'populated']),
      permissions: notApplicable(),
      interactions: notApplicable(),
      system: notApplicable(),
    },
    variants: noVariants(),
    constraints: [],
  });

  assert.equal(validation.ok, true);
  assert.equal(validation.validCombinations, 3);
});
