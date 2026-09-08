import { createElement, lazy, Suspense, useEffect, useMemo, type ComponentType } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthBootstrapUiState } from '../hooks/useAuthBootstrapUiState';
import { requestLoadTrace } from '../utils/requestLoadTrace';
import LoadingSpinner from './LoadingSpinner';

const Landing = lazy(() => import('./Landing'));

type LandingLoader = () => Promise<{ default: ComponentType<Record<string, never>> }>;

export interface RootEntryRouteAuthStateOverride {
  isAuthBootstrapPending: boolean;
  isAuthLoading: boolean;
  isLoggedIn: boolean;
}

export interface RootEntryRouteAuthAwareProps {
  authStateOverride?: RootEntryRouteAuthStateOverride;
  landingLoader?: LandingLoader;
  spinnerMinDurationMs?: number;
}

export default function RootEntryRouteAuthAware({
  authStateOverride,
  landingLoader,
  spinnerMinDurationMs,
}: RootEntryRouteAuthAwareProps = {}) {
  const storeAuthState = useAuthBootstrapUiState();
  const { isAuthBootstrapPending, isAuthLoading, isLoggedIn } = authStateOverride ?? storeAuthState;
  const shouldShowAuthLoading = isAuthLoading || isAuthBootstrapPending;
  const landingComponent = useMemo(
    () => (landingLoader ? lazy(landingLoader) : Landing),
    [landingLoader],
  );

  useEffect(() => {
    if (shouldShowAuthLoading) {
      requestLoadTrace(isAuthBootstrapPending ? 'RootEntryRoute:authBootstrapPending' : 'RootEntryRoute:authLoading');
      return;
    }

    if (isLoggedIn) {
      requestLoadTrace('RootEntryRoute:redirectHome');
      return;
    }

    requestLoadTrace('RootEntryRoute:landing');
  }, [isAuthBootstrapPending, isAuthLoading, isLoggedIn, shouldShowAuthLoading]);

  if (shouldShowAuthLoading) {
    return (
      <div className="w-full" data-testid="root-entry-auth-loading">
        <LoadingSpinner
          variant="app"
          message="첫 화면을 준비하고 있습니다."
          subMessage={isAuthBootstrapPending ? '로그인 상태를 복구하는 중입니다.' : '사용자 상태를 확인하는 중입니다.'}
          minDurationMs={spinnerMinDurationMs ?? 120}
        />
      </div>
    );
  }

  if (isLoggedIn) {
    return <Navigate to="/home" replace />;
  }

  return (
    <Suspense
      fallback={
        <div className="w-full" data-testid="root-entry-landing-loading">
          <LoadingSpinner
            variant="app"
            message="첫 화면을 준비하고 있습니다."
            subMessage="랜딩 페이지를 불러오는 중입니다."
            minDurationMs={spinnerMinDurationMs ?? 80}
          />
        </div>
      }
    >
      {createElement(landingComponent)}
    </Suspense>
  );
}
