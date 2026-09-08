import { lazy, Suspense, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import ScrollToTop from './ScrollToTop';
import AuthBootstrapGate from './AuthBootstrapGate';
import SeoHead from '../seo/SeoHead';
import AppRoutes from './AppRoutes';
import {
  getPersistedAuthBootstrapMeta,
  hasPersistedAuthBootstrapHint,
  shouldMountAuthBootstrapRuntime,
} from '../utils/authBootstrap';

const AuthSessionBoundary = lazy(() => import('./AuthSessionBoundary'));

const hasInjectedAuthProfileForTests = (): boolean => (
  typeof window !== 'undefined'
  && Boolean((window as Window & { __BEGA_TEST_AUTH_PROFILE__?: unknown }).__BEGA_TEST_AUTH_PROFILE__)
);

// AuthSessionBoundary only reacts to auth-related API events (session expiry,
// 401s) and needs authStore/zustand to do it. On routes where AuthBootstrapGate
// itself decides not to run an auth check (anonymous landing, public home
// paths with no persisted session hint), no such API call happens either, so
// there is nothing for this boundary to catch — mounting it there only costs
// real anonymous visitors an extra chunk fetch. Reuse the exact same gate.
const shouldMountAuthSessionBoundary = (pathname: string): boolean => shouldMountAuthBootstrapRuntime(pathname, {
  isLoggedIn: false,
  hasPersistedAuthHint: hasPersistedAuthBootstrapHint(),
  authBootstrapMeta: getPersistedAuthBootstrapMeta(),
  hasInjectedAuthProfile: hasInjectedAuthProfileForTests(),
});

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
  const { pathname } = useLocation();

  if (import.meta.env.DEV) {
    const { phaseOverride, runtimeOverride } = props;

    if (phaseOverride === 'fallback') {
      return appRoutesFallback;
    }

    if (phaseOverride === 'resolved') {
      return runtimeOverride ?? null;
    }
  }

  const appRoutesTree = (
    <>
      <ScrollToTop />
      <AuthBootstrapGate />
      <SeoHead />
      <AppRoutes />
    </>
  );

  return (
    <Suspense fallback={appRoutesFallback}>
      {shouldMountAuthSessionBoundary(pathname) ? (
        <AuthSessionBoundary>
          {appRoutesTree}
        </AuthSessionBoundary>
      ) : appRoutesTree}
    </Suspense>
  );
}
