import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AUTOMATIC_COMPONENT_PROBE_SCENARIOS,
  AUTOMATIC_COMPONENT_STATE_SCENARIOS,
  AUTOMATIC_ICON_SCENARIOS,
} from '../src/visual-qa/harnessCatalog';
import {
  executeHarnessInteractionPlan,
  revalidateHarnessInteractionPlan,
  type HarnessInteractionPage,
  type HarnessInteractionPlan,
} from './visual-qa-harness-interactions';

type HarnessInteractionEvidence = HarnessInteractionPlan & {
  captureVerified?: true;
  revalidatedAfterViewportExpansion?: boolean;
  verified: true;
  viewportExpanded?: boolean;
};

type HarnessResult = {
  scenarioId: string;
  componentId: string;
  status: 'pass' | 'fail';
  attempts?: number;
  error?: string;
  failureType?: ReturnType<typeof classifyHarnessFailure>;
  retryHistory?: Array<{
    error?: string;
    failureType?: ReturnType<typeof classifyHarnessFailure>;
  }>;
  screenshot?: string;
  interaction?: HarnessInteractionEvidence;
  navigation?: {
    actualHash?: string;
    actualPathname: string;
    actualSearch?: string;
    expectedHash?: string;
    expectedPathname: string;
    expectedSearch?: string;
    verified: true;
  };
};

type HarnessReadyOutcome = {
  harness?: {
    componentId?: string;
    scenarioId?: string;
    state?: string;
    message?: string;
  };
  renderedComponentId: string | null;
  renderedScenarioId: string | null;
  renderedNodes: number;
  captureSelector: string | null;
  boundedHeightViolations?: Array<{
    actualHeight: number;
    maxHeight: number;
    selector: string;
  }>;
  touchTargetViolations?: Array<{
    actualHeight: number;
    actualWidth: number;
    minimumSize: number;
    selector: string;
  }>;
  actualRouterHash?: string | null;
  actualRouterPathname?: string | null;
  actualRouterSearch?: string | null;
  expectedComponentId: string;
  expectedHash?: string | null;
  expectedPathname?: string | null;
  expectedSearch?: string | null;
  expectedScenarioId: string;
};

type HarnessScope = 'icons' | 'component-probes' | 'component-states' | 'all';

export const selectHarnessScenarios = (scope: HarnessScope) => {
  if (scope === 'icons') return AUTOMATIC_ICON_SCENARIOS;
  if (scope === 'component-probes') return AUTOMATIC_COMPONENT_PROBE_SCENARIOS;
  if (scope === 'component-states') return AUTOMATIC_COMPONENT_STATE_SCENARIOS;
  return [
    ...AUTOMATIC_ICON_SCENARIOS,
    ...AUTOMATIC_COMPONENT_PROBE_SCENARIOS,
    ...AUTOMATIC_COMPONENT_STATE_SCENARIOS,
  ];
};

export const selectRequestedScenarios = <Scenario extends { id: string; componentId: string }>(
  scenarios: Scenario[],
  requestedIds: string[],
) => {
  const scenariosByComponentId = new Map<string, Scenario[]>();
  scenarios.forEach((scenario) => {
    const existing = scenariosByComponentId.get(scenario.componentId);
    if (existing) existing.push(scenario);
    else scenariosByComponentId.set(scenario.componentId, [scenario]);
  });
  const scenariosById = new Map(scenarios.map((scenario) => [scenario.id, scenario] as const));
  const unknownIds = requestedIds.filter((requestedId) => (
    !scenariosById.has(requestedId) && !scenariosByComponentId.has(requestedId)
  ));
  if (unknownIds.length > 0) {
    throw new Error(`Unknown harness component ids: ${unknownIds.join(', ')}`);
  }
  return requestedIds.flatMap((requestedId) => {
    const exactScenario = scenariosById.get(requestedId);
    return exactScenario ? [exactScenario] : (scenariosByComponentId.get(requestedId) ?? []);
  });
};

export const selectRequestedInteractionScenarios = <Scenario extends { id: string }>(
  scenarios: Scenario[],
  requestedInteractions: string[],
) => {
  if (requestedInteractions.length === 0) return scenarios;
  const interactionFor = (scenario: Scenario) => (
    scenario.id.match(/(?:^|\|)interactions=([^|]+)/)?.[1]
  );
  const availableInteractions = new Set(
    scenarios.map(interactionFor).filter((interaction): interaction is string => Boolean(interaction)),
  );
  const unknownInteractions = requestedInteractions.filter(
    (interaction) => !availableInteractions.has(interaction),
  );
  if (unknownInteractions.length > 0) {
    throw new Error(`Unknown harness interaction states: ${unknownInteractions.join(', ')}`);
  }
  const requestedSet = new Set(requestedInteractions);
  return scenarios.filter((scenario) => requestedSet.has(interactionFor(scenario) ?? ''));
};

export const selectRequestedDataStateScenarios = <Scenario extends { id: string }>(
  scenarios: Scenario[],
  requestedDataStates: string[],
) => {
  if (requestedDataStates.length === 0) return scenarios;
  const dataStateFor = (scenario: Scenario) => (
    scenario.id.match(/(?:^|[|:])data=([^|]+)/)?.[1]
  );
  const availableDataStates = new Set(
    scenarios.map(dataStateFor).filter((dataState): dataState is string => Boolean(dataState)),
  );
  const unknownDataStates = requestedDataStates.filter(
    (dataState) => !availableDataStates.has(dataState),
  );
  if (unknownDataStates.length > 0) {
    throw new Error(`Unknown harness data states: ${unknownDataStates.join(', ')}`);
  }
  const requestedSet = new Set(requestedDataStates);
  return scenarios.filter((scenario) => requestedSet.has(dataStateFor(scenario) ?? ''));
};

export const resolveHarnessGroupSize = (rawValue: string | undefined) => {
  const groupSize = Number(rawValue ?? 50);
  if (!Number.isInteger(groupSize) || groupSize < 1) {
    throw new Error('VISUAL_QA_HARNESS_GROUP_SIZE must be a positive integer');
  }
  return groupSize;
};

export const groupScenariosByModule = <Scenario extends { moduleKey: string }>(
  scenarios: Scenario[],
  maximumEntries = Number.POSITIVE_INFINITY,
) => {
  if (maximumEntries !== Number.POSITIVE_INFINITY
    && (!Number.isInteger(maximumEntries) || maximumEntries < 1)) {
    throw new Error('maximum module group entries must be a positive integer');
  }
  const groupsByModule = new Map<string, {
    moduleKey: string;
    entries: Array<{ index: number; scenario: Scenario }>;
  }>();
  scenarios.forEach((scenario, index) => {
    const existing = groupsByModule.get(scenario.moduleKey);
    if (existing) {
      existing.entries.push({ index, scenario });
      return;
    }
    groupsByModule.set(scenario.moduleKey, {
      moduleKey: scenario.moduleKey,
      entries: [{ index, scenario }],
    });
  });
  return [...groupsByModule.values()].flatMap((group) => {
    if (group.entries.length <= maximumEntries) return [group];
    const shards = [];
    for (let start = 0; start < group.entries.length; start += maximumEntries) {
      shards.push({
        moduleKey: group.moduleKey,
        entries: group.entries.slice(start, start + maximumEntries),
      });
    }
    return shards;
  });
};

export const classifyHarnessFailure = (message: string) => {
  if (message === 'component produced no rendered node') return 'empty-render' as const;
  if (/(?:locator|page)\.screenshot|screenshot capture/i.test(message)) return 'screenshot-capture' as const;
  if (/Timeout \d+(?:\.\d+)?ms exceeded/.test(message)) return 'harness-timeout' as const;
  if (/Execution context was destroyed|most likely because of a navigation|ERR_HTTP_RESPONSE_CODE_FAILURE|Failed to read the 'localStorage' property from 'Window'/i.test(message)) {
    return 'page-lifecycle' as const;
  }
  if (/must be used within .*Provider/.test(message)) return 'missing-provider' as const;
  if (/Element type is invalid/.test(message)) return 'non-component-runtime' as const;
  if (/Cannot read properties of (?:undefined|null)|Cannot convert undefined or null|not iterable/.test(message)) {
    return 'missing-props' as const;
  }
  if (/React export를 찾을 수 없습니다|모듈을 찾을 수 없습니다|dynamically imported module/i.test(message)) {
    return 'module-load' as const;
  }
  return 'render-error' as const;
};

export const resolveHarnessReadinessNodeCount = ({
  captureNodeCount,
  hasInteraction,
  surfaceChildCount,
}: {
  captureNodeCount: number;
  hasInteraction: boolean;
  surfaceChildCount: number;
}) => (captureNodeCount > 0
  ? captureNodeCount
  : hasInteraction
    ? surfaceChildCount
    : 0);

export const assertHarnessReadyOutcome = (outcome: HarnessReadyOutcome) => {
  if (outcome.harness?.state !== 'ready'
    || outcome.harness?.scenarioId !== outcome.expectedScenarioId
    || outcome.renderedComponentId !== outcome.expectedComponentId
    || outcome.renderedScenarioId !== outcome.expectedScenarioId
    || outcome.renderedNodes < 1) {
    throw new Error(outcome.harness?.message ?? 'component produced no rendered node');
  }
  const boundedHeightViolation = outcome.boundedHeightViolations?.[0];
  if (boundedHeightViolation) {
    throw new Error(
      `${boundedHeightViolation.selector} exceeds visual height budget: `
      + `${boundedHeightViolation.actualHeight}px > ${boundedHeightViolation.maxHeight}px`,
    );
  }
  const touchTargetViolation = outcome.touchTargetViolations?.[0];
  if (touchTargetViolation) {
    throw new Error(
      `${touchTargetViolation.selector} touch target is `
      + `${touchTargetViolation.actualHeight}x${touchTargetViolation.actualWidth}px `
      + `(height x width), minimum ${touchTargetViolation.minimumSize}px`,
    );
  }
  if (outcome.expectedPathname
    && outcome.actualRouterPathname !== outcome.expectedPathname) {
    throw new Error(
      `expected router pathname ${outcome.expectedPathname} but received ${outcome.actualRouterPathname ?? '<missing>'}`,
    );
  }
  if (outcome.expectedSearch != null
    && outcome.actualRouterSearch !== outcome.expectedSearch) {
    throw new Error(
      `expected router search ${outcome.expectedSearch || '<empty>'} but received ${outcome.actualRouterSearch || '<empty>'}`,
    );
  }
  if (outcome.expectedHash != null
    && outcome.actualRouterHash !== outcome.expectedHash) {
    throw new Error(
      `expected router hash ${outcome.expectedHash || '<empty>'} but received ${outcome.actualRouterHash || '<empty>'}`,
    );
  }
};

const RETRYABLE_HARNESS_FAILURES = new Set<ReturnType<typeof classifyHarnessFailure>>([
  'harness-timeout',
  'module-load',
  'page-lifecycle',
  'screenshot-capture',
]);

export const shouldResetHarnessPageAfterResult = (
  pageMode: ReturnType<typeof resolveHarnessPageMode>,
  result: Pick<HarnessResult, 'failureType' | 'status'>,
) => pageMode === 'reuse'
  && result.status === 'fail'
  && result.failureType !== undefined
  && RETRYABLE_HARNESS_FAILURES.has(result.failureType);

export const shouldResetHarnessPageAfterGroup = (
  pageMode: ReturnType<typeof resolveHarnessPageMode>,
  groupEntryCount: number,
) => pageMode === 'reuse' && groupEntryCount > 0;

export const executeHarnessScenarioWithRetry = async (
  execute: () => Promise<HarnessResult>,
): Promise<HarnessResult> => {
  const retryHistory: NonNullable<HarnessResult['retryHistory']> = [];
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await execute();
    const retryable = result.status === 'fail'
      && result.failureType !== undefined
      && RETRYABLE_HARNESS_FAILURES.has(result.failureType);
    if (result.status === 'pass' || !retryable || attempt === 2) {
      return {
        ...result,
        attempts: attempt,
        ...(retryHistory.length > 0 ? { retryHistory } : {}),
      };
    }
    retryHistory.push({
      error: result.error,
      failureType: result.failureType,
    });
  }
  throw new Error('Visual QA harness retry loop exhausted unexpectedly.');
};

export const resolveHarnessTimeoutMs = (value: string | undefined) => {
  if (value === undefined) return 60_000;
  const timeoutMs = Number(value);
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('VISUAL_QA_HARNESS_TIMEOUT_MS must be a positive integer');
  }
  return timeoutMs;
};

export const resolveHarnessBrowserEngine = (value: string | undefined) => {
  if (value === undefined || value === 'chrome') return 'chrome' as const;
  if (value === 'chromium') return 'chromium' as const;
  throw new Error('VISUAL_QA_HARNESS_BROWSER must be either chrome or chromium');
};

export const resolveHarnessPageMode = (value: string | undefined) => {
  if (value === undefined || value === 'reuse') return 'reuse' as const;
  if (value === 'fresh') return 'fresh' as const;
  throw new Error('VISUAL_QA_HARNESS_PAGE_MODE must be fresh or reuse');
};

export const resolveHarnessCaptureHeightMode = (value: string | undefined) => {
  if (value === undefined || value === 'mobile') return 'mobile' as const;
  if (value === 'expand-tall-flow') return 'expand-tall-flow' as const;
  throw new Error(
    'VISUAL_QA_HARNESS_CAPTURE_HEIGHT_MODE must be mobile or expand-tall-flow',
  );
};

export const componentScreenshotFileName = (componentId: string) => {
  const [file, symbol = 'component'] = componentId.split('#', 2);
  const fileStem = basename(file).replace(/\.[^.]+$/, '');
  const slug = `${fileStem}-${symbol}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '') || 'component';
  const hash = createHash('sha256').update(componentId).digest('hex').slice(0, 12);
  return `${slug}-${hash}.png`;
};

type ScreenshotClip = { x: number; y: number; width: number; height: number };

export const resolveScreenshotClip = (box: ScreenshotClip | null) => {
  if (!box || !Number.isFinite(box.width) || !Number.isFinite(box.height)
    || box.width <= 0 || box.height <= 0) {
    throw new Error('screenshot capture: harness surface is not measurable');
  }
  return box;
};

export const expandViewportForCaptureSurface = async (page: {
  evaluate: (
    fn: (input: { resetPageScroll: boolean; selector: string }) => {
      belongsToFixedLayer: boolean;
      documentHeight: number;
    } | Promise<{
      belongsToFixedLayer: boolean;
      documentHeight: number;
    }>,
    input: { resetPageScroll: boolean; selector: string },
  ) => Promise<{ belongsToFixedLayer: boolean; documentHeight: number }>;
  locator: (selector: string) => {
    boundingBox: () => Promise<ScreenshotClip | null>;
  };
  viewportSize: () => { width: number; height: number } | null;
  setViewportSize: (size: { width: number; height: number }) => Promise<void>;
}, captureSelector: string, expandTallFlow = false) => {
  const captureMetrics = await page.evaluate(async ({ resetPageScroll, selector }) => {
    if (resetPageScroll) {
      window.scrollTo(0, 0);
      await new Promise<void>((resolveFrame) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
      });
    }
    let node = document.querySelector(selector) as HTMLElement | null;
    let belongsToFixedLayer = false;
    while (node) {
      if (window.getComputedStyle(node).position === 'fixed') {
        belongsToFixedLayer = true;
        break;
      }
      node = node.parentElement;
    }
    return {
      belongsToFixedLayer,
      documentHeight: Math.max(
        document.documentElement.scrollHeight,
        document.body?.scrollHeight ?? 0,
      ),
    };
  }, { resetPageScroll: expandTallFlow, selector: captureSelector });
  if (captureMetrics.belongsToFixedLayer || !expandTallFlow) return false;
  const box = resolveScreenshotClip(await page.locator(captureSelector).boundingBox());
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('screenshot capture: viewport size is unavailable');
  const documentRequiredHeight = captureMetrics.documentHeight > viewport.height
    ? captureMetrics.documentHeight + 32
    : captureMetrics.documentHeight;
  const boxRight = Math.max(0, box.x) + box.width;
  const requiredWidth = boxRight > viewport.width
    ? Math.ceil(boxRight + 32)
    : viewport.width;
  const requiredHeight = Math.ceil(Math.max(
    Math.max(0, box.y) + box.height + 32,
    documentRequiredHeight,
  ));
  if (requiredWidth <= viewport.width && requiredHeight <= viewport.height) return false;
  await page.setViewportSize({ width: requiredWidth, height: requiredHeight });
  return true;
};

export const prepareInteractionCapture = async (
  page: Parameters<typeof expandViewportForCaptureSurface>[0] & HarnessInteractionPage,
  captureSelector: string,
  expandTallFlow: boolean,
  plan: HarnessInteractionPlan | undefined,
  cleanup: () => Promise<void>,
  expand: (
    page: Parameters<typeof expandViewportForCaptureSurface>[0],
    captureSelector: string,
    expandTallFlow: boolean,
  ) => Promise<boolean> = expandViewportForCaptureSurface,
  revalidate: (
    page: HarnessInteractionPage,
    plan: HarnessInteractionPlan,
    cleanup: () => Promise<void>,
  ) => Promise<() => Promise<void>> = revalidateHarnessInteractionPlan,
) => {
  const expanded = await expand(page, captureSelector, expandTallFlow);
  if (!expanded || !plan) {
    return {
      cleanup,
      revalidatedAfterViewportExpansion: false,
      viewportExpanded: expanded,
    };
  }
  return {
    cleanup: await revalidate(page, plan, cleanup),
    revalidatedAfterViewportExpansion: true,
    viewportExpanded: true,
  };
};

let screenshotCaptureTail = Promise.resolve();

const withScreenshotCaptureLock = async <Result>(capture: () => Promise<Result>) => {
  const previousCapture = screenshotCaptureTail;
  let releaseCapture: () => void = () => {};
  screenshotCaptureTail = new Promise<void>((resolveRelease) => {
    releaseCapture = resolveRelease;
  });
  await previousCapture;
  try {
    return await capture();
  } finally {
    releaseCapture();
  }
};

export const captureHarnessSurfaceScreenshot = async (page: {
  evaluate: <Arg = void>(fn: (arg: Arg) => unknown, arg?: Arg) => Promise<unknown>;
  locator: (selector: string) => {
    boundingBox: () => Promise<ScreenshotClip | null>;
    screenshot: (options: {
      path: string;
      animations: 'disabled';
    }) => Promise<unknown>;
  };
  screenshot?: (options: {
    path: string;
    animations: 'disabled';
    clip?: ScreenshotClip;
  }) => Promise<unknown>;
  viewportSize?: () => { width: number; height: number } | null;
}, screenshotPath: string, captureSelector = '[data-vqa-harness-surface]', mode: 'element' | 'viewport' = 'element') => withScreenshotCaptureLock(async () => {
  await page.evaluate(async ({ selector, resetNestedScroll }) => {
    const existing = document.querySelector('style[data-vqa-capture-static]');
    if (existing) return;
    const style = document.createElement('style');
    style.setAttribute('data-vqa-capture-static', '');
    style.textContent = `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
      }
      [data-reveal] {
        opacity: 1 !important;
        transform: translateY(0) !important;
      }
    `;
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((node) => {
      node.dataset.revealed = 'true';
    });
    document.querySelectorAll<HTMLElement>('[data-bar]').forEach((node) => {
      node.style.width = node.dataset.bar ?? '';
    });
    document.querySelectorAll<HTMLElement>('[data-count]').forEach((node) => {
      const target = Number(node.dataset.count);
      if (Number.isFinite(target)) {
        node.textContent = `${target.toLocaleString()}${node.dataset.suffix ?? ''}`;
      }
    });
    const lazyImages = [...document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]')];
    lazyImages.forEach((image) => {
      image.loading = 'eager';
    });
    await Promise.all(lazyImages.map(async (image) => {
      try {
        await Promise.race([
          image.decode(),
          new Promise<void>((resolve) => window.setTimeout(resolve, 2_000)),
        ]);
      } catch {
        // A terminal image error is a valid visual state and is rendered by the component fallback.
      }
    }));
    document.head.append(style);
    const captureNode = document.querySelector<HTMLElement>(selector);
    if (resetNestedScroll && captureNode) {
      [captureNode, ...captureNode.querySelectorAll<HTMLElement>('*')].forEach((node) => {
        node.scrollLeft = 0;
        node.scrollTop = 0;
      });
    }
    captureNode?.scrollIntoView({
      block: 'start',
      inline: 'nearest',
    });
    await new Promise<void>((resolveFrame) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
    });
  }, { selector: captureSelector, resetNestedScroll: mode === 'element' });
  if (mode === 'viewport') {
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      return new Promise<void>((resolveFrame) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
      });
    });
  }
  const surface = page.locator(captureSelector);
  const clip = resolveScreenshotClip(await surface.boundingBox());
  const viewport = page.viewportSize?.() ?? null;
  const fitsViewport = viewport != null
    && clip.x >= 0
    && clip.y >= 0
    && clip.x + clip.width <= viewport.width
    && clip.y + clip.height <= viewport.height;
  if (mode === 'element' && fitsViewport && page.screenshot) {
    await page.screenshot({
      path: screenshotPath,
      animations: 'disabled',
      clip,
    });
    return;
  }
  if (mode === 'viewport') {
    if (!page.screenshot) throw new Error('screenshot capture: page screenshot API is unavailable');
    await page.screenshot({
      path: screenshotPath,
      animations: 'disabled',
      clip,
    });
    await page.evaluate(() => new Promise<void>((resolveFrame) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
    }));
    await page.screenshot({
      path: screenshotPath,
      animations: 'disabled',
      clip,
    });
    return;
  }
  await surface.screenshot({
    path: screenshotPath,
    animations: 'disabled',
  });
});

export const isHarnessAssetRequest = (requestUrl: string, harnessOrigin: string) => {
  try {
    const url = new URL(requestUrl);
    return url.origin === harnessOrigin && !url.pathname.startsWith('/api/');
  } catch {
    return false;
  }
};

export const hasHarnessAssetActivitySettled = ({
  pendingCount,
  lastActivityAt,
  now,
  quietMs,
}: {
  pendingCount: number;
  lastActivityAt: number;
  now: number;
  quietMs: number;
}) => pendingCount === 0 && now - lastActivityAt >= quietMs;

export const settleHarnessPage = async (page: {
  evaluate: (fn: () => unknown) => Promise<unknown>;
}, waitForAssetQuiet: () => Promise<void>) => {
  await page.evaluate(() => new Promise<void>((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
  }));
  await waitForAssetQuiet();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.evaluate(() => new Promise<void>((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
  }));
};

export const applyScenarioInteraction = async (
  page: HarnessInteractionPage,
  scenario: {
    kind: string;
    interactionPlan?: HarnessInteractionPlan;
  },
  execute: (
    targetPage: HarnessInteractionPage,
    plan: HarnessInteractionPlan,
  ) => Promise<() => Promise<void>> = executeHarnessInteractionPlan,
) => {
  if (scenario.kind !== 'component-state' || !scenario.interactionPlan) {
    return { cleanup: async () => {}, evidence: undefined };
  }
  const cleanup = await execute(page, scenario.interactionPlan);
  return {
    cleanup,
    evidence: { ...scenario.interactionPlan, verified: true as const },
  };
};

export const summarizeHarnessResults = (results: HarnessResult[]) => {
  const failed = results.filter(({ status }) => status === 'fail').length;
  const recovered = results.filter(({ status, attempts }) => status === 'pass' && (attempts ?? 1) > 1).length;
  return {
    total: results.length,
    passed: results.length - failed,
    failed,
    recovered,
    ok: results.length > 0 && failed === 0,
  };
};

export const mapWithConcurrency = async <Input, Output>(
  inputs: Input[],
  concurrency: number,
  worker: (input: Input, index: number) => Promise<Output>,
) => {
  const limit = Math.max(1, Math.min(Math.floor(concurrency), inputs.length || 1));
  const outputs = new Array<Output>(inputs.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (cursor < inputs.length) {
      const index = cursor;
      cursor += 1;
      outputs[index] = await worker(inputs[index], index);
    }
  }));
  return outputs;
};

export const mapWithWorkerResource = async <Input, Output, Resource>(
  inputs: Input[],
  concurrency: number,
  createResource: () => Promise<Resource>,
  closeResource: (resource: Resource) => Promise<void>,
  worker: (input: Input, index: number, resource: Resource) => Promise<Output>,
) => {
  const limit = Math.max(1, Math.min(Math.floor(concurrency), inputs.length || 1));
  const outputs = new Array<Output>(inputs.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    const resource = await createResource();
    try {
      while (cursor < inputs.length) {
        const index = cursor;
        cursor += 1;
        outputs[index] = await worker(inputs[index], index, resource);
      }
    } finally {
      await closeResource(resource);
    }
  }));
  return outputs;
};

const loadPlaywright = async () => {
  const candidates = [process.env.PLAYWRIGHT_MODULE_URL, 'playwright'].filter(Boolean) as string[];
  const errors: string[] = [];
  for (const candidate of candidates) {
    try {
      return await import(candidate);
    } catch (error) {
      errors.push(`${candidate}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(`Playwright is unavailable: ${errors.join(' | ')}`);
};

const launchBrowser = async () => {
  const { chromium } = await loadPlaywright();
  const browserEngine = resolveHarnessBrowserEngine(process.env.VISUAL_QA_HARNESS_BROWSER);
  if (browserEngine === 'chromium') return chromium.launch({ headless: true });
  try {
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
};

type HarnessContext = {
  route: (pattern: string, handler: (route: {
    request: () => { url: () => string };
    abort: () => Promise<void>;
    continue: () => Promise<void>;
    fulfill: (response: { status: number; contentType: string; body: string }) => Promise<void>;
  }) => Promise<void>) => Promise<void>;
  addInitScript: (script: () => void) => Promise<void>;
  clearCookies: () => Promise<void>;
  newPage: () => Promise<{
    goto: (url: string, options: object) => Promise<unknown>;
    viewportSize: () => { width: number; height: number } | null;
    setViewportSize: (size: { width: number; height: number }) => Promise<void>;
    waitForFunction: (
      fn: (selection: { componentId: string; scenarioId: string }) => boolean,
      arg: { componentId: string; scenarioId: string },
      options: object,
    ) => Promise<unknown>;
    evaluate: <Result, Arg = void>(fn: (arg: Arg) => Result, arg?: Arg) => Promise<Result>;
    on: (event: 'request' | 'requestfinished' | 'requestfailed', listener: (request: {
      url: () => string;
    }) => void) => void;
    off: (event: 'request' | 'requestfinished' | 'requestfailed', listener: (request: {
      url: () => string;
    }) => void) => void;
    locator: (selector: string) => {
      boundingBox: () => Promise<ScreenshotClip | null>;
      screenshot: (options: {
        path: string;
        animations: 'disabled';
      }) => Promise<unknown>;
      first: () => {
        waitFor: (options: { state: 'visible'; timeout: number }) => Promise<void>;
        hover: () => Promise<void>;
        boundingBox: () => Promise<ScreenshotClip | null>;
      };
    };
    keyboard: { press: (key: string) => Promise<void> };
    mouse: {
      move: (x: number, y: number) => Promise<void>;
      down: () => Promise<void>;
      up: () => Promise<void>;
    };
    screenshot: (options: {
      path: string;
      animations: 'disabled';
      clip: ScreenshotClip;
    }) => Promise<unknown>;
    close: () => Promise<void>;
  }>;
  close: () => Promise<void>;
};

type HarnessPage = Awaited<ReturnType<HarnessContext['newPage']>>;

export const switchHarnessPageScenario = async (
  page: Pick<HarnessPage, 'evaluate' | 'setViewportSize'>,
  selectionId: string,
) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate((nextSelectionId) => {
    window.scrollTo(0, 0);
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.querySelector('style[data-vqa-capture-static]')?.remove();
    const renderScenario = (window as Window & {
      __BEGA_VISUAL_QA_RENDER_COMPONENT__?: (scenarioId: string) => void;
    }).__BEGA_VISUAL_QA_RENDER_COMPONENT__;
    if (!renderScenario) throw new Error('visual QA harness scenario switch API is unavailable');
    renderScenario(nextSelectionId);
    window.scrollTo(0, 0);
    return true;
  }, selectionId);
};

const createHarnessAssetTracker = (
  page: HarnessPage,
  harnessOrigin: string,
  timeoutMs: number,
) => {
  type Request = Parameters<Parameters<HarnessPage['on']>[1]>[0];
  const pending = new Set<Request>();
  let lastActivityAt = Date.now();
  const onRequest = (request: Request) => {
    if (!isHarnessAssetRequest(request.url(), harnessOrigin)) return;
    pending.add(request);
    lastActivityAt = Date.now();
  };
  const onRequestDone = (request: Request) => {
    if (!pending.delete(request)) return;
    lastActivityAt = Date.now();
  };
  page.on('request', onRequest);
  page.on('requestfinished', onRequestDone);
  page.on('requestfailed', onRequestDone);

  return {
    waitForQuiet: async () => {
      const startedAt = Date.now();
      const quietMs = 750;
      while (Date.now() - startedAt <= timeoutMs) {
        if (hasHarnessAssetActivitySettled({
          pendingCount: pending.size,
          lastActivityAt,
          now: Date.now(),
          quietMs,
        })) return;
        await new Promise((resolveWait) => setTimeout(resolveWait, 50));
      }
      throw new Error(`page.waitForAssetQuiet: Timeout ${timeoutMs}ms exceeded.`);
    },
    dispose: () => {
      page.off('request', onRequest);
      page.off('requestfinished', onRequestDone);
      page.off('requestfailed', onRequestDone);
    },
  };
};

export type HarnessRequestPolicy = 'abort-external' | 'stub-api' | 'continue';

export const resolveHarnessRequestPolicy = (
  requestUrl: string,
  harnessOrigin: string,
): HarnessRequestPolicy => {
  const url = new URL(requestUrl);
  if (url.origin !== new URL(harnessOrigin).origin) return 'abort-external';
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return 'stub-api';
  return 'continue';
};

const installOfflineRoutes = async (context: HarnessContext, harnessOrigin: string) => {
  await context.route('**/*', async (route) => {
    const policy = resolveHarnessRequestPolicy(route.request().url(), harnessOrigin);
    if (policy === 'abort-external') return route.abort();
    if (policy === 'stub-api') {
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, code: 'VISUAL_QA_HARNESS_STUB' }),
      });
    }
    return route.continue();
  });
};

const probeIsolatedScenario = async ({
  context,
  page: borrowedPage,
  reuseExistingPage = false,
  baseUrl,
  scenario,
  timeoutMs,
  screenshotDir,
  captureHeightMode,
}: {
  context: HarnessContext;
  page?: HarnessPage;
  reuseExistingPage?: boolean;
  baseUrl: string;
  scenario: (typeof AUTOMATIC_ICON_SCENARIOS)[number]
    | (typeof AUTOMATIC_COMPONENT_PROBE_SCENARIOS)[number]
    | (typeof AUTOMATIC_COMPONENT_STATE_SCENARIOS)[number];
  timeoutMs: number;
  screenshotDir: string | null;
  captureHeightMode: ReturnType<typeof resolveHarnessCaptureHeightMode>;
}): Promise<HarnessResult> => {
  await context.clearCookies();
  const page = borrowedPage ?? await context.newPage();
  const ownsPage = borrowedPage === undefined;
  const assetTracker = createHarnessAssetTracker(page, new URL(baseUrl).origin, timeoutMs);
  let interactionCleanup = async () => {};
  let interactionEvidence: HarnessInteractionEvidence | undefined;
  try {
    const selectionId = scenario.kind === 'component-state' ? scenario.id : scenario.componentId;
    if (reuseExistingPage) {
      await switchHarnessPageScenario(page, selectionId);
    } else {
      const url = new URL('/visual-qa-harness.html', baseUrl);
      url.searchParams.set(
        scenario.kind === 'component-state' ? 'scenario' : 'component',
        selectionId,
      );
      await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    }
    await page.waitForFunction(
      ({ componentId, scenarioId }) => {
        const status = window.__BEGA_VISUAL_QA_HARNESS__;
        return status?.componentId === componentId
          && status.scenarioId === scenarioId
          && status.state !== 'loading';
      },
      { componentId: scenario.componentId, scenarioId: scenario.id },
      { timeout: timeoutMs },
    );
    await settleHarnessPage(page, assetTracker.waitForQuiet);
    const rawOutcome = await page.evaluate(({ componentId, scenarioId }) => {
      const surface = document.querySelector('[data-vqa-harness-surface]');
      const captureSelector = surface?.getAttribute('data-vqa-capture-selector') ?? null;
      const renderedSurfaceChildCount = [...(surface?.children ?? [])].filter((child) => (
        !child.hasAttribute('data-vqa-router-pathname')
      )).length;
      return {
        harness: window.__BEGA_VISUAL_QA_HARNESS__,
        boundedHeightViolations: [...document.querySelectorAll<HTMLElement>('[data-vqa-max-height]')]
          .flatMap((element, index) => {
            const maxHeight = Number(element.getAttribute('data-vqa-max-height'));
            const actualHeight = Math.round(element.getBoundingClientRect().height * 100) / 100;
            if (!Number.isFinite(maxHeight) || maxHeight <= 0 || actualHeight <= maxHeight + 0.5) {
              return [];
            }
            const testId = element.getAttribute('data-testid');
            return [{
              actualHeight,
              maxHeight,
              selector: testId ? `[data-testid="${testId}"]` : `${element.tagName.toLowerCase()}:nth(${index})`,
            }];
          }),
        touchTargetViolations: [...document.querySelectorAll<HTMLElement>('[data-vqa-min-touch]')]
          .flatMap((element, index) => {
            const minimumSize = Number(element.getAttribute('data-vqa-min-touch'));
            const rect = element.getBoundingClientRect();
            const actualHeight = Math.round(rect.height * 100) / 100;
            const actualWidth = Math.round(rect.width * 100) / 100;
            if (
              !Number.isFinite(minimumSize)
              || minimumSize <= 0
              || (actualHeight >= minimumSize - 0.5 && actualWidth >= minimumSize - 0.5)
            ) {
              return [];
            }
            const testId = element.getAttribute('data-testid');
            return [{
              actualHeight,
              actualWidth,
              minimumSize,
              selector: testId ? `[data-testid="${testId}"]` : `${element.tagName.toLowerCase()}:nth(${index})`,
            }];
          }),
        actualRouterHash: document.querySelector('[data-vqa-router-pathname]')
          ?.getAttribute('data-vqa-router-hash') ?? null,
        actualRouterPathname: document.querySelector('[data-vqa-router-pathname]')
          ?.getAttribute('data-vqa-router-pathname') ?? null,
        actualRouterSearch: document.querySelector('[data-vqa-router-pathname]')
          ?.getAttribute('data-vqa-router-search') ?? null,
        renderedComponentId: surface?.getAttribute('data-vqa-rendered-component-id') ?? null,
        renderedScenarioId: surface?.getAttribute('data-vqa-rendered-scenario-id') ?? null,
        captureNodeCount: captureSelector
          ? document.querySelectorAll(captureSelector).length
          : renderedSurfaceChildCount,
        surfaceChildCount: renderedSurfaceChildCount,
        captureSelector,
        expectedComponentId: componentId,
        expectedHash: surface?.getAttribute('data-vqa-expected-hash') ?? null,
        expectedPathname: surface?.getAttribute('data-vqa-expected-pathname') ?? null,
        expectedSearch: surface?.getAttribute('data-vqa-expected-search') ?? null,
        expectedScenarioId: scenarioId,
      };
    }, { componentId: scenario.componentId, scenarioId: scenario.id });
    const outcome: HarnessReadyOutcome = {
      ...rawOutcome,
      renderedNodes: resolveHarnessReadinessNodeCount({
        captureNodeCount: rawOutcome.captureNodeCount,
        hasInteraction: scenario.kind === 'component-state' && scenario.interactionPlan != null,
        surfaceChildCount: rawOutcome.surfaceChildCount,
      }),
    };
    assertHarnessReadyOutcome(outcome);
    const navigationEvidence = outcome.expectedPathname
      ? {
        ...(outcome.expectedHash != null ? {
          actualHash: outcome.actualRouterHash as string,
          expectedHash: outcome.expectedHash,
        } : {}),
        actualPathname: outcome.actualRouterPathname as string,
        ...(outcome.expectedSearch != null ? {
          actualSearch: outcome.actualRouterSearch as string,
          expectedSearch: outcome.expectedSearch,
        } : {}),
        expectedPathname: outcome.expectedPathname,
        verified: true as const,
      }
      : undefined;
    const captureSelector = outcome.captureSelector ?? '[data-vqa-harness-surface]';
    const appliedInteraction = await applyScenarioInteraction(
      page as unknown as HarnessInteractionPage,
      scenario,
    );
    interactionCleanup = appliedInteraction.cleanup;
    interactionEvidence = appliedInteraction.evidence;
    if (screenshotDir) {
      const preparedCapture = await prepareInteractionCapture(
        page as unknown as Parameters<typeof prepareInteractionCapture>[0],
        captureSelector,
        interactionEvidence !== undefined || captureHeightMode === 'expand-tall-flow',
        scenario.kind === 'component-state' ? scenario.interactionPlan : undefined,
        interactionCleanup,
      );
      interactionCleanup = preparedCapture.cleanup;
      if (interactionEvidence) {
        interactionEvidence = {
          ...interactionEvidence,
          captureVerified: true,
          revalidatedAfterViewportExpansion: preparedCapture.revalidatedAfterViewportExpansion,
          viewportExpanded: preparedCapture.viewportExpanded,
        };
      }
    }
    if (!screenshotDir) {
      return {
        scenarioId: scenario.id,
        componentId: scenario.componentId,
        status: 'pass',
        ...(interactionEvidence ? { interaction: interactionEvidence } : {}),
        ...(navigationEvidence ? { navigation: navigationEvidence } : {}),
      };
    }
    const screenshotPath = resolve(screenshotDir, componentScreenshotFileName(scenario.id));
    await captureHarnessSurfaceScreenshot(
      page,
      screenshotPath,
      captureSelector,
      interactionEvidence ? 'viewport' : 'element',
    );
    return {
      scenarioId: scenario.id,
      componentId: scenario.componentId,
      status: 'pass',
      screenshot: relative(process.cwd(), screenshotPath),
      ...(interactionEvidence ? { interaction: interactionEvidence } : {}),
      ...(navigationEvidence ? { navigation: navigationEvidence } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      scenarioId: scenario.id,
      componentId: scenario.componentId,
      status: 'fail',
      error: message,
      failureType: classifyHarnessFailure(message),
    };
  } finally {
    await interactionCleanup();
    assetTracker.dispose();
    if (ownsPage) await page.close();
  }
};

const main = async () => {
  const baseUrl = process.env.VISUAL_QA_HARNESS_BASE_URL ?? 'http://127.0.0.1:5182';
  const scopeValue = process.env.VISUAL_QA_HARNESS_SCOPE ?? 'icons';
  if (!['icons', 'component-probes', 'component-states', 'all'].includes(scopeValue)) {
    throw new Error(`Unknown VISUAL_QA_HARNESS_SCOPE: ${scopeValue}`);
  }
  const scope = scopeValue as HarnessScope;
  const selectedScenarios = selectHarnessScenarios(scope);
  const requestedIds = (process.env.VISUAL_QA_HARNESS_COMPONENT_IDS ?? '')
    .split(',')
    .map((componentId) => componentId.trim())
    .filter(Boolean);
  const scenarioPool = requestedIds.length > 0
    ? selectRequestedScenarios(selectedScenarios, requestedIds)
    : selectedScenarios;
  const requestedInteractions = (process.env.VISUAL_QA_HARNESS_INTERACTIONS ?? '')
    .split(',')
    .map((interaction) => interaction.trim())
    .filter(Boolean);
  const filteredScenarioPool = selectRequestedInteractionScenarios(
    scenarioPool,
    requestedInteractions,
  );
  const requestedDataStates = (process.env.VISUAL_QA_HARNESS_DATA_STATES ?? '')
    .split(',')
    .map((dataState) => dataState.trim())
    .filter(Boolean);
  const dataFilteredScenarioPool = selectRequestedDataStateScenarios(
    filteredScenarioPool,
    requestedDataStates,
  );
  const limit = Number(process.env.VISUAL_QA_HARNESS_LIMIT ?? dataFilteredScenarioPool.length);
  const reportPath = resolve(
    process.cwd(),
    process.env.VISUAL_QA_HARNESS_REPORT ?? `reports/visual-qa-${scope}-harness-smoke.json`,
  );
  const scenarios = dataFilteredScenarioPool.slice(0, Number.isFinite(limit) ? limit : undefined);
  const timeoutMs = resolveHarnessTimeoutMs(process.env.VISUAL_QA_HARNESS_TIMEOUT_MS);
  const pageMode = resolveHarnessPageMode(process.env.VISUAL_QA_HARNESS_PAGE_MODE);
  const captureHeightMode = resolveHarnessCaptureHeightMode(
    process.env.VISUAL_QA_HARNESS_CAPTURE_HEIGHT_MODE,
  );
  const screenshotDirValue = process.env.VISUAL_QA_HARNESS_SCREENSHOTS_DIR?.trim();
  const screenshotDir = screenshotDirValue ? resolve(process.cwd(), screenshotDirValue) : null;
  if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
  const browser = await launchBrowser();
  let completed = 0;
  let results: HarnessResult[] = [];
  try {
    const harnessOrigin = new URL(baseUrl).origin;
    const concurrency = Number(process.env.VISUAL_QA_HARNESS_CONCURRENCY ?? 8);
    const groupSize = resolveHarnessGroupSize(process.env.VISUAL_QA_HARNESS_GROUP_SIZE);
    const scenarioGroups = groupScenariosByModule(scenarios, groupSize);
    const groupedResults = await mapWithWorkerResource(
      scenarioGroups,
      concurrency,
      async () => {
        const context = await browser.newContext({ viewport: { width: 320, height: 844 } });
        await installOfflineRoutes(context, harnessOrigin);
        await context.addInitScript(() => {
          window.localStorage.clear();
          window.sessionStorage.clear();
        });
        return { context, page: null as HarnessPage | null, pageInitialized: false };
      },
      async (resource) => {
        if (resource.page) await resource.page.close();
        await resource.context.close();
      },
      async (group, _index, resource) => {
        const groupResults: Array<{ index: number; result: HarnessResult }> = [];
        for (const entry of group.entries) {
          let attempt = 0;
          const result = await executeHarnessScenarioWithRetry(async () => {
            attempt += 1;
            if (pageMode === 'fresh') {
              return probeIsolatedScenario({
                context: resource.context,
                baseUrl,
                scenario: entry.scenario,
                timeoutMs,
                screenshotDir,
                captureHeightMode,
              });
            }
            if (attempt > 1 && resource.page) {
              await resource.page.close();
              resource.page = null;
              resource.pageInitialized = false;
            }
            if (!resource.page) resource.page = await resource.context.newPage();
            const resultForAttempt = await probeIsolatedScenario({
              context: resource.context,
              page: resource.page,
              reuseExistingPage: resource.pageInitialized,
              baseUrl,
              scenario: entry.scenario,
              timeoutMs,
              screenshotDir,
              captureHeightMode,
            });
            resource.pageInitialized = true;
            return resultForAttempt;
          });
          if (shouldResetHarnessPageAfterResult(pageMode, result) && resource.page) {
            await resource.page.close();
            resource.page = null;
            resource.pageInitialized = false;
          }
          groupResults.push({ index: entry.index, result });
          completed += 1;
          if (completed % 50 === 0 || completed === scenarios.length) {
            console.log(`[visual-qa:harness] ${completed}/${scenarios.length}`);
          }
        }
        if (shouldResetHarnessPageAfterGroup(pageMode, group.entries.length) && resource.page) {
          await resource.page.close();
          resource.page = null;
          resource.pageInitialized = false;
        }
        return groupResults;
      },
    );
    results = new Array<HarnessResult>(scenarios.length);
    groupedResults.flat().forEach(({ index, result }) => {
      results[index] = result;
    });
  } finally {
    await browser.close();
  }

  const summary = summarizeHarnessResults(results);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    baseUrl,
    scope,
    isolation: pageMode === 'reuse'
      ? 'reset-storage-cache-state-and-reuse-page-per-bounded-worker'
      : 'fresh-page-and-storage-per-scenario-with-bounded-module-affine-worker-groups',
    pageMode,
    captureHeightMode,
    groupSize: resolveHarnessGroupSize(process.env.VISUAL_QA_HARNESS_GROUP_SIZE),
    viewport: { width: 320, height: 844 },
    timeoutMs,
    screenshots: screenshotDir
      ? { mode: 'captured', directory: relative(process.cwd(), screenshotDir) }
      : { mode: 'disabled', directory: null },
    summary,
    results,
  };
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(
    `[visual-qa:harness] ${summary.passed}/${summary.total} passed · ${summary.failed} failed · `
      + `${summary.recovered} recovered · `
      + `report=${relative(process.cwd(), reportPath)}`,
  );
  if (!summary.ok) process.exitCode = 1;
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(`[visual-qa:harness] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
