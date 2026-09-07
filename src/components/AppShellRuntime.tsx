import { lazy, Suspense, type ReactNode } from 'react';

import ScrollToTop from './ScrollToTop';
import AuthBootstrapGate from './AuthBootstrapGate';
import SeoHead from '../seo/SeoHead';
import AppRoutes from './AppRoutes';

const AuthSessionBoundary = lazy(() => import('./AuthSessionBoundary'));

const appRoutesFallback = (
  <main className="min-h-screen bg-background text-foreground">
    <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
      <div
        className="min-w-0 max-w-full break-words rounded-2xl border border-border bg-card px-6 py-5 text-center text-base text-muted-foreground shadow-sm"
      >
        페이지를 준비하고 있습니다.
      </div>
    </div>
  </main>
);

type AppShellRuntimeProps = {
  phaseOverride?: 'fallback' | 'resolved';
  runtimeOverride?: ReactNode;
};

export default function AppShellRuntime(props: AppShellRuntimeProps = {}) {
  if (import.meta.env.DEV) {
    const { phaseOverride, runtimeOverride } = props;

    if (phaseOverride === 'fallback') {
      return appRoutesFallback;
    }

    if (phaseOverride === 'resolved') {
      return runtimeOverride ?? null;
    }
  }

  return (
    <Suspense fallback={appRoutesFallback}>
      <AuthSessionBoundary>
        <ScrollToTop />
        <AuthBootstrapGate />
        <SeoHead />
        <AppRoutes />
      </AuthSessionBoundary>
    </Suspense>
  );
}
