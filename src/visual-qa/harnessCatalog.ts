import classificationManifest from '../../contracts/visual-qa-component-classifications-v1.json';
import componentStateManifest from '../../contracts/visual-qa-component-states-v1.json';

import type { ComponentStateValues, ComponentVariantValues } from './stateAdapters';

type ClassificationEntry = {
  id: string;
  classification: string;
  renderAccess: 'module-export' | 'hosted';
  exportName?: string;
};

export type AutomaticIconScenario = {
  id: string;
  kind: 'icon';
  componentId: string;
  file: string;
  moduleKey: string;
  exportName: string;
  renderAccess: 'module-export';
  finalCoverage: false;
};

export type AutomaticComponentProbeScenario = {
  id: string;
  kind: 'component-probe';
  componentId: string;
  file: string;
  moduleKey: string;
  exportName: string;
  renderAccess: 'module-export';
  finalCoverage: false;
};

export type AutomaticComponentStateScenario = {
  id: string;
  kind: 'component-state';
  componentId: string;
  file: string;
  moduleKey: string;
  exportName: string;
  renderAccess: 'module-export';
  adapterId: string;
  styleModuleKeys: string[];
  states: ComponentStateValues;
  variants: ComponentVariantValues;
  interactionPlan?: {
    action: 'click' | 'hover' | 'focus-visible' | 'pressed' | 'fill' | 'press-key';
    selector: string;
    targetId?: string;
    value?: string;
    key?: string;
    setup?: InteractionStep[];
    waitForSelector?: string;
    waitForHiddenSelector?: string;
  };
  stateCombinationId: string;
  finalCoverage: false;
};

type StateManifestEntry = {
  id: string;
  status: 'pending' | 'registered';
  renderAccess: 'module-export' | 'hosted';
  render?: {
    mode: 'direct' | 'hosted';
    adapterId?: string;
    exportName?: string;
    moduleFile?: string;
    styles?: string[];
  };
  axes?: Partial<Record<'data' | 'permissions' | 'interactions' | 'system', {
    values?: string[];
  }>>;
  variants?: {
    dimensions?: Array<{
      name: string;
      values: string[];
    }>;
  };
  interactionPlans?: Record<string, {
    action: 'click' | 'hover' | 'focus-visible' | 'pressed' | 'fill' | 'press-key';
    selector?: string;
    value?: string;
    key?: string;
    setup?: InteractionStep[];
    waitForSelector?: string;
    waitForHiddenSelector?: string;
    targets?: Array<InteractionTarget>;
  }>;
  constraints?: Array<{
    excludeWhen: Record<string, string>;
  }>;
};

type InteractionStep = {
  action: 'click' | 'fill' | 'press-key';
  selector: string;
  value?: string;
  key?: string;
  waitForSelector?: string;
  waitForHiddenSelector?: string;
};

type InteractionTarget = {
  id: string;
  selector: string;
  value?: string;
  key?: string;
  when?: Record<string, string | string[]>;
  setup?: InteractionStep[];
  waitForSelector?: string;
  waitForHiddenSelector?: string;
};

type DirectStateManifestEntry = StateManifestEntry & {
  status: 'registered';
  renderAccess: 'module-export';
  render: {
    mode: 'direct';
    adapterId: string;
    exportName?: string;
    moduleFile?: string;
  };
};

type AutomaticHarnessScenario = AutomaticIconScenario
  | AutomaticComponentProbeScenario
  | AutomaticComponentStateScenario;

const componentFile = (componentId: string) => componentId.slice(0, componentId.indexOf('#'));

export const componentModuleKey = (file: string) => `../${file.replace(/^src\//, '')}`;

export const componentStyleModuleKeys = (styles: string[]) => styles.map(componentModuleKey);

const qaOnlyDirectModuleExports: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['src/components/visual-qa/MateMobileDateFilterHarness.tsx', new Set([
    'src/components/MateMobileDateFilter.tsx#mateMobileDateFilterVisualQaHarness',
  ])],
  ['src/components/visual-qa/MateListControlLeavesHarnesses.tsx', new Set([
    'src/components/MateSeatFilterButtons.tsx#mateSeatFilterButtonsVisualQaHarness',
    'src/components/MateSortDropdown.tsx#mateSortDropdownVisualQaHarness',
    'src/components/MateStatusTabs.tsx#mateStatusTabsVisualQaHarness',
  ])],
]);

export const resolveDirectModuleFile = (
  componentFilePath: string,
  moduleFile: string | undefined,
  exportName: string,
) => {
  if (moduleFile === undefined) return componentFilePath;
  const allowedExports = qaOnlyDirectModuleExports.get(moduleFile);
  if (!allowedExports?.has(`${componentFilePath}#${exportName}`)) {
    throw new Error(`unknown or mismatched direct module export: ${moduleFile}#${exportName}`);
  }
  return moduleFile;
};

export const AUTOMATIC_ICON_SCENARIOS: AutomaticIconScenario[] = (
  classificationManifest.components as ClassificationEntry[]
)
  .filter((entry): entry is ClassificationEntry & {
    exportName: string;
    renderAccess: 'module-export';
  } => entry.classification === 'grouped-gallery'
    && entry.renderAccess === 'module-export'
    && typeof entry.exportName === 'string'
    && entry.exportName.length > 0)
  .map((entry) => {
    const file = componentFile(entry.id);
    return {
      id: `icon:${entry.id}`,
      kind: 'icon' as const,
      componentId: entry.id,
      file,
      moduleKey: componentModuleKey(file),
      exportName: entry.exportName,
      renderAccess: 'module-export' as const,
      finalCoverage: false as const,
    };
  })
  .sort((left, right) => left.componentId.localeCompare(right.componentId));

export const AUTOMATIC_COMPONENT_PROBE_SCENARIOS: AutomaticComponentProbeScenario[] = (
  classificationManifest.components as ClassificationEntry[]
)
  .filter((entry): entry is ClassificationEntry & {
    exportName: string;
    renderAccess: 'module-export';
  } => entry.classification === 'visual'
    && entry.renderAccess === 'module-export'
    && typeof entry.exportName === 'string'
    && entry.exportName.length > 0)
  .map((entry) => {
    const file = componentFile(entry.id);
    return {
      id: `component-probe:${entry.id}`,
      kind: 'component-probe' as const,
      componentId: entry.id,
      file,
      moduleKey: componentModuleKey(file),
      exportName: entry.exportName,
      renderAccess: 'module-export' as const,
      finalCoverage: false as const,
    };
  })
  .sort((left, right) => left.componentId.localeCompare(right.componentId));

const stateAxisOrder = ['data', 'permissions', 'interactions', 'system'] as const;

export const resolveInteractionPlan = (
  entry: Pick<StateManifestEntry, 'interactionPlans'>,
  states: ComponentStateValues,
  interactionTarget?: InteractionTarget,
) => {
  const interaction = states.interactions;
  if (interaction === undefined || interaction === 'default') return undefined;
  const plan = entry.interactionPlans?.[interaction];
  if (!plan) throw new Error(`missing executable interaction plan for ${interaction}`);
  const resolvedPlan = {
    action: plan.action,
    setup: [...(plan.setup ?? []), ...(interactionTarget?.setup ?? [])],
    waitForSelector: interactionTarget?.waitForSelector ?? plan.waitForSelector,
    waitForHiddenSelector: interactionTarget?.waitForHiddenSelector ?? plan.waitForHiddenSelector,
  };
  if (interactionTarget) {
    return {
      action: resolvedPlan.action,
      selector: interactionTarget.selector,
      targetId: interactionTarget.id,
      ...((interactionTarget.value ?? plan.value) !== undefined
        ? { value: interactionTarget.value ?? plan.value }
        : {}),
      ...(interactionTarget.key ?? plan.key
        ? { key: interactionTarget.key ?? plan.key }
        : {}),
      ...(resolvedPlan.setup.length > 0 ? { setup: resolvedPlan.setup } : {}),
      ...(resolvedPlan.waitForSelector
        ? { waitForSelector: resolvedPlan.waitForSelector }
        : {}),
      ...(resolvedPlan.waitForHiddenSelector
        ? { waitForHiddenSelector: resolvedPlan.waitForHiddenSelector }
        : {}),
    };
  }
  if (!plan.selector) throw new Error(`missing executable interaction target for ${interaction}`);
  return {
    action: resolvedPlan.action,
    selector: plan.selector,
    ...(plan.value !== undefined ? { value: plan.value } : {}),
    ...(plan.key ? { key: plan.key } : {}),
    ...(resolvedPlan.setup.length > 0 ? { setup: resolvedPlan.setup } : {}),
    ...(resolvedPlan.waitForSelector ? { waitForSelector: resolvedPlan.waitForSelector } : {}),
    ...(resolvedPlan.waitForHiddenSelector
      ? { waitForHiddenSelector: resolvedPlan.waitForHiddenSelector }
      : {}),
  };
};

type StateCombination = {
  states: ComponentStateValues;
  variants: ComponentVariantValues;
  interactionTarget?: InteractionTarget;
};

const matchesInteractionTarget = (
  target: InteractionTarget,
  combination: StateCombination,
) => target.when == null || Object.entries(target.when).every(([key, expected]) => {
  const actual = key.startsWith('variant.')
    ? combination.variants[key.slice('variant.'.length)]
    : combination.states[key as keyof ComponentStateValues];
  return (Array.isArray(expected) ? expected : [expected]).includes(actual ?? '');
});

export const expandInteractionTargets = (
  entry: Pick<StateManifestEntry, 'interactionPlans'>,
  combination: StateCombination,
): StateCombination[] => {
  const interaction = combination.states.interactions;
  if (interaction === undefined || interaction === 'default') return [combination];
  const plan = entry.interactionPlans?.[interaction];
  if (!plan?.targets?.length) return [combination];
  return plan.targets
    .filter((target) => matchesInteractionTarget(target, combination))
    .map((target) => ({ ...combination, interactionTarget: target }));
};

const expandStateCombinations = (entry: StateManifestEntry) => {
  let combinations: StateCombination[] = [{ states: {}, variants: {} }];
  for (const axisName of stateAxisOrder) {
    const values = entry.axes?.[axisName]?.values;
    if (!values?.length) continue;
    combinations = combinations.flatMap((combination) => values.map((value) => ({
      ...combination,
      states: { ...combination.states, [axisName]: value },
    })));
  }
  for (const dimension of entry.variants?.dimensions ?? []) {
    combinations = combinations.flatMap((combination) => dimension.values.map((value) => ({
      ...combination,
      variants: { ...combination.variants, [dimension.name]: value },
    })));
  }
  return combinations.filter(({ states, variants }) => !(entry.constraints ?? [])
    .some(({ excludeWhen }) => Object.entries(excludeWhen).every(([key, value]) => (
      key.startsWith('variant.')
        ? variants[key.slice('variant.'.length)] === value
        : states[key as keyof ComponentStateValues] === value
    )))).flatMap((combination) => expandInteractionTargets(entry, combination));
};

const classificationsById = new Map(
  (classificationManifest.components as ClassificationEntry[]).map((entry) => [entry.id, entry] as const),
);

export const AUTOMATIC_COMPONENT_STATE_SCENARIOS: AutomaticComponentStateScenario[] = (
  componentStateManifest.components as StateManifestEntry[]
)
  .filter((entry): entry is DirectStateManifestEntry => entry.status === 'registered'
    && entry.renderAccess === 'module-export'
    && entry.render?.mode === 'direct'
    && typeof entry.render.adapterId === 'string')
  .flatMap((entry) => {
    const classification = classificationsById.get(entry.id);
    if (typeof classification?.exportName !== 'string') return [];
    const file = componentFile(entry.id);
    const exportName = entry.render.exportName ?? classification.exportName;
    const moduleFile = resolveDirectModuleFile(file, entry.render.moduleFile, exportName);
    const adapterId = entry.render.adapterId;
    return expandStateCombinations(entry).map(({ states, variants, interactionTarget }) => {
      const stateCombinationId = [
        ...stateAxisOrder
          .filter((axisName) => states[axisName] !== undefined)
          .map((axisName) => `${axisName}=${states[axisName]}`),
        ...Object.entries(variants).map(([name, value]) => `variant.${name}=${value}`),
        ...(interactionTarget ? [`interactionTarget=${interactionTarget.id}`] : []),
      ].join('|') || 'default';
      return {
        id: `state:${entry.id}:${stateCombinationId}`,
        kind: 'component-state' as const,
        componentId: entry.id,
        file,
        moduleKey: componentModuleKey(moduleFile),
        exportName,
        renderAccess: 'module-export' as const,
        adapterId,
        styleModuleKeys: componentStyleModuleKeys(entry.render.styles ?? []),
        states,
        variants,
        interactionPlan: resolveInteractionPlan(entry, states, interactionTarget),
        stateCombinationId,
        finalCoverage: false as const,
      };
    });
  })
  .sort((left, right) => left.id.localeCompare(right.id));

const automaticScenariosBySelection = new Map<string, AutomaticHarnessScenario>(
  [...AUTOMATIC_ICON_SCENARIOS, ...AUTOMATIC_COMPONENT_PROBE_SCENARIOS]
    .map((scenario) => [scenario.componentId, scenario] as const),
);

AUTOMATIC_COMPONENT_STATE_SCENARIOS.forEach((scenario) => {
  automaticScenariosBySelection.set(scenario.id, scenario);
});

export const resolveHarnessScenario = (selectionId: string) =>
  automaticScenariosBySelection.get(selectionId) ?? null;
