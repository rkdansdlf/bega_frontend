import {
  Component,
  createElement,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { ThemeProvider } from '../hooks/useTheme';
import { ConfirmDialogProvider } from '../components/contexts/ConfirmDialogContext';
import { cn } from '../lib/utils';
import { installHarnessBrowserState } from './harnessBrowserState';
import { resolveHarnessScenario } from './harnessCatalog';
import { renderInSemanticHost } from './semanticHost';
import {
  resolveComponentStateAdapter,
  type ComponentStateAdapterResult,
} from './stateAdapters';

type HarnessStatus = {
  state: 'loading' | 'ready' | 'error';
  componentId: string | null;
  scenarioId?: string;
  message?: string;
};

declare global {
  interface Window {
    __BEGA_VISUAL_QA_HARNESS__?: HarnessStatus;
    __BEGA_VISUAL_QA_RENDER_COMPONENT__?: (componentId: string) => void;
  }
}

const componentModules = import.meta.glob<Record<string, unknown>>([
  '../components/**/*.tsx',
  '../pages/**/*.tsx',
  '!../components/**/*.test.tsx',
  '!../components/**/*.spec.tsx',
  '!../components/**/*.story.tsx',
  '!../components/**/*.stories.tsx',
  '!../components/**/__tests__/**/*.tsx',
  '!../pages/**/*.test.tsx',
  '!../pages/**/*.spec.tsx',
  '!../pages/**/*.story.tsx',
  '!../pages/**/*.stories.tsx',
  '!../pages/**/__tests__/**/*.tsx',
]);
const componentStyleModules = {
  ...import.meta.glob<unknown>('../components/**/*.css'),
  ...import.meta.glob<unknown>('../pages/**/*.css'),
};
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    mutations: { retry: false },
  },
});

const publishStatus = (status: HarnessStatus) => {
  window.__BEGA_VISUAL_QA_HARNESS__ = status;
  document.documentElement.dataset.vqaHarnessState = status.state;
};

class HarnessErrorBoundary extends Component<
  { children: ReactNode; componentId: string; scenarioId: string },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    publishStatus({
      state: 'error',
      componentId: this.props.componentId,
      scenarioId: this.props.scenarioId,
      message: error.message,
    });
  }

  render() {
    if (this.state.error) {
      return <HarnessMessage tone="error">{this.state.error.message}</HarnessMessage>;
    }
    return this.props.children;
  }
}

function HarnessMessage({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'error' }) {
  return (
    <div
      className={`max-w-xl rounded-xl border px-4 py-3 text-sm ${
        tone === 'error'
          ? 'border-red-300 bg-red-50 text-red-800'
          : 'border-slate-200 bg-white text-slate-700'
      }`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}

function HarnessRouterLocationProbe() {
  const location = useLocation();
  return (
    <span
      aria-hidden="true"
      style={{
        height: 1,
        left: 0,
        opacity: 0,
        pointerEvents: 'none',
        position: 'fixed',
        top: 0,
        width: 1,
      }}
      data-vqa-router-hash={location.hash}
      data-vqa-router-pathname={location.pathname}
      data-vqa-router-search={location.search}
    />
  );
}

const scenarioFromLocation = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const selectionId = searchParams.get('scenario') ?? searchParams.get('component') ?? '';
  return { selectionId, scenario: resolveHarnessScenario(selectionId) };
};

export default function VisualQaHarnessApp() {
  const [{ selectionId, scenario }, setSelection] = useState(scenarioFromLocation);
  const [LoadedComponent, setLoadedComponent] = useState<ComponentType<Record<string, unknown>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.__BEGA_VISUAL_QA_RENDER_COMPONENT__ = (nextSelectionId: string) => {
      const nextScenario = resolveHarnessScenario(nextSelectionId);
      const queryName = nextScenario?.kind === 'component-state' ? 'scenario' : 'component';
      window.history.replaceState(null, '', `?${queryName}=${encodeURIComponent(nextSelectionId)}`);
      queryClient.clear();
      setLoadedComponent(null);
      setError(null);
      setSelection({ selectionId: nextSelectionId, scenario: nextScenario });
    };
    return () => {
      delete window.__BEGA_VISUAL_QA_RENDER_COMPONENT__;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!scenario) {
      const message = selectionId
        ? `등록되지 않았거나 직접 렌더할 수 없는 시나리오입니다: ${selectionId}`
        : 'component 쿼리 파라미터가 필요합니다.';
      setError(message);
      publishStatus({ state: 'error', componentId: null, message });
      return () => { cancelled = true; };
    }

    publishStatus({ state: 'loading', componentId: scenario.componentId, scenarioId: scenario.id });
    const loadModule = componentModules[scenario.moduleKey];
    if (!loadModule) {
      const message = `모듈을 찾을 수 없습니다: ${scenario.moduleKey}`;
      setError(message);
      publishStatus({ state: 'error', componentId: scenario.componentId, scenarioId: scenario.id, message });
      return () => { cancelled = true; };
    }

    const styleModuleKeys = scenario.kind === 'component-state' ? scenario.styleModuleKeys : [];
    const missingStyleModuleKey = styleModuleKeys.find((moduleKey) => !componentStyleModules[moduleKey]);
    if (missingStyleModuleKey) {
      const message = `스타일 모듈을 찾을 수 없습니다: ${missingStyleModuleKey}`;
      setError(message);
      publishStatus({ state: 'error', componentId: scenario.componentId, scenarioId: scenario.id, message });
      return () => { cancelled = true; };
    }

    void Promise.all([
      loadModule(),
      ...styleModuleKeys.map((moduleKey) => componentStyleModules[moduleKey]()),
    ])
      .then(([module]) => {
        if (cancelled) return;
        const candidate = module[scenario.exportName];
        if (typeof candidate !== 'function' && (typeof candidate !== 'object' || candidate === null)) {
          throw new Error(`React export를 찾을 수 없습니다: ${scenario.exportName}`);
        }
        setLoadedComponent(() => candidate as ComponentType<Record<string, unknown>>);
        publishStatus({ state: 'ready', componentId: scenario.componentId, scenarioId: scenario.id });
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        const message = reason instanceof Error ? reason.message : String(reason);
        setError(message);
        publishStatus({ state: 'error', componentId: scenario.componentId, scenarioId: scenario.id, message });
      });

    return () => { cancelled = true; };
  }, [scenario, selectionId]);

  const renderResult = useMemo<ComponentStateAdapterResult>(() => {
    if (scenario?.kind === 'icon') {
      return {
        props: {
          size: 64,
          width: 64,
          height: 64,
          'aria-label': scenario.componentId,
          'data-vqa-component-id': scenario.componentId,
        },
      };
    }
    if (scenario?.kind === 'component-state') {
      return resolveComponentStateAdapter(scenario.adapterId, {
        componentId: scenario.componentId,
        interactionTargetId: scenario.interactionPlan?.targetId,
        states: scenario.states,
        variants: scenario.variants,
      });
    }
    return { props: {} };
  }, [scenario]);

  installHarnessBrowserState(scenario);

  return (
    <main className="min-h-dvh bg-slate-100 p-6 text-slate-950">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">BEGA Visual QA Harness</p>
        <h1 className="mt-2 break-all text-lg font-bold">{scenario?.componentId ?? (selectionId || 'No component selected')}</h1>
      </header>

      {error && <HarnessMessage tone="error">{error}</HarnessMessage>}
      {!error && !LoadedComponent && <HarnessMessage>컴포넌트를 불러오는 중입니다.</HarnessMessage>}
      {!error && LoadedComponent && scenario && (
        <HarnessErrorBoundary
          key={scenario.id}
          componentId={scenario.componentId}
          scenarioId={scenario.id}
        >
          <HelmetProvider>
            <ThemeProvider
              key={scenario.id}
              defaultTheme={renderResult.theme ?? 'system'}
            >
              <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={[renderResult.initialPathname ?? '/__visual-qa__']}>
                  <ConfirmDialogProvider>
                    <section
                      className={cn(
                        'flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm',
                        renderResult.surfaceClassName,
                      )}
                      data-vqa-capture-selector={renderResult.captureSelector}
                      data-vqa-expected-hash={renderResult.expectedHash}
                      data-vqa-expected-pathname={renderResult.expectedPathname}
                      data-vqa-expected-search={renderResult.expectedSearch}
                      data-vqa-harness-surface
                      data-vqa-rendered-component-id={scenario.componentId}
                      data-vqa-rendered-scenario-id={scenario.id}
                    >
                      <HarnessRouterLocationProbe />
                      {renderInSemanticHost(
                        createElement(LoadedComponent, renderResult.props),
                        renderResult.semanticHost,
                      )}
                      {renderResult.companion}
                    </section>
                  </ConfirmDialogProvider>
                </MemoryRouter>
              </QueryClientProvider>
            </ThemeProvider>
          </HelmetProvider>
        </HarnessErrorBoundary>
      )}
    </main>
  );
}
