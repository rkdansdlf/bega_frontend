import { createElement, lazy, Suspense, useEffect, useMemo, type ComponentType } from 'react';

import {
  getPersistedAuthBootstrapMeta,
  hasPersistedAuthBootstrapHint,
  shouldAttemptRootAuthBootstrap,
} from '../utils/authBootstrap';
import { requestLoadTrace } from '../utils/requestLoadTrace';
import type {
  RootEntryRouteAuthAwareProps,
  RootEntryRouteAuthStateOverride,
} from './RootEntryRouteAuthAware';

const Landing = lazy(() => import('./Landing'));
const RootEntryRouteAuthAware = lazy(() => import('./RootEntryRouteAuthAware'));

const landingFallback = (
  <main
    className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center text-foreground"
    data-testid="root-entry-route-loading-fallback"
    role="status"
  >
    <div
      className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary motion-reduce:animate-none"
      aria-hidden="true"
    />
    <p className="font-semibold">첫 화면을 준비하고 있습니다.</p>
  </main>
);

type LazyComponentLoader<Props = Record<string, never>> = () => Promise<{
  default: ComponentType<Props>;
}>;

interface RootEntryRouteProps {
  authAwareRouteLoader?: LazyComponentLoader<RootEntryRouteAuthAwareProps>;
  authAwareStateOverride?: RootEntryRouteAuthStateOverride;
  landingLoader?: LazyComponentLoader;
  shouldUseAuthAwareRouteOverride?: boolean;
  spinnerMinDurationMs?: number;
}

export default function RootEntryRoute({
  authAwareRouteLoader,
  authAwareStateOverride,
  landingLoader,
  shouldUseAuthAwareRouteOverride,
  spinnerMinDurationMs,
}: RootEntryRouteProps = {}) {
  const shouldUseAuthAwareRoute = shouldUseAuthAwareRouteOverride ?? shouldAttemptRootAuthBootstrap({
    hasPersistedAuthHint: hasPersistedAuthBootstrapHint(),
    authBootstrapMeta: getPersistedAuthBootstrapMeta(),
  });
  const landingComponent = useMemo(
    () => (landingLoader ? lazy(landingLoader) : Landing),
    [landingLoader],
  );
  const authAwareRouteComponent = useMemo(
    () => (authAwareRouteLoader ? lazy(authAwareRouteLoader) : RootEntryRouteAuthAware),
    [authAwareRouteLoader],
  );

  useEffect(() => {
    if (!shouldUseAuthAwareRoute) {
      requestLoadTrace('RootEntryRoute:anonymousLanding');
    }
  }, [shouldUseAuthAwareRoute]);

  if (shouldUseAuthAwareRoute) {
    return (
      <Suspense fallback={landingFallback}>
        {createElement(authAwareRouteComponent, {
          authStateOverride: authAwareStateOverride,
          spinnerMinDurationMs,
        })}
      </Suspense>
    );
  }

  return (
    <Suspense fallback={landingFallback}>
      {createElement(landingComponent)}
    </Suspense>
  );
}
