import assert from 'node:assert/strict';
import test from 'node:test';

import * as harnessSmokeModule from './visual-qa-harness-smoke';
import {
  assertHarnessReadyOutcome,
  captureHarnessSurfaceScreenshot,
  classifyHarnessFailure,
  componentScreenshotFileName,
  executeHarnessScenarioWithRetry,
  expandViewportForCaptureSurface,
  groupScenariosByModule,
  hasHarnessAssetActivitySettled,
  isHarnessAssetRequest,
  mapWithConcurrency,
  mapWithWorkerResource,
  resolveScreenshotClip,
  resolveHarnessBrowserEngine,
  resolveHarnessGroupSize,
  resolveHarnessPageMode,
  resolveHarnessReadinessNodeCount,
  resolveHarnessRequestPolicy,
  resolveHarnessTimeoutMs,
  selectRequestedInteractionScenarios,
  selectRequestedScenarios,
  selectHarnessScenarios,
  settleHarnessPage,
  shouldResetHarnessPageAfterGroup,
  shouldResetHarnessPageAfterResult,
  summarizeHarnessResults,
  switchHarnessPageScenario,
} from './visual-qa-harness-smoke';

test('harness request policy blocks external traffic and stubs every same-origin API root', () => {
  const harnessOrigin = 'http://127.0.0.1:5182';

  assert.equal(
    resolveHarnessRequestPolicy('https://example.com/image.png', harnessOrigin),
    'abort-external',
  );
  assert.equal(
    resolveHarnessRequestPolicy('http://127.0.0.1:5182/api', harnessOrigin),
    'stub-api',
  );
  assert.equal(
    resolveHarnessRequestPolicy('http://127.0.0.1:5182/api/users/1', harnessOrigin),
    'stub-api',
  );
  assert.equal(
    resolveHarnessRequestPolicy('http://127.0.0.1:5182/apiary.png', harnessOrigin),
    'continue',
  );
  assert.equal(
    resolveHarnessRequestPolicy('http://127.0.0.1:5182/src/visual-qa/main.tsx', harnessOrigin),
    'continue',
  );
});

test('capture viewport preserves the real mobile height for fixed portal surfaces', async () => {
  const sizes: Array<{ width: number; height: number }> = [];
  const evaluateInputs: unknown[] = [];
  const evaluateSources: string[] = [];
  const expanded = await expandViewportForCaptureSurface({
    evaluate: async () => ({ belongsToFixedLayer: true, documentHeight: 844 }),
    locator: () => ({
      boundingBox: async () => ({ x: 16, y: 0, width: 288, height: 996 }),
    }),
    viewportSize: () => ({ width: 320, height: 844 }),
    setViewportSize: async (size: { width: number; height: number }) => { sizes.push(size); },
  }, '[role="dialog"]');
  assert.equal(expanded, false);
  assert.deepEqual(sizes, []);

  const unchanged = await expandViewportForCaptureSurface({
    evaluate: async () => ({ belongsToFixedLayer: true, documentHeight: 844 }),
    locator: () => ({
      boundingBox: async () => ({ x: 16, y: 100, width: 288, height: 600 }),
    }),
    viewportSize: () => ({ width: 320, height: 844 }),
    setViewportSize: async (size: { width: number; height: number }) => { sizes.push(size); },
  }, '[role="dialog"]');
  assert.equal(unchanged, false);
  assert.deepEqual(sizes, []);

  const tallFlowContent = await expandViewportForCaptureSurface({
    evaluate: async () => ({ belongsToFixedLayer: false, documentHeight: 2_200 }),
    locator: () => ({
      boundingBox: async () => ({ x: 16, y: 100, width: 288, height: 2_200 }),
    }),
    viewportSize: () => ({ width: 320, height: 844 }),
    setViewportSize: async (size: { width: number; height: number }) => { sizes.push(size); },
  }, '[data-testid="long-flow-content"]');
  assert.equal(tallFlowContent, false);
  assert.deepEqual(sizes, []);

  const interactiveTallFlowContent = await expandViewportForCaptureSurface({
    evaluate: async (_fn, input) => {
      evaluateInputs.push(input);
      evaluateSources.push(String(_fn));
      return { belongsToFixedLayer: false, documentHeight: 2_500 };
    },
    locator: () => ({
      boundingBox: async () => ({ x: 40, y: 100, width: 288, height: 2_200 }),
    }),
    viewportSize: () => ({ width: 320, height: 844 }),
    setViewportSize: async (size: { width: number; height: number }) => { sizes.push(size); },
  }, '[data-testid="long-flow-content"]', true);
  assert.equal(interactiveTallFlowContent, true);
  assert.deepEqual(sizes, [
    { width: 360, height: 2532 },
  ]);
  assert.deepEqual(evaluateInputs, [{
    resetPageScroll: true,
    selector: '[data-testid="long-flow-content"]',
  }]);
  assert.match(evaluateSources[0], /requestAnimationFrame/);
});

test('tall-flow capture expansion is explicit and fails closed for unknown modes', () => {
  const resolveHarnessCaptureHeightMode = (
    harnessSmokeModule as typeof harnessSmokeModule & {
      resolveHarnessCaptureHeightMode?: (value: string | undefined) => 'mobile' | 'expand-tall-flow';
    }
  ).resolveHarnessCaptureHeightMode;

  assert.equal(typeof resolveHarnessCaptureHeightMode, 'function');
  assert.equal(resolveHarnessCaptureHeightMode?.(undefined), 'mobile');
  assert.equal(resolveHarnessCaptureHeightMode?.('mobile'), 'mobile');
  assert.equal(resolveHarnessCaptureHeightMode?.('expand-tall-flow'), 'expand-tall-flow');
  assert.throws(
    () => resolveHarnessCaptureHeightMode?.('unknown'),
    /VISUAL_QA_HARNESS_CAPTURE_HEIGHT_MODE/,
  );
});

test('interaction capture expands first and then revalidates without replaying the mutation', async () => {
  const prepareInteractionCapture = (
    harnessSmokeModule as unknown as {
      prepareInteractionCapture?: (
        page: unknown,
        captureSelector: string,
        expandTallFlow: boolean,
        plan: { action: string; selector: string },
        cleanup: () => Promise<void>,
        expand: () => Promise<boolean>,
        revalidate: () => Promise<() => Promise<void>>,
      ) => Promise<{
        cleanup: () => Promise<void>;
        revalidatedAfterViewportExpansion: boolean;
        viewportExpanded: boolean;
      }>;
    }
  ).prepareInteractionCapture;
  assert.equal(typeof prepareInteractionCapture, 'function');
  if (!prepareInteractionCapture) return;
  const events: string[] = [];
  const firstCleanup = async () => { events.push('first-cleanup'); };
  const restoredCleanup = async () => { events.push('restored-cleanup'); };

  const prepared = await prepareInteractionCapture(
    {},
    '[data-vqa-harness-surface]',
    true,
    { action: 'pressed', selector: 'button' },
    firstCleanup,
    async () => {
      events.push('expand');
      return true;
    },
    async () => {
      events.push('revalidate');
      return restoredCleanup;
    },
  );

  assert.deepEqual(events, ['expand', 'revalidate']);
  assert.equal(prepared.viewportExpanded, true);
  assert.equal(prepared.revalidatedAfterViewportExpansion, true);
  await prepared.cleanup();
  assert.deepEqual(events, ['expand', 'revalidate', 'restored-cleanup']);
});

test('surface capture uses the full element instead of a viewport-clipped page screenshot', async () => {
  const events: string[] = [];
  let captureStyleText = '';
  const lazyImage = {
    complete: false,
    decode: async () => { events.push('image:decode'); },
    loading: 'lazy',
  };
  const originalDocument = globalThis.document;
  const captureStyle = {
    setAttribute: () => {},
    textContent: '',
  };
  const nestedScrollSurface = {
    scrollLeft: 11,
    scrollTop: 37,
  };
  const captureSurface = {
    scrollLeft: 7,
    scrollTop: 23,
    querySelectorAll: () => [nestedScrollSurface],
    scrollIntoView: () => { events.push('requested-surface:scroll-start'); },
  };
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    value: (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    },
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => captureStyle,
      head: {
        append: (style: typeof captureStyle) => {
          captureStyleText = style.textContent;
        },
      },
      querySelector: (selector: string) => (
        selector === '[role="dialog"]' ? captureSurface : null
      ),
      querySelectorAll: (selector: string) => (
        selector === 'img[loading="lazy"]' ? [lazyImage] : []
      ),
    },
  });

  try {
  await captureHarnessSurfaceScreenshot({
    evaluate: async (freezeForCapture, input) => {
      events.push('evaluate:freeze-animations');
      await freezeForCapture(input);
    },
    locator: (selector: string) => {
      events.push(`locator:${selector}`);
      return {
        boundingBox: async () => ({ x: 24, y: 128, width: 272, height: 1_200 }),
        screenshot: async (options: { path: string; animations: string }) => {
          events.push(`screenshot:${options.path}:${options.animations}`);
        },
      };
    },
  }, '/tmp/full-surface.png', '[role="dialog"]');
  } finally {
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: originalRequestAnimationFrame,
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: originalDocument,
    });
  }
  assert.deepEqual(events, [
    'evaluate:freeze-animations',
    'image:decode',
    'requested-surface:scroll-start',
    'locator:[role="dialog"]',
    'screenshot:/tmp/full-surface.png:disabled',
  ]);
  assert.match(captureStyleText, /\[data-reveal\]/);
  assert.match(captureStyleText, /opacity:\s*1\s*!important/);
  assert.equal(lazyImage.loading, 'eager');
  assert.deepEqual(
    [captureSurface.scrollLeft, captureSurface.scrollTop, nestedScrollSurface.scrollLeft, nestedScrollSurface.scrollTop],
    [0, 0, 0, 0],
  );
});

test('concurrent surface captures serialize screenshot writes', async () => {
  const events: string[] = [];
  let releaseFirstCapture: () => void = () => {};
  const firstCaptureBlocked = new Promise<void>((resolve) => {
    releaseFirstCapture = resolve;
  });
  let notifyFirstStarted: () => void = () => {};
  const firstStarted = new Promise<void>((resolve) => {
    notifyFirstStarted = resolve;
  });
  const makePage = (name: 'first' | 'second') => ({
    evaluate: async () => undefined,
    locator: () => ({
      boundingBox: async () => ({ x: 16, y: 16, width: 288, height: 812 }),
      screenshot: async () => {
        events.push(`${name}:start`);
        if (name === 'first') {
          notifyFirstStarted();
          await firstCaptureBlocked;
        }
        events.push(`${name}:end`);
      },
    }),
  });

  const first = captureHarnessSurfaceScreenshot(makePage('first'), '/tmp/first.png');
  await firstStarted;
  const second = captureHarnessSurfaceScreenshot(makePage('second'), '/tmp/second.png');
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(events, ['first:start']);

  releaseFirstCapture();
  await Promise.all([first, second]);
  assert.deepEqual(events, ['first:start', 'first:end', 'second:start', 'second:end']);
});

test('fully visible mobile surfaces use an exact page clip without locator auto-scroll', async () => {
  const events: string[] = [];
  await captureHarnessSurfaceScreenshot({
    evaluate: async () => undefined,
    locator: (selector: string) => ({
      boundingBox: async () => {
        events.push(`box:${selector}`);
        return { x: 16, y: 16, width: 288, height: 812 };
      },
      screenshot: async () => { events.push('locator:screenshot'); },
    }),
    viewportSize: () => ({ width: 320, height: 844 }),
    screenshot: async (options: { clip?: { x: number; y: number; width: number; height: number } }) => {
      events.push(options.clip ? 'page:screenshot:clipped' : 'page:screenshot:unclipped');
    },
  }, '/tmp/mobile-dialog.png', '[role="dialog"]');

  assert.deepEqual(events, [
    'box:[role="dialog"]',
    'page:screenshot:clipped',
  ]);
});

test('interaction capture clips both stable page frames to the requested surface', async () => {
  const events: string[] = [];
  let evaluateCall = 0;
  const originalDocument = globalThis.document;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    configurable: true,
    value: (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    },
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      createElement: () => ({ setAttribute: () => {}, textContent: '' }),
      head: { append: () => {} },
      querySelector: () => null,
      querySelectorAll: () => [],
    },
  });

  try {
    await captureHarnessSurfaceScreenshot({
      evaluate: async (freezeForCapture, input) => {
        evaluateCall += 1;
        if (evaluateCall === 1) {
          await freezeForCapture(input);
        } else {
          const source = String(freezeForCapture);
          events.push(/window\.scrollTo\(0,\s*0\)/.test(source)
            ? 'evaluate:reset-page-scroll'
            : 'evaluate:wait-for-paint');
        }
        return undefined;
      },
      locator: (selector: string) => ({
        boundingBox: async () => {
          events.push(`box:${selector}`);
          return { x: 16, y: 16, width: 288, height: 1_303 };
        },
        screenshot: async () => { events.push('locator:screenshot'); },
      }),
      screenshot: async (options: {
        path: string;
        animations: string;
        clip?: { x: number; y: number; width: number; height: number };
      }) => {
        events.push(`page:screenshot:${options.path}:${options.animations}:${options.clip ? 'clipped' : 'full-viewport'}`);
      },
    }, '/tmp/interaction-surface.png', '[data-testid="interactive-flow"]', 'viewport');
  } finally {
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: originalRequestAnimationFrame,
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: originalDocument,
    });
  }

  assert.deepEqual(events, [
    'evaluate:reset-page-scroll',
    'box:[data-testid="interactive-flow"]',
    'page:screenshot:/tmp/interaction-surface.png:disabled:clipped',
    'evaluate:wait-for-paint',
    'page:screenshot:/tmp/interaction-surface.png:disabled:clipped',
  ]);
});

test('harness readiness rejects explicitly marked undersized touch targets', () => {
  assert.throws(() => assertHarnessReadyOutcome({
    harness: {
      componentId: 'LandingTicker',
      scenarioId: 'LandingTicker:focus-visible',
      state: 'ready',
    },
    renderedComponentId: 'LandingTicker',
    renderedScenarioId: 'LandingTicker:focus-visible',
    renderedNodes: 1,
    actualRouterPathname: '/',
    expectedComponentId: 'LandingTicker',
    expectedPathname: '/',
    expectedScenarioId: 'LandingTicker:focus-visible',
    touchTargetViolations: [{
      actualHeight: 32,
      actualWidth: 80,
      minimumSize: 44,
      selector: '[data-testid="landing-ticker-toggle"]',
    }],
  }), /touch target.*32x80.*44/i);
});

test('harness readiness is validated before interaction lookup can mask render errors', () => {
  assert.doesNotThrow(() => assertHarnessReadyOutcome({
    harness: {
      componentId: 'A',
      scenarioId: 'A:default',
      state: 'ready',
    },
    renderedComponentId: 'A',
    renderedScenarioId: 'A:default',
    renderedNodes: 1,
    actualRouterPathname: '/home',
    actualRouterSearch: '?from=admin',
    actualRouterHash: '#release',
    expectedComponentId: 'A',
    expectedPathname: '/home',
    expectedSearch: '?from=admin',
    expectedHash: '#release',
    expectedScenarioId: 'A:default',
  }));
  assert.throws(() => assertHarnessReadyOutcome({
    harness: {
      componentId: 'A',
      scenarioId: 'A:redirect',
      state: 'ready',
    },
    renderedComponentId: 'A',
    renderedScenarioId: 'A:redirect',
    renderedNodes: 1,
    actualRouterPathname: '/wrong-route',
    expectedComponentId: 'A',
    expectedPathname: '/home',
    expectedScenarioId: 'A:redirect',
  }), /expected router pathname \/home but received \/wrong-route/);
  assert.throws(() => assertHarnessReadyOutcome({
    harness: {
      componentId: 'A',
      scenarioId: 'A:redirect-query',
      state: 'ready',
    },
    renderedComponentId: 'A',
    renderedScenarioId: 'A:redirect-query',
    renderedNodes: 1,
    actualRouterPathname: '/login',
    actualRouterSearch: '?redirect=%2Fwrong',
    actualRouterHash: '',
    expectedComponentId: 'A',
    expectedPathname: '/login',
    expectedSearch: '?redirect=%2Fadmin%3Ftab%3Dai%23release',
    expectedHash: '',
    expectedScenarioId: 'A:redirect-query',
  }), /expected router search/);
  assert.throws(() => assertHarnessReadyOutcome({
    harness: {
      componentId: 'A',
      scenarioId: 'A:default',
      state: 'error',
      message: 'module import failed',
    },
    renderedComponentId: null,
    renderedScenarioId: null,
    renderedNodes: 0,
    expectedComponentId: 'A',
    expectedScenarioId: 'A:default',
  }), /module import failed/);
});

test('harness readiness rejects marked mobile content that exceeds its visual height budget', () => {
  assert.throws(() => assertHarnessReadyOutcome({
    harness: {
      componentId: 'PublicNavbar',
      scenarioId: 'PublicNavbar:unbroken-profile',
      state: 'ready',
    },
    renderedComponentId: 'PublicNavbar',
    renderedScenarioId: 'PublicNavbar:unbroken-profile',
    renderedNodes: 1,
    boundedHeightViolations: [{
      actualHeight: 312,
      maxHeight: 48,
      selector: '[data-testid="public-navbar-menu-profile-name"]',
    }],
    expectedComponentId: 'PublicNavbar',
    expectedScenarioId: 'PublicNavbar:unbroken-profile',
  }), /exceeds visual height budget/);
});

test('post-interaction capture targets do not invalidate pre-interaction component readiness', () => {
  assert.equal(resolveHarnessReadinessNodeCount({
    captureNodeCount: 0,
    hasInteraction: true,
    surfaceChildCount: 1,
  }), 1);
  assert.equal(resolveHarnessReadinessNodeCount({
    captureNodeCount: 0,
    hasInteraction: false,
    surfaceChildCount: 1,
  }), 0);
  assert.equal(resolveHarnessReadinessNodeCount({
    captureNodeCount: 1,
    hasInteraction: true,
    surfaceChildCount: 0,
  }), 1);
});

test('retryable browser infrastructure failures get one recorded fresh-page retry', async () => {
  let attempts = 0;
  const recovered = await executeHarnessScenarioWithRetry(async () => {
    attempts += 1;
    if (attempts === 1) {
      return {
        scenarioId: 'A:default',
        componentId: 'A',
        status: 'fail' as const,
        error: 'locator timeout',
        failureType: 'harness-timeout' as const,
      };
    }
    return {
      scenarioId: 'A:default',
      componentId: 'A',
      status: 'pass' as const,
    };
  });
  assert.equal(attempts, 2);
  assert.equal(recovered.status, 'pass');
  assert.equal(recovered.attempts, 2);
  assert.deepEqual(recovered.retryHistory, [{
    error: 'locator timeout',
    failureType: 'harness-timeout',
  }]);

  attempts = 0;
  const deterministic = await executeHarnessScenarioWithRetry(async () => {
    attempts += 1;
    return {
      scenarioId: 'B:default',
      componentId: 'B',
      status: 'fail' as const,
      error: 'render exception',
      failureType: 'render-error' as const,
    };
  });
  assert.equal(attempts, 1);
  assert.equal(deterministic.attempts, 1);
  assert.equal(deterministic.status, 'fail');

  attempts = 0;
  const navigationRecovery = await executeHarnessScenarioWithRetry(async () => {
    attempts += 1;
    if (attempts === 1) {
      return {
        scenarioId: 'C:default',
        componentId: 'C',
        status: 'fail' as const,
        error: 'page.evaluate: Execution context was destroyed, most likely because of a navigation',
        failureType: 'page-lifecycle' as const,
      };
    }
    return {
      scenarioId: 'C:default',
      componentId: 'C',
      status: 'pass' as const,
    };
  });
  assert.equal(attempts, 2);
  assert.equal(navigationRecovery.status, 'pass');
  assert.equal(navigationRecovery.attempts, 2);
});

test('harness summary fails when any component did not render', () => {
  const summary = summarizeHarnessResults([
    { scenarioId: 'A:default', componentId: 'A', status: 'pass' },
    { scenarioId: 'B:default', componentId: 'B', status: 'fail', error: 'missing export' },
  ]);
  assert.deepEqual(summary, {
    total: 2, passed: 1, failed: 1, recovered: 0, ok: false,
  });
});

test('harness summary passes only when every selected component rendered', () => {
  const summary = summarizeHarnessResults([
    { scenarioId: 'A:default', componentId: 'A', status: 'pass' },
    { scenarioId: 'B:default', componentId: 'B', status: 'pass' },
  ]);
  assert.deepEqual(summary, {
    total: 2, passed: 2, failed: 0, recovered: 0, ok: true,
  });
});

test('harness scope keeps icon coverage and discovery probes separate', () => {
  const icons = selectHarnessScenarios('icons');
  const probes = selectHarnessScenarios('component-probes');
  const states = selectHarnessScenarios('component-states');
  assert.ok(icons.length > 0);
  assert.ok(probes.length > 0);
  assert.ok(states.length > 0);
  assert.ok(icons.every(({ kind }) => kind === 'icon'));
  assert.ok(probes.every(({ kind }) => kind === 'component-probe'));
  assert.ok(states.every(({ kind }) => kind === 'component-state'));
  assert.equal(selectHarnessScenarios('all').length, icons.length + probes.length + states.length);
});

test('specific component selection preserves request order and rejects unknown ids', () => {
  const scenarios = selectHarnessScenarios('component-probes');
  const requested = [scenarios[2].componentId, scenarios[0].componentId];
  assert.deepEqual(
    selectRequestedScenarios(scenarios, requested).map(({ componentId }) => componentId),
    requested,
  );
  assert.throws(
    () => selectRequestedScenarios(scenarios, ['src/components/Unknown.tsx#Unknown']),
    /Unknown harness component ids/,
  );

  const states = selectHarnessScenarios('component-states');
  const loadingSpinnerId = 'src/components/LoadingSpinner.tsx#LoadingSpinner';
  const loadingSpinnerStates = selectRequestedScenarios(states, [loadingSpinnerId]);
  assert.equal(loadingSpinnerStates.length, 312);
  assert.ok(loadingSpinnerStates.every(({ componentId }) => componentId === loadingSpinnerId));
});

test('interaction selection supports targeted evidence reruns and rejects unknown states', () => {
  const scenarios = [
    { id: 'state:A:data=single|interactions=default|variant.theme=light' },
    { id: 'state:A:data=single|interactions=selected|variant.theme=light' },
    { id: 'state:A:data=single|interactions=keyboard-navigation|variant.theme=dark' },
  ];
  assert.deepEqual(
    selectRequestedInteractionScenarios(scenarios, ['keyboard-navigation', 'selected']),
    [scenarios[1], scenarios[2]],
  );
  assert.throws(
    () => selectRequestedInteractionScenarios(scenarios, ['hover']),
    /Unknown harness interaction states: hover/,
  );
});

test('data-state selection supports safe exhaustive report partitions and rejects unknown states', () => {
  const selectRequestedDataStateScenarios = Reflect.get(
    harnessSmokeModule,
    'selectRequestedDataStateScenarios',
  );
  assert.equal(typeof selectRequestedDataStateScenarios, 'function');
  const selectData = selectRequestedDataStateScenarios as (
    scenarios: Array<{ id: string }>,
    requestedDataStates: string[],
  ) => Array<{ id: string }>;
  const scenarios = [
    { id: 'state:A:data=empty|interactions=default|system=idle' },
    { id: 'state:A:data=long-korean|interactions=default|system=idle' },
    { id: 'state:A:data=maximum-supported|interactions=default|system=idle' },
  ];
  assert.deepEqual(selectData(scenarios, ['maximum-supported', 'empty']), [
    scenarios[0],
    scenarios[2],
  ]);
  assert.deepEqual(selectData(scenarios, []), scenarios);
  assert.throws(
    () => selectData(scenarios, ['missing']),
    /Unknown harness data states: missing/,
  );
});

test('module-affine groups keep one module on one worker without losing source order indexes', () => {
  const scenarios = [
    { componentId: 'A1', moduleKey: '../a.tsx' },
    { componentId: 'B1', moduleKey: '../b.tsx' },
    { componentId: 'A2', moduleKey: '../a.tsx' },
  ];
  assert.deepEqual(groupScenariosByModule(scenarios), [
    {
      moduleKey: '../a.tsx',
      entries: [
        { index: 0, scenario: scenarios[0] },
        { index: 2, scenario: scenarios[2] },
      ],
    },
    {
      moduleKey: '../b.tsx',
      entries: [{ index: 1, scenario: scenarios[1] }],
    },
  ]);
});

test('large single-module state sets shard into bounded module-affine worker groups', () => {
  const scenarios = Array.from({ length: 5 }, (_, index) => ({
    componentId: `A${index}`,
    moduleKey: '../a.tsx',
  }));
  assert.deepEqual(groupScenariosByModule(scenarios, 2), [
    {
      moduleKey: '../a.tsx',
      entries: [
        { index: 0, scenario: scenarios[0] },
        { index: 1, scenario: scenarios[1] },
      ],
    },
    {
      moduleKey: '../a.tsx',
      entries: [
        { index: 2, scenario: scenarios[2] },
        { index: 3, scenario: scenarios[3] },
      ],
    },
    {
      moduleKey: '../a.tsx',
      entries: [{ index: 4, scenario: scenarios[4] }],
    },
  ]);
  assert.equal(resolveHarnessGroupSize(undefined), 50);
  assert.equal(resolveHarnessGroupSize('1'), 1);
  assert.throws(() => resolveHarnessGroupSize('0'), /positive integer/);
  assert.throws(() => resolveHarnessGroupSize('1.5'), /positive integer/);
});

test('reuse mode resets viewport, scroll, storage, capture styles, and switches through the harness API', async () => {
  const events: string[] = [];
  await switchHarnessPageScenario({
    setViewportSize: async ({ width, height }) => { events.push(`viewport:${width}x${height}`); },
    evaluate: async (fn: unknown, selectionId: string) => {
      assert.match(String(fn), /window\.scrollTo\(0,\s*0\)/);
      events.push(`reset-and-render:${selectionId}`);
      return true;
    },
  }, 'state:PowerUpInventory:next');
  assert.deepEqual(events, [
    'viewport:320x844',
    'reset-and-render:state:PowerUpInventory:next',
  ]);
  assert.equal(resolveHarnessPageMode(undefined), 'reuse');
  assert.equal(resolveHarnessPageMode('fresh'), 'fresh');
  assert.throws(() => resolveHarnessPageMode('shared'), /fresh or reuse/);
});

test('probe failures are grouped into actionable adapter categories', () => {
  assert.equal(classifyHarnessFailure('component produced no rendered node'), 'empty-render');
  assert.equal(classifyHarnessFailure("Cannot read properties of undefined (reading 'length')"), 'missing-props');
  assert.equal(classifyHarnessFailure('useThing must be used within a ThingProvider'), 'missing-provider');
  assert.equal(classifyHarnessFailure('Element type is invalid: got object'), 'non-component-runtime');
  assert.equal(classifyHarnessFailure('page.waitForFunction: Timeout 15000ms exceeded.'), 'harness-timeout');
  assert.equal(
    classifyHarnessFailure('locator.scrollIntoViewIfNeeded: Timeout 29997.954ms exceeded.'),
    'harness-timeout',
  );
  assert.equal(classifyHarnessFailure('page.screenshot: capture failed'), 'screenshot-capture');
  assert.equal(
    classifyHarnessFailure('page.evaluate: Execution context was destroyed, most likely because of a navigation'),
    'page-lifecycle',
  );
  assert.equal(
    classifyHarnessFailure('page.goto: net::ERR_HTTP_RESPONSE_CODE_FAILURE at http://127.0.0.1:5182/visual-qa-harness.html'),
    'page-lifecycle',
  );
  assert.equal(
    classifyHarnessFailure("page.evaluate: SecurityError: Failed to read the 'localStorage' property from 'Window': Access is denied for this document."),
    'page-lifecycle',
  );
  assert.equal(classifyHarnessFailure('unexpected render exception'), 'render-error');
});

test('reuse workers discard a page after final retryable infrastructure failure', () => {
  const lifecycleFailure = {
    componentId: 'A',
    failureType: 'page-lifecycle' as const,
    scenarioId: 'A:default',
    status: 'fail' as const,
  };
  assert.equal(shouldResetHarnessPageAfterResult('reuse', lifecycleFailure), true);
  assert.equal(shouldResetHarnessPageAfterResult('fresh', lifecycleFailure), false);
  assert.equal(shouldResetHarnessPageAfterResult('reuse', {
    ...lifecycleFailure,
    failureType: 'render-error' as const,
  }), false);
  assert.equal(shouldResetHarnessPageAfterResult('reuse', {
    componentId: 'A',
    scenarioId: 'A:default',
    status: 'pass' as const,
  }), false);
});

test('reuse workers discard their page at every non-empty scenario group boundary', () => {
  assert.equal(shouldResetHarnessPageAfterGroup('reuse', 50), true);
  assert.equal(shouldResetHarnessPageAfterGroup('reuse', 1), true);
  assert.equal(shouldResetHarnessPageAfterGroup('reuse', 0), false);
  assert.equal(shouldResetHarnessPageAfterGroup('fresh', 50), false);
});

test('the browser probe timeout has a conservative validated default', () => {
  assert.equal(resolveHarnessTimeoutMs(undefined), 60_000);
  assert.equal(resolveHarnessTimeoutMs('30000'), 30_000);
  assert.throws(() => resolveHarnessTimeoutMs('0'), /positive integer/);
  assert.throws(() => resolveHarnessTimeoutMs('abc'), /positive integer/);
});

test('the browser engine defaults to system Chrome and can require bundled Chromium', () => {
  assert.equal(resolveHarnessBrowserEngine(undefined), 'chrome');
  assert.equal(resolveHarnessBrowserEngine('chrome'), 'chrome');
  assert.equal(resolveHarnessBrowserEngine('chromium'), 'chromium');
  assert.throws(
    () => resolveHarnessBrowserEngine('webkit'),
    /VISUAL_QA_HARNESS_BROWSER must be either chrome or chromium/,
  );
});

test('component screenshot names are deterministic, bounded, and collision resistant', () => {
  const first = componentScreenshotFileName(
    'src/components/prediction/PredictionShellIcons.tsx#PredictionBaseballIcon',
  );
  const repeated = componentScreenshotFileName(
    'src/components/prediction/PredictionShellIcons.tsx#PredictionBaseballIcon',
  );
  const other = componentScreenshotFileName(
    'src/components/prediction/PredictionShellIcons.tsx#PredictionBaseballIconFilled',
  );
  assert.equal(first, repeated);
  assert.notEqual(first, other);
  assert.match(first, /^[a-z0-9-]+-[a-f0-9]{12}\.png$/);
  assert.ok(Buffer.byteLength(first) <= 120);
});

test('screenshot clips require an attached positive-size harness surface', () => {
  assert.deepEqual(
    resolveScreenshotClip({ x: 24, y: 96, width: 272, height: 192 }),
    { x: 24, y: 96, width: 272, height: 192 },
  );
  assert.throws(() => resolveScreenshotClip(null), /surface is not measurable/);
  assert.throws(
    () => resolveScreenshotClip({ x: 0, y: 0, width: 0, height: 192 }),
    /surface is not measurable/,
  );
});

test('visual capture waits for lazy network work, fonts, and post-layout frames', async () => {
  const events: string[] = [];
  await settleHarnessPage({
    evaluate: async () => {
      events.push('evaluate');
    },
  }, async () => {
    events.push('asset-quiet');
  });
  assert.deepEqual(events, ['evaluate', 'asset-quiet', 'evaluate', 'evaluate']);
});

test('asset settling ignores API polling and waits for same-origin harness assets', () => {
  const origin = 'http://127.0.0.1:5182';
  assert.equal(isHarnessAssetRequest(`${origin}/src/components/Example.tsx`, origin), true);
  assert.equal(isHarnessAssetRequest(`${origin}/api/notifications`, origin), false);
  assert.equal(isHarnessAssetRequest('https://cdn.example.com/font.woff2', origin), false);
  assert.equal(hasHarnessAssetActivitySettled({
    pendingCount: 0,
    lastActivityAt: 1_000,
    now: 1_750,
    quietMs: 750,
  }), true);
  assert.equal(hasHarnessAssetActivitySettled({
    pendingCount: 1,
    lastActivityAt: 1_000,
    now: 2_000,
    quietMs: 750,
  }), false);
});

test('isolated scenario work keeps result order and obeys the concurrency cap', async () => {
  let active = 0;
  let peak = 0;
  const results = await mapWithConcurrency([30, 5, 10, 1], 2, async (delay, index) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, delay));
    active -= 1;
    return `${index}:${delay}`;
  });
  assert.deepEqual(results, ['0:30', '1:5', '2:10', '3:1']);
  assert.equal(peak, 2);
});

test('worker resources are bounded, reused sequentially, and always closed', async () => {
  let created = 0;
  let closed = 0;
  const activeByWorker = new Map<number, number>();
  const results = await mapWithWorkerResource(
    [20, 5, 10, 1],
    2,
    async () => ({ workerId: created++ }),
    async () => { closed += 1; },
    async (delay, index, resource) => {
      const active = (activeByWorker.get(resource.workerId) ?? 0) + 1;
      activeByWorker.set(resource.workerId, active);
      assert.equal(active, 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
      activeByWorker.set(resource.workerId, active - 1);
      return `${index}:${resource.workerId}`;
    },
  );
  assert.equal(results.length, 4);
  assert.equal(created, 2);
  assert.equal(closed, 2);
  assert.deepEqual([...activeByWorker.values()], [0, 0]);
});

test('scenario interaction execution records verified evidence and preserves cleanup', async () => {
  const applyScenarioInteraction = (harnessSmokeModule as unknown as {
    applyScenarioInteraction?: (
      page: unknown,
      scenario: {
        kind: string;
        interactionPlan?: { action: string; selector: string };
      },
      execute: (
        page: unknown,
        plan: { action: string; selector: string },
      ) => Promise<() => Promise<void>>,
    ) => Promise<{
      evidence?: { action: string; selector: string; verified: boolean };
      cleanup: () => Promise<void>;
    }>;
  }).applyScenarioInteraction;
  assert.equal(typeof applyScenarioInteraction, 'function');
  if (!applyScenarioInteraction) return;

  const events: string[] = [];
  const cleanup = async () => { events.push('cleanup'); };
  const result = await applyScenarioInteraction(
    {},
    {
      kind: 'component-state',
      interactionPlan: { action: 'pressed', selector: 'button' },
    },
    async (_page, plan) => {
      events.push(`execute:${plan.action}:${plan.selector}`);
      return cleanup;
    },
  );

  assert.deepEqual(result.evidence, {
    action: 'pressed',
    selector: 'button',
    verified: true,
  });
  assert.deepEqual(events, ['execute:pressed:button']);
  await result.cleanup();
  assert.deepEqual(events, ['execute:pressed:button', 'cleanup']);
});
