type HarnessScenarioBrowserState = {
  kind: string;
  adapterId?: string;
  variants?: Record<string, string>;
};

export type ViewportDeferredIntersectionMode = 'intersecting' | 'non-intersecting';

export const resolveViewportDeferredIntersectionMode = (
  scenario: HarnessScenarioBrowserState | null | undefined,
): ViewportDeferredIntersectionMode | null => {
  if (scenario?.kind !== 'component-state' || scenario.adapterId !== 'viewport-deferred') {
    return null;
  }
  const phase = scenario.variants?.phase;
  if (phase === 'fallback') return 'non-intersecting';
  if (phase === 'content') return 'intersecting';
  throw new Error(`unsupported ViewportDeferred phase: ${phase ?? '<missing>'}`);
};

let originalIntersectionObserver: typeof IntersectionObserver | undefined;
let originalCaptured = false;
let installedMode: ViewportDeferredIntersectionMode | null = null;

export const installHarnessBrowserState = (
  scenario: HarnessScenarioBrowserState | null | undefined,
) => {
  if (!originalCaptured) {
    originalIntersectionObserver = window.IntersectionObserver;
    originalCaptured = true;
  }

  const mode = resolveViewportDeferredIntersectionMode(scenario);
  if (mode === null) {
    if (installedMode !== null) {
      Object.defineProperty(window, 'IntersectionObserver', {
        configurable: true,
        writable: true,
        value: originalIntersectionObserver,
      });
      installedMode = null;
    }
    return;
  }
  if (installedMode === mode) return;

  class HarnessIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin: string;
    readonly thresholds: readonly number[];
    private readonly callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
      this.callback = callback;
      this.rootMargin = options.rootMargin ?? '0px';
      this.thresholds = Array.isArray(options.threshold)
        ? [...options.threshold]
        : [options.threshold ?? 0];
    }

    disconnect() {}

    observe(target: Element) {
      queueMicrotask(() => {
        const rect = target.getBoundingClientRect();
        const isIntersecting = mode === 'intersecting';
        this.callback([{
          boundingClientRect: rect,
          intersectionRatio: isIntersecting ? 1 : 0,
          intersectionRect: isIntersecting ? rect : rect,
          isIntersecting,
          rootBounds: null,
          target,
          time: window.performance.now(),
        }], this);
      });
    }

    takeRecords() {
      return [];
    }

    unobserve(_target: Element) {}
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: HarnessIntersectionObserver,
  });
  installedMode = mode;
};
