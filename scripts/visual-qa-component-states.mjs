import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDir, '..');
const defaultManifestPath = resolve(frontendRoot, 'contracts/visual-qa-component-states-v1.json');
const classificationPath = resolve(frontendRoot, 'contracts/visual-qa-component-classifications-v1.json');
const coverageContractPath = resolve(frontendRoot, 'contracts/visual-qa-coverage-v1.json');
const defaultReportPath = resolve(frontendRoot, 'reports/visual-qa-component-states.json');

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const requiredVisualEntries = (classificationManifest) => classificationManifest.components
  .filter(({ classification }) => classification === 'visual')
  .map(({ id, renderAccess }) => ({ id, renderAccess }))
  .sort((left, right) => left.id.localeCompare(right.id));

export const buildDraftStateManifest = (classificationManifest, existingManifest = null) => {
  const existingById = new Map((existingManifest?.components ?? []).map((entry) => [entry.id, entry]));
  return {
    schemaVersion: 1,
    id: 'bega-visual-qa-component-states-v1',
    components: requiredVisualEntries(classificationManifest).map(({ id, renderAccess }) => {
      const existing = existingById.get(id);
      if (existing?.status === 'registered') {
        return { ...existing, id, renderAccess };
      }
      return { id, status: 'pending', renderAccess };
    }),
  };
};

const evidenceErrors = (value, requiredFields, label) => requiredFields
  .filter((field) => typeof value?.[field] !== 'string' || value[field].trim().length === 0)
  .map((field) => `${label} requires ${field}`);

const axisValues = (entry, axisName) => entry.axes?.[axisName]?.values ?? null;
const EXECUTABLE_INTERACTION_ACTIONS = new Set([
  'click',
  'hover',
  'focus-visible',
  'pressed',
  'fill',
  'select-option',
  'press-key',
]);
const EXECUTABLE_SETUP_ACTIONS = new Set(['click', 'fill', 'press-key']);
const EXPECTED_INTERACTION_ACTIONS = {
  hover: 'hover',
  'focus-visible': 'focus-visible',
  pressed: 'pressed',
  open: 'click',
  retry: 'click',
  selected: 'click',
  input: 'fill',
  change: ['press-key', 'select-option'],
  submitting: 'click',
  'keyboard-navigation': 'press-key',
};

const conditionValues = (value) => (Array.isArray(value) ? value : [value]);

const matchesWhen = (combination, when) => when == null || Object.entries(when)
  .every(([key, expected]) => {
    const actual = key.startsWith('variant.')
      ? combination.variants[key.slice('variant.'.length)]
      : combination.states[key];
    return conditionValues(expected).includes(actual);
  });

const interactionTargets = (plan, combination) => {
  if (Array.isArray(plan?.targets)) {
    return plan.targets.filter((target) => matchesWhen(combination, target.when));
  }
  if (typeof plan?.selector === 'string' && plan.selector.trim().length > 0) return null;
  return [];
};

const variantDimensions = (entry) => (Array.isArray(entry.variants?.dimensions)
  ? entry.variants.dimensions
  : []);

const isFullyNotApplicableHostedEntry = (entry) => entry.renderAccess === 'hosted'
  && ['data', 'permissions', 'interactions', 'system']
    .every((axisName) => entry.axes?.[axisName]?.notApplicable != null)
  && entry.variants?.notApplicable != null;

const matchesConstraint = (combination, constraint) => Object.entries(constraint.excludeWhen)
  .every(([key, value]) => {
    if (key.startsWith('variant.')) {
      return combination.variants[key.slice('variant.'.length)] === value;
    }
    return combination.states[key] === value;
  });

export const expandComponentStateCombinations = (entry, coverageContract) => {
  const applicableAxes = Object.keys(coverageContract.stateCatalog)
    .map((axisName) => ({ axisName, values: axisValues(entry, axisName) }))
    .filter(({ values }) => Array.isArray(values) && values.length > 0);
  let combinations = [{ states: {}, variants: {} }];
  for (const { axisName, values } of applicableAxes) {
    combinations = combinations.flatMap((combination) => values.map((value) => ({
      ...combination,
      states: { ...combination.states, [axisName]: value },
    })));
  }
  for (const dimension of variantDimensions(entry)) {
    combinations = combinations.flatMap((combination) => dimension.values.map((value) => ({
      ...combination,
      variants: { ...combination.variants, [dimension.name]: value },
    })));
  }
  const constraints = Array.isArray(entry.constraints) ? entry.constraints : [];
  return combinations
    .filter((combination) => !constraints.some((constraint) => matchesConstraint(combination, constraint)))
    .flatMap((combination) => {
      const interaction = combination.states.interactions;
      if (interaction === undefined || interaction === 'default') return [combination];
      const plan = entry.interactionPlans?.[interaction];
      const targets = interactionTargets(plan, combination);
      if (targets === null) return [combination];
      if (Array.isArray(plan?.targets) && targets.length === 0) return [];
      if (targets.length === 0) return [combination];
      return targets.map((target) => ({ ...combination, interactionTarget: target }));
    })
    .map(({ states, variants, interactionTarget }) => ({
      id: [
        ...Object.entries(states).map(([axisName, value]) => `${axisName}=${value}`),
        ...Object.entries(variants).map(([name, value]) => `variant.${name}=${value}`),
        ...(interactionTarget ? [`interactionTarget=${interactionTarget.id}`] : []),
      ].join('|') || 'default',
      states,
      variants,
      ...(interactionTarget ? { interactionTarget } : {}),
    }));
};

const validateRegisteredEntry = (entry, coverageContract) => {
  const errors = [];
  if (entry.renderAccess === 'module-export') {
    if (entry.render?.mode !== 'direct' || typeof entry.render?.adapterId !== 'string'
      || entry.render.adapterId.trim().length === 0) {
      errors.push(`${entry.id} direct render requires adapterId`);
    }
    if (entry.render?.styles !== undefined && !Array.isArray(entry.render.styles)) {
      errors.push(`${entry.id} direct render styles must be an array`);
    } else if (Array.isArray(entry.render?.styles)) {
      if (new Set(entry.render.styles).size !== entry.render.styles.length) {
        errors.push(`${entry.id} direct render contains duplicate styles`);
      }
      for (const stylePath of entry.render.styles) {
        if (typeof stylePath !== 'string'
          || !/^src\/(components|pages)\/.+\.css$/.test(stylePath)) {
          errors.push(`${entry.id} direct render has invalid stylesheet ${stylePath}`);
        }
      }
    }
  } else if (entry.renderAccess === 'hosted') {
    if (entry.render?.mode !== 'hosted' || !Array.isArray(entry.render?.hostScenarioIds)
      || entry.render.hostScenarioIds.length === 0) {
      errors.push(`${entry.id} hosted render requires hostScenarioIds`);
    }
  } else {
    errors.push(`${entry.id} has unknown renderAccess`);
  }

  for (const [axisName, catalogValues] of Object.entries(coverageContract.stateCatalog)) {
    const specification = entry.axes?.[axisName];
    const values = specification?.values;
    const hasValues = Array.isArray(values) && values.length > 0;
    const hasNotApplicable = specification?.notApplicable != null;
    if (hasValues === hasNotApplicable) {
      errors.push(`${entry.id} axis ${axisName} requires exactly one of values or notApplicable`);
      continue;
    }
    if (hasValues) {
      if (new Set(values).size !== values.length) {
        errors.push(`${entry.id} axis ${axisName} contains duplicate values`);
      }
      for (const value of values) {
        if (!catalogValues.includes(value)) {
          errors.push(`${entry.id} axis ${axisName} uses unknown value ${value}`);
        }
      }
    } else {
      errors.push(...evidenceErrors(
        specification.notApplicable,
        coverageContract.combinationPolicy.constraintRequirements,
        `${entry.id} axis ${axisName} notApplicable`,
      ));
    }
  }

  const dimensions = variantDimensions(entry);
  const hasDimensions = dimensions.length > 0;
  const hasNoVariantsEvidence = entry.variants?.notApplicable != null;
  if (hasDimensions === hasNoVariantsEvidence) {
    errors.push(`${entry.id} variants require exactly one of dimensions or notApplicable`);
  }
  if (hasNoVariantsEvidence) {
    errors.push(...evidenceErrors(
      entry.variants.notApplicable,
      coverageContract.combinationPolicy.constraintRequirements,
      `${entry.id} variants notApplicable`,
    ));
  }
  const dimensionNames = dimensions.map(({ name }) => name);
  if (new Set(dimensionNames).size !== dimensionNames.length) {
    errors.push(`${entry.id} contains duplicate variant dimension names`);
  }
  dimensions.forEach((dimension, index) => {
    const label = `${entry.id} variant dimension ${index}`;
    if (typeof dimension.name !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(dimension.name)) {
      errors.push(`${label} requires a stable ASCII name`);
    }
    if (!Array.isArray(dimension.values) || dimension.values.length === 0) {
      errors.push(`${label} requires values`);
    } else {
      if (new Set(dimension.values).size !== dimension.values.length) {
        errors.push(`${label} contains duplicate values`);
      }
      if (dimension.values.some((value) => typeof value !== 'string' || value.length === 0
        || value.includes('|') || value.includes('='))) {
        errors.push(`${label} values must be non-empty strings without | or =`);
      }
    }
    errors.push(...evidenceErrors(
      dimension,
      coverageContract.combinationPolicy.constraintRequirements,
      label,
    ));
  });

  const interactionValues = axisValues(entry, 'interactions') ?? [];
  const interactionPlans = entry.interactionPlans;
  const declaredValuesForCondition = (key) => (key.startsWith('variant.')
    ? dimensions.find(({ name }) => name === key.slice('variant.'.length))?.values
    : axisValues(entry, key));
  const validateWaitSelector = (value, field, label) => {
    if (value !== undefined && (typeof value !== 'string' || value.trim().length === 0)) {
      errors.push(`${label} ${field} must be a non-empty selector`);
    }
  };
  const validateActionPayload = (action, value, key, waitForSelector, label) => {
    if (action === 'fill' && typeof value !== 'string') {
      errors.push(`${label} fill action requires value`);
    }
    if (action === 'select-option' && typeof value !== 'string') {
      errors.push(`${label} select-option action requires value`);
    }
    if (action === 'select-option'
      && (typeof waitForSelector !== 'string' || waitForSelector.trim().length === 0)) {
      errors.push(`${label} select-option action requires waitForSelector`);
    }
    if (action === 'press-key' && (typeof key !== 'string' || key.trim().length === 0)) {
      errors.push(`${label} press-key action requires key`);
    }
    if (action !== 'fill' && action !== 'select-option' && value !== undefined) {
      errors.push(`${label} value is only valid for fill or select-option actions`);
    }
    if (action !== 'press-key' && key !== undefined) {
      errors.push(`${label} key is only valid for press-key actions`);
    }
  };
  const validateSetup = (setup, label) => {
    if (setup === undefined) return;
    if (!Array.isArray(setup) || setup.length === 0) {
      errors.push(`${label} setup must be a non-empty array`);
      return;
    }
    setup.forEach((step, index) => {
      const stepLabel = `${label}.setup.${index}`;
      if (!EXECUTABLE_SETUP_ACTIONS.has(step?.action)) {
        errors.push(`${stepLabel} action ${step?.action ?? '<missing>'} is not executable`);
      }
      if (typeof step?.selector !== 'string' || step.selector.trim().length === 0) {
        errors.push(`${stepLabel} requires selector`);
      }
      validateActionPayload(
        step?.action,
        step?.value,
        step?.key,
        step?.waitForSelector,
        stepLabel,
      );
      validateWaitSelector(step?.waitForSelector, 'waitForSelector', stepLabel);
      validateWaitSelector(step?.waitForHiddenSelector, 'waitForHiddenSelector', stepLabel);
    });
  };
  const validateWhen = (when, label) => {
    if (when === undefined) return;
    if (when == null || typeof when !== 'object' || Array.isArray(when)
      || Object.keys(when).length === 0) {
      errors.push(`${label} when must be a non-empty object`);
      return;
    }
    for (const [key, expected] of Object.entries(when)) {
      const values = conditionValues(expected);
      if (values.length === 0) {
        errors.push(`${label} when ${key} must declare at least one value`);
        continue;
      }
      if (new Set(values).size !== values.length) {
        errors.push(`${label} when ${key} contains duplicate values`);
      }
      const declared = declaredValuesForCondition(key);
      for (const value of values) {
        if (typeof value !== 'string' || !Array.isArray(declared) || !declared.includes(value)) {
          errors.push(`${label} references undeclared ${key}=${value}`);
        }
      }
    }
  };
  if (interactionPlans != null
    && (typeof interactionPlans !== 'object' || Array.isArray(interactionPlans))) {
    errors.push(`${entry.id} interactionPlans must be an object`);
  } else {
    const plans = interactionPlans ?? {};
    for (const interaction of interactionValues.filter((value) => value !== 'default')) {
      const plan = plans[interaction];
      const label = `${entry.id} interactionPlans.${interaction}`;
      if (plan == null) {
        errors.push(`${entry.id} interaction ${interaction} requires interactionPlans.${interaction}`);
        continue;
      }
      const expectedAction = EXPECTED_INTERACTION_ACTIONS[interaction];
      if (expectedAction === undefined) {
        errors.push(`${label} has no executable action mapping for ${interaction}`);
      } else if (!(Array.isArray(expectedAction)
        ? expectedAction.includes(plan.action)
        : plan.action === expectedAction)) {
        errors.push(`${label} action must equal ${conditionValues(expectedAction).join(' or ')}`);
      }
      if (!EXECUTABLE_INTERACTION_ACTIONS.has(plan.action)) {
        errors.push(`${label} action ${plan.action ?? '<missing>'} is not executable`);
      }
      const hasSelector = typeof plan.selector === 'string' && plan.selector.trim().length > 0;
      const declaresTargets = plan.targets !== undefined;
      if (hasSelector === declaresTargets) {
        errors.push(`${label} requires exactly one of selector or targets`);
      }
      if (Array.isArray(plan.targets)) {
        if (plan.targets.length === 0) {
          errors.push(`${label} targets must not be empty`);
        }
        const targetIds = plan.targets.map(({ id }) => id);
        if (new Set(targetIds).size !== targetIds.length) {
          errors.push(`${label} contains duplicate target ids`);
        }
        plan.targets.forEach((target, index) => {
          const targetLabel = `${label}.targets.${index}`;
          if (typeof target.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(target.id)) {
            errors.push(`${targetLabel} requires a stable ASCII id`);
          }
          if (typeof target.selector !== 'string' || target.selector.trim().length === 0) {
            errors.push(`${targetLabel} requires selector`);
          }
          validateWhen(target.when, targetLabel);
          validateSetup(target.setup, targetLabel);
          validateActionPayload(
            plan.action,
            target.value ?? plan.value,
            target.key ?? plan.key,
            target.waitForSelector ?? plan.waitForSelector,
            targetLabel,
          );
          validateWaitSelector(target.waitForSelector, 'waitForSelector', targetLabel);
          validateWaitSelector(target.waitForHiddenSelector, 'waitForHiddenSelector', targetLabel);
        });
      }
      if (!declaresTargets) {
        validateActionPayload(plan.action, plan.value, plan.key, plan.waitForSelector, label);
      }
      validateSetup(plan.setup, label);
      validateWaitSelector(plan.waitForSelector, 'waitForSelector', label);
      validateWaitSelector(plan.waitForHiddenSelector, 'waitForHiddenSelector', label);
      errors.push(...evidenceErrors(
        plan,
        coverageContract.combinationPolicy.constraintRequirements,
        label,
      ));
    }
    for (const interaction of Object.keys(plans)) {
      if (!interactionValues.includes(interaction) || interaction === 'default') {
        errors.push(`${entry.id} has undeclared interaction plan ${interaction}`);
      }
    }
  }

  if (!Array.isArray(entry.constraints)) {
    errors.push(`${entry.id} constraints must be an array`);
  } else {
    entry.constraints.forEach((constraint, index) => {
      const label = `${entry.id} constraint ${index}`;
      if (!constraint.excludeWhen || typeof constraint.excludeWhen !== 'object'
        || Array.isArray(constraint.excludeWhen) || Object.keys(constraint.excludeWhen).length === 0) {
        errors.push(`${label} requires excludeWhen`);
      } else {
        for (const [key, value] of Object.entries(constraint.excludeWhen)) {
          const values = key.startsWith('variant.')
            ? dimensions.find(({ name }) => name === key.slice('variant.'.length))?.values
            : axisValues(entry, key);
          if (!Array.isArray(values) || !values.includes(value)) {
            errors.push(`${label} references undeclared ${key}=${value}`);
          }
        }
      }
      errors.push(...evidenceErrors(
        constraint,
        coverageContract.combinationPolicy.constraintRequirements,
        label,
      ));
    });
  }

  if (errors.length === 0 && expandComponentStateCombinations(entry, coverageContract).length === 0) {
    errors.push(`${entry.id} constraints exclude every declared combination`);
  }
  return errors;
};

export const validateComponentStateManifest = ({
  manifest,
  classificationManifest,
  coverageContract,
  requireComplete,
}) => {
  const required = requiredVisualEntries(classificationManifest);
  const requiredIds = new Set(required.map(({ id }) => id));
  const entries = Array.isArray(manifest.components) ? manifest.components : [];
  const counts = new Map();
  entries.forEach(({ id }) => counts.set(id, (counts.get(id) ?? 0) + 1));
  const duplicates = [...counts].filter(([, count]) => count > 1).map(([id]) => id).sort();
  const manifestIds = new Set(entries.map(({ id }) => id));
  const missing = required.filter(({ id }) => !manifestIds.has(id)).map(({ id }) => id);
  const stale = entries.filter(({ id }) => !requiredIds.has(id)).map(({ id }) => id).sort();
  const pending = entries.filter(({ id, status }) => requiredIds.has(id) && status === 'pending')
    .map(({ id }) => id).sort();
  const errors = [];
  if (manifest.schemaVersion !== 1) errors.push('state manifest schemaVersion must be 1');
  entries.forEach((entry) => {
    if (!requiredIds.has(entry.id)) return;
    const expected = required.find(({ id }) => id === entry.id);
    if (entry.renderAccess !== expected.renderAccess) {
      errors.push(`${entry.id} renderAccess does not match classification manifest`);
    }
    if (entry.status === 'registered') {
      errors.push(...validateRegisteredEntry(entry, coverageContract));
    } else if (entry.status !== 'pending') {
      errors.push(`${entry.id} has unknown status ${entry.status}`);
    }
  });
  const registeredEntries = entries.filter(({ id, status }) => requiredIds.has(id) && status === 'registered');
  const directScenarioIds = new Set(registeredEntries
    .filter((entry) => (
      entry.renderAccess === 'module-export'
      && validateRegisteredEntry(entry, coverageContract).length === 0
    ))
    .flatMap((entry) => expandComponentStateCombinations(entry, coverageContract)
      .map(({ id }) => `state:${entry.id}:${id}`)));
  registeredEntries
    .filter(({ renderAccess }) => renderAccess === 'hosted')
    .forEach((entry) => {
      for (const hostScenarioId of entry.render?.hostScenarioIds ?? []) {
        if (!directScenarioIds.has(hostScenarioId)) {
          errors.push(`${entry.id} references unknown host scenario ${hostScenarioId}`);
        }
      }
    });
  const validCombinations = registeredEntries.reduce(
    (total, entry) => total + (
      validateRegisteredEntry(entry, coverageContract).length === 0
        && !isFullyNotApplicableHostedEntry(entry)
        ? expandComponentStateCombinations(entry, coverageContract).length
        : 0
    ),
    0,
  );
  const ok = duplicates.length === 0 && missing.length === 0 && stale.length === 0
    && errors.length === 0 && (!requireComplete || pending.length === 0);
  return {
    ok,
    total: required.length,
    registered: registeredEntries.length,
    pending,
    duplicates,
    missing,
    stale,
    errors,
    validCombinations,
  };
};

const main = async () => {
  const args = new Set(process.argv.slice(2));
  const refresh = args.has('--refresh');
  const requireComplete = args.has('--check');
  const classificationManifest = await readJson(classificationPath);
  const coverageContract = await readJson(coverageContractPath);
  let manifest;
  if (refresh) {
    let existing = null;
    try {
      existing = await readJson(defaultManifestPath);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    manifest = buildDraftStateManifest(classificationManifest, existing);
    await writeFile(defaultManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  } else {
    manifest = await readJson(defaultManifestPath);
  }
  const validation = validateComponentStateManifest({
    manifest,
    classificationManifest,
    coverageContract,
    requireComplete,
  });
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    ...validation,
  };
  await mkdir(dirname(defaultReportPath), { recursive: true });
  await writeFile(defaultReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(
    `[visual-qa:states] ${validation.registered}/${validation.total} registered · `
      + `${validation.pending.length} pending · ${validation.validCombinations} valid combinations`,
  );
  console.log('[visual-qa:states] report=reports/visual-qa-component-states.json');
  if (!validation.ok) {
    const incompleteOnly = validation.errors.length === 0
      && validation.duplicates.length === 0
      && validation.missing.length === 0
      && validation.stale.length === 0
      && validation.pending.length > 0;
    if (requireComplete || !incompleteOnly) process.exitCode = 1;
  }
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(`[visual-qa:states] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
